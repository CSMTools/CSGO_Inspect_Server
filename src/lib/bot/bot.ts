// Parts of this code were taken and reworked from https://github.com/csgofloat/inspect/tree/master
/*The MIT License (MIT)

Copyright (c) 2016 Stepan Fedorko-Bartos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/


import SteamUser from 'steam-user'
import GlobalOffensive, { ItemInfo } from 'globaloffensive'
import SteamTotp from 'steam-totp'
import { EventEmitter } from 'events'

import { log, getBotTag, observeProperty } from "../util.js"

import login_errors from "../enum/BOT_LOGIN_ERRORS.js"

import type { LoginData, ItemData, InspectRequest, BotSettings, RefreshLoginData } from "../types/BotTypes.js"
import Session from './session.js'

const steamUserConfig = {
  enablePicsCache: true
};

export default class Bot extends EventEmitter {
  #loggedIn = false;
  #relogin = false;
  #steamClient: SteamUser = new SteamUser(steamUserConfig);
  #csgoClient: GlobalOffensive = new GlobalOffensive(this.#steamClient);
  #session = new Session;
  #loginData: RefreshLoginData = {
    refreshToken: '',
  };
  #initialLoginData: LoginData = {
    accountName: '',
    password: '',
    authCode: '',
  }
  #resolve: ((value: ItemData) => void) | false = false;
  #currentRequest: InspectRequest | false = false;
  ttlTimeout: NodeJS.Timeout | boolean = false;
  settings: BotSettings;
  #busy: boolean = false;
  TAG: string = "unknownBot";
  name?: string;

  constructor(settings: BotSettings) {
    super();

    this.settings = settings;

    this.#bindEvents();

    // Variance to apply so that each bot relogins at different times
    const variance = Math.round(Math.random() * 4 * 60 * 1000);

    // As of 7/10/2020, GC inspect calls can timeout repeatedly for whatever reason
    setInterval(() => {
      if (this.#csgoClient.haveGCSession) {
        this.#relogin = true;
        this.login(this.#initialLoginData.accountName, this.#initialLoginData.password, this.#initialLoginData.authCode);
      }
    }, 30 * 60 * 1000 + variance);
  }

  async login(username: string, password: string, auth: string) {
    this.loggedIn = false;

    this.TAG = getBotTag(username);

    this.#initialLoginData = {
      accountName: username,
      password: password,
      authCode: auth
    }

    if (this.#steamClient && this.#steamClient.steamID) {
      this.#steamClient.logOff();

      // The following is a hacky way to create an await for SteamUser.logOff(), but it works well enough.
      // Basically it looks for the steamID to change, as it changes from a string to null when logoff is successful.
      let next: (value: unknown) => void;

      observeProperty(this.#steamClient, "steamID", (a) => {
        if (next) {
          next(null);
        }
      });

      await new Promise((resolve, reject) => {
        next = resolve;
      })
    }

    this.#loginData = {
      refreshToken: await this.#session.getRefreshToken(username, password, auth)
    };

    log(this.TAG, "Logging in...");

    this.#steamClient.logOn(this.#loginData);

    this.name = this.#session.session?.accountName;

    return;
  }

  #bindEvents() {
    this.#steamClient.on('error', (err) => {
      log(this.TAG, `Error logging in (${err.eresult})`)

      if (err.eresult && login_errors[err.eresult] !== undefined) {
        log(this.TAG, login_errors[err.eresult])
      }
    });

    this.#steamClient.on('disconnected', (eresult, msg) => {
      log(this.TAG, `Logged off, reconnecting! (${eresult}, ${msg})`);
    });

    this.#steamClient.on('loggedOn', (details, parental) => {
      log(this.TAG, `Log on OK`)

      // Fixes reconnecting to CS:GO GC since node-steam-user still assumes we're playing 730
      // and never sends the appLaunched event to node-globaloffensive
      this.#steamClient?.gamesPlayed([], true);

      if (this.#relogin) {
        log(this.TAG, "Initiating GC Connection, Relogin");

        // Don't check ownership cache since the event isn't always emitted on relogin
        return this.#steamClient.gamesPlayed([730], true);
      }

      // Ensure we own CS
      // We have to wait until app ownership is cached to safely check
      this.#steamClient.once('ownershipCached', () => {
        if (!this.#steamClient.ownsApp(730)) {
          log(this.TAG, "Bot doesn't own CS:GO, retrieving free license");

          // Request a license for CS
          this.#steamClient.requestFreeLicense([730], (err, grantedPackages, grantedAppIDs) => {
            log(this.TAG, `Granted Packages ${grantedPackages.toString()}`);
            log(this.TAG, `Granted App IDs ${grantedAppIDs.toString()}`);

            if (err) {
              log(this.TAG, 'Failed to obtain free CS:GO license');
            } else {
              log(this.TAG, 'Initiating GC Connection');
              
              this.#steamClient.gamesPlayed([730], true);
            }
          });
        } else {
          log(this.TAG, 'Initiating GC Connection');

          this.#steamClient.gamesPlayed([730], true);
        }
      });
    });

    this.#csgoClient.on('inspectItemInfo', (itemData_: ItemInfo) => {
      if (this.#resolve && this.#currentRequest) {
        // Ensure the received itemid is the same as what we want
        if (itemData_.itemid !== this.#currentRequest.a) return;

        // Clear any TTL timeout
        if (typeof this.ttlTimeout !== 'boolean') {
          clearTimeout(this.ttlTimeout);
          this.ttlTimeout = false;
        }

        // GC requires a delay between subsequent requests
        // Figure out how long to delay until this bot isn't busy anymore
        let offset = new Date().getTime() - this.#currentRequest.time;
        let delay = this.settings.request_delay - offset;

        // If we're past the request delay, don't delay
        if (delay < 0) delay = 0;

        this.#resolve({
          itemid: itemData_.itemid,
          defindex: itemData_.defindex,
          paintindex: itemData_.paintindex,
          rarity: itemData_.rarity,
          quality: itemData_.quality,
          killeatervalue: itemData_.killeatervalue || 0,
          killeaterscoretype: itemData_.killeaterscoretype,
          paintseed: itemData_.paintseed,
          origin: itemData_.origin,
          customname: itemData_.customname,
          s: this.#currentRequest.s,
          a: this.#currentRequest.a,
          d: this.#currentRequest.d,
          m: this.#currentRequest.m,
          paintwear: itemData_.paintwear,
          stickers: itemData_.stickers,
          fadePercentage: null
        } as ItemData);

        this.#resolve = false;
        this.#currentRequest = false;

        setTimeout(() => {
          // We're no longer busy (satisfied request delay)
          this.busy = false;
        }, delay);
      }
    });

    this.#csgoClient.on('connectedToGC', () => {
      log(this.TAG, 'CSGO Client Ready!');

      this.loggedIn = true;
      this.busy = false;
    });

    this.#csgoClient.on('disconnectedFromGC', (reason) => {
      log(this.TAG, `CSGO unready (${reason}), trying to reconnect!`);
      this.loggedIn = false;
      this.busy = true;

      // node-globaloffensive will automatically try to reconnect
    });

    this.#csgoClient.on('connectionStatus', (status) => {
      log(this.TAG, `GC Connection Status Update ${status}`);
    });

    this.#csgoClient.on('debug', (msg) => {
      log(this.TAG, `CSGO Debug ${msg}`);
    });
  }

  sendInspectRequest(params: InspectRequest): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      if (!this.loggedIn) {
        return reject('The bot assigned this task is not ready.');
      }

      if (this.busy || this.#currentRequest) {
        return reject("The bot assigned this task is busy.");
      }

      this.#resolve = resolve;
      this.busy = true;
      this.#currentRequest = params;

      log(this.TAG, `Fetching for ${this.#currentRequest.a}`);

      // The first param (owner) depends on the type of inspect link
      this.#csgoClient.inspectItem(params.s !== '0' ? params.s : params.m, params.a, params.d);

      // Set a timeout in case the GC takes too long to respond
      this.ttlTimeout = setTimeout(() => {
        // GC didn't respond in time, reset and reject
        this.busy = false;
        this.#currentRequest = false;
        reject('Request took too long to process, please try again later, we (or Valve) may be experiencing high amounts of traffic.');
      }, this.settings.request_ttl);
    });
  }

  set loggedIn(val) {
    const prev = this.loggedIn;
    this.#loggedIn = val;

    if (val !== prev) {
      this.emit('readyStatus', val);
    }
  }

  get loggedIn() {
    return this.#loggedIn;
  }

  set busy(val) {
    const prev = this.busy;
    this.#busy = val;

    if (val !== prev) {
      this.emit('busyStatus', val);
    }
  }

  get busy() {
    return this.#busy;
  }
}
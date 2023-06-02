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
import GlobalOffensive from 'globaloffensive'
import SteamTotp from 'steam-totp'
import { EventEmitter } from 'events'

import { log, linkToInspectRequest, isInspectLinkValid, getBotTag, sleep } from "../util.js"

import login_errors from "../enum/BOT_LOGIN_ERRORS.js"

import type { LoginData, ItemData, InspectRequest, BotSettings } from "../types/BotTypes.js"

export default class Bot extends EventEmitter {
  #loggedIn = false;
  #relogin = false;
  #steamClient: SteamUser = new SteamUser({
    enablePicsCache: true,
    autoRelogin: false
  });
  // @ts-ignore
  #csgoClient: GlobalOffensive = new GlobalOffensive(this.#steamClient);
  #loginData: LoginData = {
    accountName: '',
    password: '',
    rememberPassword: false,
    authCode: '',
    twoFactorCode: ''
  };
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
        this.login(this.#loginData.accountName, this.#loginData.password, this.#loginData.authCode || '');
      }
    }, 30 * 60 * 1000 + variance);
  }

  async login(username: string, password: string, auth: string) {
    this.TAG = getBotTag(username);
    this.loggedIn = false;

    if (this.#steamClient) {
      this.#steamClient.logOff();
      await sleep(1000)
    }

    this.#loginData = {
      accountName: username,
      password: password,
      rememberPassword: true,
    };

    if (auth && auth !== '') {
      // Check if it is a shared_secret
      if (auth.length <= 5) {
        this.#loginData.authCode = auth;
      } else {
        // Generate the code from the shared_secret
        log(this.TAG, "Generating 2FA code from shared_secret")
        this.#loginData.twoFactorCode = SteamTotp.getAuthCode(auth);
      }
    }

    log(this.TAG, "Logging in...");
    this.#steamClient?.logOn(this.#loginData);

    this.#loginData.authCode = auth;
    this.name = this.#loginData.accountName;

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
      log(this.TAG, `Logged off, reconnecting! (${eresult}, ${msg})`)

      this.login(this.#loginData.accountName, this.#loginData.password, this.#loginData.authCode || '');
    });

    this.#steamClient.on('steamGuard', (_, callback) => {
      log(this.TAG, `Steam requested Steam Guard Code`);

      if (!this.#loginData.authCode) {
        return log(this.TAG, `Can't find Steam Guard authentication method.`)
      } else {
        console.log('debug2', this.#loginData.authCode)
      }

      console.time('debugtime');

      this.#loginData.twoFactorCode = SteamTotp.getAuthCode(this.#loginData.authCode);

      console.timeEnd('debugtime');

      console.log('debug3', this.#loginData.twoFactorCode);
      callback(this.#loginData.twoFactorCode);
    });

    this.#steamClient.on('loggedOn', (details, parental) => {
      log(this.TAG, `Log on OK`)

      // Fixes reconnecting to CS:GO GC since node-steam-user still assumes we're playing 730
      // and never sends the appLaunched event to node-globaloffensive
      this.#steamClient?.gamesPlayed([], true);

      if (this.#relogin) {
        // Don't check ownership cache since the event isn't always emitted on relogin
        log(this.TAG, "Initiating GC Connection, Relogin")
        this.#steamClient.gamesPlayed([730], true);
        return;
      }

      // Ensure we own CSGO
      // We have to wait until app ownership is cached to safely check
      this.#steamClient.once('ownershipCached', () => {
        if (!this.#steamClient.ownsApp(730)) {
          log(this.TAG, "Bot doesn't own CS:GO, retrieving free license")

          // Request a license for CS:GO
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

    this.#csgoClient.on('inspectItemInfo', (itemData_) => {
      if (this.#resolve && this.#currentRequest) {
        const itemData: ItemData = {
          delay: 0,
          itemid: itemData_.itemid,
          defindex: itemData_.defindex,
          paintindex: itemData_.paintindex,
          rarity: itemData_.rarity,
          quality: itemData_.quality,
          killeatervalue: itemData_.killeatervalue || 0,
          killeaterscoretype: itemData_.killeaterscoretype,
          paintseed: itemData_.paintseed || 0,
          origin: itemData_.origin,
          customname: itemData_.customname,
          s: '',
          a: '',
          d: '',
          m: '',
          paintwear: itemData_.paintwear,
          stickers: itemData_.stickers
        };

        // Ensure the received itemid is the same as what we want
        if (itemData.itemid !== this.#currentRequest.a) return;

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

        itemData.delay = delay;
        itemData.s = this.#currentRequest.s;
        itemData.a = this.#currentRequest.a;
        itemData.d = this.#currentRequest.d;
        itemData.m = this.#currentRequest.m;

        delete itemData.delay;
        this.#resolve(itemData);
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

  sendFloatRequest(params: InspectRequest): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      if (this.busy || this.#currentRequest) {
        reject("The bot assigned this task is busy.");
      }

      this.#resolve = resolve;
      this.busy = true;
      this.#currentRequest = params

      log(this.TAG, `Fetching for ${this.#currentRequest.a}`);

      if (!this.loggedIn) {
        reject('This bot is not ready');
      } else {
        // The first param (owner) depends on the type of inspect link
        this.#csgoClient.inspectItem(params.s !== '0' ? params.s : params.m, params.a, params.d);
      }

      // Set a timeout in case the GC takes too long to respond
      this.ttlTimeout = setTimeout(() => {
        // GC didn't respond in time, reset and reject
        this.busy = false;
        this.#currentRequest = false;
        reject('ttl exceeded');
      }, this.settings.request_ttl);
    });
  }

  set loggedIn(val) {
    const prev = this.loggedIn;
    this.#loggedIn = val;

    if (val !== prev) {
      this.emit(val ? 'ready' : 'unready');
    }
  }

  get loggedIn() {
    return this.#loggedIn;
  }

  set busy(val) {
    const prev = this.busy;
    this.#busy = val;

    if (val !== prev) {
      this.emit(val ? 'busy' : 'unbusy');
    }
  }

  get busy() {
    return this.#busy;
  }
}
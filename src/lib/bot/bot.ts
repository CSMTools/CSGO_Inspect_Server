import SteamUser from 'steam-user'
import GlobalOffensive from 'globaloffensive'
import SteamTotp from 'steam-totp'
import { EventEmitter } from 'events'

import { log, linkToInspectRequest, isInspectLinkValid, getBotTag } from "../util.js"

import login_errors from "../enum/BOT_LOGIN_ERRORS.js"

import type { LoginData, ItemData, InspectRequest, BotSettings } from "../types/BotTypes.js"

let TAG = '';

export default class Bot extends EventEmitter {
  #loggedIn = false;
  #relogin = false;
  #steamClient: SteamUser = new SteamUser({
    enablePicsCache: true,
    autoRelogin: false
  });
  #csgoClient: GlobalOffensive = new GlobalOffensive(this.#steamClient);
  #loginData: LoginData = {
    accountName: '',
    password: '',
    rememberPassword: false,
    authCode: '',
    twoFactorCode: ''
  };
  #resolve: ((value: ItemData) => void) | boolean = false;
  #currentRequest: InspectRequest | boolean = false;
  ttlTimeout: NodeJS.Timeout | boolean = false;
  settings: BotSettings;
  #busy: boolean = false;

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

  login(username: string, password: string, auth: string) {
    TAG = getBotTag(username);
    this.loggedIn = false;

    if (this.#steamClient) this.#steamClient.logOff();

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
        log(TAG, "Generating 2FA code from shared_secret.")
        this.#loginData.twoFactorCode = SteamTotp.getAuthCode(auth);
      }
    }

    log(TAG, "Logging in...");
    this.#steamClient?.logOn(this.#loginData);

    this.#loginData.authCode = auth;
  }

  #bindEvents() {
    this.#steamClient.on('error', (err) => {
      log(TAG, `Error logging in (${err.eresult})`)

      if (err.eresult && login_errors[err.eresult] !== undefined) {
        log(TAG, login_errors[err.eresult])
      }
    });

    this.#steamClient.on('disconnected', (eresult, msg) => {
      log(TAG, `Logged off, reconnecting! (${eresult}, ${msg})`)

      this.login(this.#loginData.accountName, this.#loginData.password, this.#loginData.authCode || '')
    });

    this.#steamClient.on('steamGuard', (_, callback) => {
      log(TAG, `Steam requested Steam Guard Code.`)
      if (!this.#loginData.authCode) {
        return log(TAG, `Can't find Steam Guard authentication method.`)
      }
      let code = SteamTotp.getAuthCode(this.#loginData.authCode);
      callback(code);
    });

    this.#steamClient.on('loggedOn', (details, parental) => {
      log(TAG, `Log on OK`)

      // Fixes reconnecting to CS:GO GC since node-steam-user still assumes we're playing 730
      // and never sends the appLaunched event to node-globaloffensive
      this.#steamClient?.gamesPlayed([], true);

      if (this.#relogin) {
        // Don't check ownership cache since the event isn't always emitted on relogin
        log(TAG, "Initiating GC Connection, Relogin")
        this.#steamClient.gamesPlayed([730], true);
        return;
      }

      // Ensure we own CSGO
      // We have to wait until app ownership is cached to safely check
      // @ts-ignore
      this.#steamClient.once('appOwnershipCached', () => {
        if (!this.#steamClient.ownsApp(730)) {
          log(TAG, "Bot doesn't own CS:GO, retrieving free license")

          // Request a license for CS:GO
          this.#steamClient.requestFreeLicense([730], (err, grantedPackages, grantedAppIDs) => {
            log(TAG, `Granted Packages ${grantedPackages.toString()}`);
            log(TAG, `Granted App IDs ${grantedAppIDs.toString()}`);

            if (err) {
              log(TAG, 'Failed to obtain free CS:GO license');
            } else {
              log(TAG, 'Initiating GC Connection');
              this.#steamClient.gamesPlayed([730], true);
            }
          });
        } else {
          log(TAG, 'Initiating GC Connection');
          this.#steamClient.gamesPlayed([730], true);
        }
      });
    });

    this.#csgoClient.on('inspectItemInfo', (itemData_) => {
      if (this.#resolve && typeof this.#currentRequest !== 'boolean') {
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

        if (typeof this.#resolve !== 'boolean') {
          delete itemData.delay;
          this.#resolve(itemData);
          this.#resolve = false;
          this.#currentRequest = false;

          setTimeout(() => {
            // We're no longer busy (satisfied request delay)
            this.busy = false;
          }, delay);
        }
      }
    });

    this.#csgoClient.on('connectedToGC', () => {
      log(TAG, 'CSGO Client Ready!');

      this.loggedIn = true;
    });

    this.#csgoClient.on('disconnectedFromGC', (reason) => {
      log(TAG, `CSGO unready (${reason}), trying to reconnect!`);
      this.loggedIn = false;
      this.#busy = false;

      // node-globaloffensive will automatically try to reconnect
    });

    this.#csgoClient.on('connectionStatus', (status) => {
      log(TAG, `GC Connection Status Update ${status}`);

    });

    // @ts-ignore
    this.#csgoClient.on('debug', (msg) => {
      log(TAG, `CSGO Debug ${msg}`);
    });
  }

  sendFloatRequest(params: InspectRequest): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.busy = true;
      this.#currentRequest = params

      log(TAG, `Fetching for ${this.#currentRequest.a}`);

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
    return this.#loggedIn || false;
  }

  set busy(val) {
    const prev = this.busy;
    this.#busy = val;

    if (val !== prev) {
      this.emit(val ? 'busy' : 'unbusy');
    }
  }

  get busy() {
    return this.#busy || false;
  }
}
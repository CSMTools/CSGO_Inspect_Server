import SteamUser from 'steam-user'
import GlobalOffensive from 'globaloffensive'
import SteamTotp from 'steam-totp'
import { EventEmitter } from 'events'

import { log } from "../util.js"

import login_errors from "../enum/BOT_LOGIN_ERRORS.js"

class Bot extends EventEmitter {
  #loggedIn = false;
  #relogin = false;
  #steamClient: SteamUser | null = null;
  #loginData: {
    accountName: string,
    password: string,
    rememberPassword: boolean,
    authCode?: string,
    twoFactorCode?: string
  } = {
      accountName: '',
      password: '',
      rememberPassword: false,
      authCode: '',
      twoFactorCode: ''
    };

  constructor() {
    super();

    this.#steamClient = new SteamUser({
      enablePicsCache: true
    });

    // Variance to apply so that each bot relogins at different times
    const variance = Math.round(Math.random() * 4 * 60 * 1000);

    // As of 7/10/2020, GC inspect calls can timeout repeatedly for whatever reason
    setInterval(() => {
      if (this.csgoClient.haveGCSession) {
        this.#relogin = true;
        this.steamClient.relog();
      }
    }, 30 * 60 * 1000 + variance);
  }

  login(username: string, password: string, auth: string) {
    this.#loggedIn = false;

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
        log(this.#loginData.accountName, "Generating 2FA code from shared_secret.")
        this.#loginData.twoFactorCode = SteamTotp.getAuthCode(auth);
      }
    }

    log(this.#loginData.accountName, "Logging in...")
    this.#steamClient?.logOn(this.#loginData)
  }

  #bindEvents() {
    if (this.#steamClient !== null) {
      this.#steamClient.on('error', (err) => {
        log(this.#loginData.accountName, "Error logging in")

        if (err.eresult && login_errors[err.eresult] !== undefined) {
          log(this.#loginData.accountName, login_errors[err.eresult])
        }
      });

      this.#steamClient.on('disconnected', (eresult, msg) => {
        log(this.#loginData.accountName, `Logged off, reconnecting! (${eresult}, ${msg})`)
      });

      this.#steamClient.on('loggedOn', (details, parental) => {
        log(this.#loginData.accountName, `Log on OK`)

        // Fixes reconnecting to CS:GO GC since node-steam-user still assumes we're playing 730
        // and never sends the appLaunched event to node-globaloffensive
        this.#steamClient?.gamesPlayed([], true);

        if (this.#relogin) {
          // Don't check ownership cache since the event isn't always emitted on relogin
          winston.info(`${this.username} Initiating GC Connection, Relogin`);
          this.steamClient.gamesPlayed([730], true);
          return;
        }

        // Ensure we own CSGO
        // We have to wait until app ownership is cached to safely check
        this.steamClient.once('appOwnershipCached', () => {
          if (!this.steamClient.ownsApp(730)) {
            winston.info(`${this.username} doesn't own CS:GO, retrieving free license`);

            // Request a license for CS:GO
            this.steamClient.requestFreeLicense([730], (err, grantedPackages, grantedAppIDs) => {
              winston.debug(`${this.username} Granted Packages`, grantedPackages);
              winston.debug(`${this.username} Granted App IDs`, grantedAppIDs);

              if (err) {
                winston.error(`${this.username} Failed to obtain free CS:GO license`);
              } else {
                winston.info(`${this.username} Initiating GC Connection`);
                this.steamClient.gamesPlayed([730], true);
              }
            });
          } else {
            winston.info(`${this.username} Initiating GC Connection`);
            this.steamClient.gamesPlayed([730], true);
          }
        });
      });

    }

    this.csgoClient.on('inspectItemInfo', (itemData) => {
      if (this.resolve && this.currentRequest) {
        itemData = { iteminfo: itemData };

        // Ensure the received itemid is the same as what we want
        if (itemData.iteminfo.itemid !== this.currentRequest.a) return;

        // Clear any TTL timeout
        if (this.ttlTimeout) {
          clearTimeout(this.ttlTimeout);
          this.ttlTimeout = false;
        }

        // GC requires a delay between subsequent requests
        // Figure out how long to delay until this bot isn't busy anymore
        let offset = new Date().getTime() - this.currentRequest.time;
        let delay = this.settings.request_delay - offset;

        // If we're past the request delay, don't delay
        if (delay < 0) delay = 0;

        itemData.delay = delay;
        itemData.iteminfo.s = this.currentRequest.s;
        itemData.iteminfo.a = this.currentRequest.a;
        itemData.iteminfo.d = this.currentRequest.d;
        itemData.iteminfo.m = this.currentRequest.m;

        // If the paintseed is 0, the proto returns null, force 0
        itemData.iteminfo.paintseed = itemData.iteminfo.paintseed || 0;

        // paintwear -> floatvalue to match previous API version response
        itemData.iteminfo.floatvalue = itemData.iteminfo.paintwear;
        delete itemData.iteminfo.paintwear;

        // Backwards compatibility with previous node-globaloffensive versions
        for (const sticker of itemData.iteminfo.stickers) {
          sticker.stickerId = sticker.sticker_id;
          delete sticker.sticker_id;
        }

        this.resolve(itemData);
        this.resolve = false;
        this.currentRequest = false;

        setTimeout(() => {
          // We're no longer busy (satisfied request delay)
          this.busy = false;
        }, delay);
      }
    });

    this.csgoClient.on('connectedToGC', () => {
      winston.info(`${this.username} CSGO Client Ready!`);

      this.ready = true;
    });

    this.csgoClient.on('disconnectedFromGC', (reason) => {
      winston.warn(`${this.username} CSGO unready (${reason}), trying to reconnect!`);
      this.ready = false;

      // node-globaloffensive will automatically try to reconnect
    });

    this.csgoClient.on('connectionStatus', (status) => {
      winston.debug(`${this.username} GC Connection Status Update ${status}`);
    });

    this.csgoClient.on('debug', (msg) => {
      winston.debug(msg);
    });
  }

  get loggedIn() {
    return this.#loggedIn;
  }
}
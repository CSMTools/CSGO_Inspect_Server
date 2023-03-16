var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Bot_instances, _Bot_loggedIn, _Bot_relogin, _Bot_steamClient, _Bot_csgoClient, _Bot_loginData, _Bot_resolve, _Bot_currentRequest, _Bot_bindEvents;
import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
import SteamTotp from 'steam-totp';
import { EventEmitter } from 'events';
import { log, linkToInspectRequest, isInspectLinkValid } from "../util.js";
import login_errors from "../enum/BOT_LOGIN_ERRORS.js";
export default class Bot extends EventEmitter {
    constructor(settings) {
        super();
        _Bot_instances.add(this);
        _Bot_loggedIn.set(this, false);
        _Bot_relogin.set(this, false);
        _Bot_steamClient.set(this, new SteamUser({
            enablePicsCache: true
        }));
        _Bot_csgoClient.set(this, new GlobalOffensive(__classPrivateFieldGet(this, _Bot_steamClient, "f")));
        _Bot_loginData.set(this, {
            accountName: '',
            password: '',
            rememberPassword: false,
            authCode: '',
            twoFactorCode: ''
        });
        _Bot_resolve.set(this, false);
        _Bot_currentRequest.set(this, false);
        this.ttlTimeout = false;
        this.busy = false;
        this.settings = settings;
        __classPrivateFieldGet(this, _Bot_instances, "m", _Bot_bindEvents).call(this);
        // Variance to apply so that each bot relogins at different times
        const variance = Math.round(Math.random() * 4 * 60 * 1000);
        // As of 7/10/2020, GC inspect calls can timeout repeatedly for whatever reason
        setInterval(() => {
            if (__classPrivateFieldGet(this, _Bot_csgoClient, "f").haveGCSession) {
                __classPrivateFieldSet(this, _Bot_relogin, true, "f");
                __classPrivateFieldGet(this, _Bot_steamClient, "f").relog();
            }
        }, 30 * 60 * 1000 + variance);
    }
    login(username, password, auth) {
        __classPrivateFieldSet(this, _Bot_loggedIn, false, "f");
        if (__classPrivateFieldGet(this, _Bot_steamClient, "f"))
            __classPrivateFieldGet(this, _Bot_steamClient, "f").logOff();
        __classPrivateFieldSet(this, _Bot_loginData, {
            accountName: username,
            password: password,
            rememberPassword: true,
        }, "f");
        if (auth && auth !== '') {
            // Check if it is a shared_secret
            if (auth.length <= 5) {
                __classPrivateFieldGet(this, _Bot_loginData, "f").authCode = auth;
            }
            else {
                // Generate the code from the shared_secret
                log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, "Generating 2FA code from shared_secret.");
                __classPrivateFieldGet(this, _Bot_loginData, "f").twoFactorCode = SteamTotp.getAuthCode(auth);
            }
        }
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, "Logging in...");
        __classPrivateFieldGet(this, _Bot_steamClient, "f")?.logOn(__classPrivateFieldGet(this, _Bot_loginData, "f"));
    }
    sendFloatRequest(link) {
        return new Promise((resolve, reject) => {
            if (!isInspectLinkValid) {
                log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Invalid link: ${link}`);
                reject("Invalid link.");
            }
            __classPrivateFieldSet(this, _Bot_resolve, resolve, "f");
            this.busy = true;
            let params = linkToInspectRequest(link);
            // Guaranteed to work, but typescript wants reassurance lol
            if (params) {
                __classPrivateFieldSet(this, _Bot_currentRequest, params, "f");
                log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Fetching for ${__classPrivateFieldGet(this, _Bot_currentRequest, "f").a}`);
                if (!this.loggedIn) {
                    reject('This bot is not ready');
                }
                else {
                    // The first param (owner) depends on the type of inspect link
                    __classPrivateFieldGet(this, _Bot_csgoClient, "f").inspectItem(params.s !== '0' ? params.s : params.m, params.a, params.d);
                }
                // Set a timeout in case the GC takes too long to respond
                this.ttlTimeout = setTimeout(() => {
                    // GC didn't respond in time, reset and reject
                    this.busy = false;
                    __classPrivateFieldSet(this, _Bot_currentRequest, false, "f");
                    reject('ttl exceeded');
                }, this.settings.request_ttl);
            }
        });
    }
    set loggedIn(val) {
        const prev = this.loggedIn;
        __classPrivateFieldSet(this, _Bot_loggedIn, val, "f");
        if (val !== prev) {
            this.emit(val ? 'ready' : 'unready');
        }
    }
    get loggedIn() {
        return __classPrivateFieldGet(this, _Bot_loggedIn, "f") || false;
    }
}
_Bot_loggedIn = new WeakMap(), _Bot_relogin = new WeakMap(), _Bot_steamClient = new WeakMap(), _Bot_csgoClient = new WeakMap(), _Bot_loginData = new WeakMap(), _Bot_resolve = new WeakMap(), _Bot_currentRequest = new WeakMap(), _Bot_instances = new WeakSet(), _Bot_bindEvents = function _Bot_bindEvents() {
    __classPrivateFieldGet(this, _Bot_steamClient, "f").on('error', (err) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, "Error logging in");
        if (err.eresult && login_errors[err.eresult] !== undefined) {
            log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, login_errors[err.eresult]);
        }
    });
    __classPrivateFieldGet(this, _Bot_steamClient, "f").on('disconnected', (eresult, msg) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Logged off, reconnecting! (${eresult}, ${msg})`);
    });
    __classPrivateFieldGet(this, _Bot_steamClient, "f").on('loggedOn', (details, parental) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Log on OK`);
        // Fixes reconnecting to CS:GO GC since node-steam-user still assumes we're playing 730
        // and never sends the appLaunched event to node-globaloffensive
        __classPrivateFieldGet(this, _Bot_steamClient, "f")?.gamesPlayed([], true);
        if (__classPrivateFieldGet(this, _Bot_relogin, "f")) {
            // Don't check ownership cache since the event isn't always emitted on relogin
            log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, "Initiating GC Connection, Relogin");
            __classPrivateFieldGet(this, _Bot_steamClient, "f").gamesPlayed([730], true);
            return;
        }
        // Ensure we own CSGO
        // We have to wait until app ownership is cached to safely check
        // @ts-ignore
        __classPrivateFieldGet(this, _Bot_steamClient, "f").once('appOwnershipCached', () => {
            if (!__classPrivateFieldGet(this, _Bot_steamClient, "f").ownsApp(730)) {
                log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, "Bot doesn't own CS:GO, retrieving free license");
                // Request a license for CS:GO
                __classPrivateFieldGet(this, _Bot_steamClient, "f").requestFreeLicense([730], (err, grantedPackages, grantedAppIDs) => {
                    log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Granted Packages ${grantedPackages.toString()}`);
                    log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `Granted App IDs ${grantedAppIDs.toString()}`);
                    if (err) {
                        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, 'Failed to obtain free CS:GO license');
                    }
                    else {
                        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, 'Initiating GC Connection');
                        __classPrivateFieldGet(this, _Bot_steamClient, "f").gamesPlayed([730], true);
                    }
                });
            }
            else {
                log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, 'Initiating GC Connection');
                __classPrivateFieldGet(this, _Bot_steamClient, "f").gamesPlayed([730], true);
            }
        });
    });
    __classPrivateFieldGet(this, _Bot_csgoClient, "f").on('inspectItemInfo', (itemData_) => {
        if (__classPrivateFieldGet(this, _Bot_resolve, "f") && typeof __classPrivateFieldGet(this, _Bot_currentRequest, "f") !== 'boolean') {
            const itemData = {
                delay: 0,
                itemId: itemData_.itemid,
                defindex: itemData_.defindex,
                paintindex: itemData_.paintindex,
                rarity: itemData_.rarity,
                quality: itemData_.quality,
                killeatervalue: itemData_.killeatervalue || 0,
                paintseed: itemData_.paintseed || 0,
                s: '',
                a: '',
                d: '',
                m: '',
                paintwear: itemData_.paintwear,
                stickers: itemData_.stickers
            };
            // Ensure the received itemid is the same as what we want
            if (itemData.itemId !== __classPrivateFieldGet(this, _Bot_currentRequest, "f").a)
                return;
            // Clear any TTL timeout
            if (typeof this.ttlTimeout !== 'boolean') {
                clearTimeout(this.ttlTimeout);
                this.ttlTimeout = false;
            }
            // GC requires a delay between subsequent requests
            // Figure out how long to delay until this bot isn't busy anymore
            let offset = new Date().getTime() - __classPrivateFieldGet(this, _Bot_currentRequest, "f").time;
            let delay = this.settings.request_delay - offset;
            // If we're past the request delay, don't delay
            if (delay < 0)
                delay = 0;
            itemData.delay = delay;
            itemData.s = __classPrivateFieldGet(this, _Bot_currentRequest, "f").s;
            itemData.a = __classPrivateFieldGet(this, _Bot_currentRequest, "f").a;
            itemData.d = __classPrivateFieldGet(this, _Bot_currentRequest, "f").d;
            itemData.m = __classPrivateFieldGet(this, _Bot_currentRequest, "f").m;
            if (typeof __classPrivateFieldGet(this, _Bot_resolve, "f") !== 'boolean') {
                __classPrivateFieldGet(this, _Bot_resolve, "f").call(this, itemData);
                __classPrivateFieldSet(this, _Bot_resolve, false, "f");
                __classPrivateFieldSet(this, _Bot_currentRequest, false, "f");
                setTimeout(() => {
                    // We're no longer busy (satisfied request delay)
                    this.busy = false;
                }, delay);
            }
        }
    });
    __classPrivateFieldGet(this, _Bot_csgoClient, "f").on('connectedToGC', () => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, 'CSGO Client Ready!');
        __classPrivateFieldSet(this, _Bot_loggedIn, true, "f");
    });
    __classPrivateFieldGet(this, _Bot_csgoClient, "f").on('disconnectedFromGC', (reason) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `CSGO unready (${reason}), trying to reconnect!`);
        __classPrivateFieldSet(this, _Bot_loggedIn, false, "f");
        // node-globaloffensive will automatically try to reconnect
    });
    __classPrivateFieldGet(this, _Bot_csgoClient, "f").on('connectionStatus', (status) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `GC Connection Status Update ${status}`);
    });
    // @ts-ignore
    __classPrivateFieldGet(this, _Bot_csgoClient, "f").on('debug', (msg) => {
        log(__classPrivateFieldGet(this, _Bot_loginData, "f").accountName, `CSGO Debug ${msg}`);
    });
};

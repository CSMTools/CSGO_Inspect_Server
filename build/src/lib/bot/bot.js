var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Bot_loggedIn, _Bot_steamClient, _Bot_loginData;
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { EventEmitter } from 'events';
import { log } from "../util.js";
class Bot extends EventEmitter {
    constructor() {
        super();
        _Bot_loggedIn.set(this, false);
        _Bot_steamClient.set(this, null);
        _Bot_loginData.set(this, null);
        __classPrivateFieldSet(this, _Bot_steamClient, new SteamUser({
            enablePicsCache: true
        }), "f");
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
                // Typescript wants this :)
                if (__classPrivateFieldGet(this, _Bot_loginData, "f")) {
                    __classPrivateFieldGet(this, _Bot_loginData, "f").authCode = auth;
                }
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
    get loggedIn() {
        return __classPrivateFieldGet(this, _Bot_loggedIn, "f");
    }
}
_Bot_loggedIn = new WeakMap(), _Bot_steamClient = new WeakMap(), _Bot_loginData = new WeakMap();

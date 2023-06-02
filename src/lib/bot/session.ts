import { EAuthSessionGuardType, EAuthTokenPlatformType, LoginSession } from 'steam-session';
import { generateAuthCode } from 'steam-totp';
import { getBotTag, log } from '../util.js';

export default class Session {
    TAG: string = "unknownBot";

    session?: LoginSession;

    constructor() { }

    async getRefreshToken(accountName: string, password: string, sharedSecret: string) {
        return new Promise<string>(async (resolve, reject) => {
            this.TAG = getBotTag(accountName) + 'S';

            if (!this.session) {
                this.session = new LoginSession(EAuthTokenPlatformType.SteamClient);
                let startResult = await this.session.startWithCredentials({
                    accountName,
                    password
                });

                if (startResult.validActions && startResult.validActions.some(action => action.type === EAuthSessionGuardType.DeviceCode)) {
                    try {
                        // Generate the code from the shared_secret
                        log(this.TAG, "Generating 2FA code from shared_secret")

                        let code = generateAuthCode(sharedSecret);
                        await this.session.submitSteamGuardCode(code);
                        await this.#waitForAuthenticated();
                    } catch (e: any) {
                        log(this.TAG, `Failure when submitting Steam Guard code: ${e.message}`)
                        reject(e);
                    }
                } else if (startResult.actionRequired) {
                    reject(new Error('Login action is required, but we don\'t know how to handle it'));
                }
            }

            if (!this.session.accountName) {
                await this.#waitForAuthenticated();
            }

            resolve(this.session.refreshToken);
        })
    }

    isLoggedIn(): boolean {
        return !!this.session;
    }

    #waitForAuthenticated() {
        return new Promise<boolean>((resolve, reject) => {
            if (this.session) {
                this.session.once("authenticated", () => {
                    log(this.TAG, "Authenticated")

                    resolve(true);
                });
            }
        })
    }
}
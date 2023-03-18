import { EventEmitter } from 'events';
import Bot from './bot.js';
import { linkToInspectRequest } from '../util.js';
export default class Master extends EventEmitter {
    #logins;
    #settings;
    #bots = [];
    #botsBusyIndex = [];
    #botsAvailable = 0;
    #botsNotBusy = 0;
    #inspectQueue = [];
    constructor(logins, settings) {
        super();
        this.#logins = logins;
        this.#settings = settings;
        this.#createBots();
    }
    #getNonBusyBot() {
        for (let i = 0; i < this.#bots.length; i++) {
            if (this.#botsBusyIndex[i] === true) {
                return i;
            }
        }
    }
    #createBots() {
        for (let i = 0; i < this.#logins.length; i++) {
            let login = this.#logins[i];
            let delay = 0;
            if (i !== 0) {
                delay = Math.round(Math.random() * 4 * 60 * 1000);
            }
            const bot = new Bot(this.#settings);
            setTimeout(() => {
                bot.login(login.user, login.pass, login.auth);
            }, delay);
            this.#bots.push(bot);
            if (this.#bots.length === this.#logins.length) {
                this.#bindEvents();
            }
        }
    }
    #bindEvents() {
        for (let i = 0; i < this.#bots.length; i++) {
            const bot = this.#bots[i];
            bot.on('ready', () => {
                this.#botsAvailable++;
                this.botsNotBusy += 1;
                this.#toggleBusyIndex(i);
            });
            bot.on('unready', () => {
                this.#botsAvailable--;
                this.botsNotBusy -= 1;
                this.#toggleBusyIndex(i);
            });
            bot.on('busy', () => {
                this.botsNotBusy -= 1;
                this.#toggleBusyIndex(i);
            });
            bot.on('unbusy', () => {
                this.botsNotBusy += 1;
                this.#toggleBusyIndex(i);
            });
        }
    }
    async #handleNextInspect() {
        if (!this.#inspectQueue.length || !this.#botsNotBusy) {
            console.log(2);
            return;
        }
        console.log(3);
        let inspectData = this.#inspectQueue.shift();
        if (!inspectData) {
            return;
        }
        let botIndex = this.#getNonBusyBot();
        if (typeof botIndex === 'number') {
            console.log(6);
            this.#bots[botIndex].sendFloatRequest(inspectData)
                .then((res) => {
                this.emit('inspectResult', res);
            })
                .catch((err) => {
                this.emit('inspectResult', err);
            });
        }
    }
    inspectItem(link) {
        return new Promise((resolve, reject) => {
            if (!this.#botsAvailable) {
                reject('No bots available');
            }
            const params = linkToInspectRequest(link);
            if (params === null) {
                reject('Invalid link');
                return;
            }
            this.#inspectQueue.push(params);
            let _this = this;
            this.on('inspectResult', function cb(res) {
                if (typeof res === 'string') {
                    return reject(res);
                }
                if (res.a = params.a) {
                    _this.removeListener('inspectResult', cb);
                    resolve(res);
                }
            });
            if (this.#botsNotBusy > 0) {
                console.log(1);
                this.#handleNextInspect();
            }
        });
    }
    #toggleBusyIndex(i) {
        this.#botsBusyIndex[i] = !this.#botsBusyIndex[i];
    }
    set botsNotBusy(val) {
        const prev = this.#botsNotBusy;
        if (val > prev) {
            this.#handleNextInspect();
        }
        this.#botsNotBusy = val;
    }
    get botsNotBusy() {
        return this.#botsNotBusy;
    }
}

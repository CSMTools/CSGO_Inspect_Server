import { EventEmitter } from 'events';

import Bot from './bot.js';
import { linkToInspectRequest } from '../util.js';

import { BotSettings, InspectRequest, ItemData, LoginConfig } from '../types/BotTypes';

export default class Master extends EventEmitter {
  #inspectQueue: (InspectRequest | null)[] = [];
  #botsBusyIndex: boolean[] = [];
  #botsAvailable: number = 0;
  #botsNotBusy: number = 0;
  #settings: BotSettings;
  #logins: LoginConfig[];
  #bots: Bot[] = [];

  constructor(logins: LoginConfig[], settings: BotSettings) {
    super();

    this.#logins = logins;
    this.#settings = settings;

    this.#createBots();
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
      }, delay)

      this.#bots.push(bot);

      if (this.#bots.length === this.#logins.length) {
        this.#bindEvents();
      }
    }
  }

  #bindEvents() {
    for (let i = 0; i < this.#bots.length; i++) {
      const bot = this.#bots[i];
      const _this = this;

      function handleBusy() {
        _this.#botsBusyIndex[i] = _this.#bots[i].busy;
        _this.botsNotBusy = _this.#botsBusyIndex.filter(x => x === false).length;
      }

      bot.on('ready', () => {
        this.#botsAvailable++;
        handleBusy()
      })
      bot.on('unready', () => {
        this.#botsAvailable--;
        handleBusy()
      })
      bot.on('busy', handleBusy)
      bot.on('unbusy', handleBusy)
    }
  }

  #getNonBusyBot() {
    for (let i = 0; i < this.#bots.length; i++) {
      if (this.#botsBusyIndex[i] === false) {
        return i;
      }
    }
  }

  async #handleNextInspect() {
    if (!this.#inspectQueue.length || !this.#botsNotBusy) {
      return;
    }

    let inspectData = this.#inspectQueue.shift();

    if (!inspectData) {
      return;
    }

    let botIndex = this.#getNonBusyBot()
    if (typeof botIndex === 'number') {
      this.#bots[botIndex].sendFloatRequest(inspectData)
        .then((res) => {
          this.emit('inspectResult', res);
        })
        .catch((err) => {
          this.emit('inspectResult', `${inspectData?.a} ${err as string}`);
        })
    }
  }

  inspectItem(link: string): Promise<ItemData> {
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

      this.on('inspectResult', function cb(res: ItemData | string) {
        if (typeof res === 'string') {
          if (res.startsWith(params.a)) {
            return reject(res);
          }
        } else if (res.a = params.a) {
          _this.removeListener('inspectResult', cb)

          resolve(res);
        }
      })

      if (this.#botsNotBusy > 0) {
        this.#handleNextInspect();
      }
    })
  }

  #inspectItemBulk(params: InspectRequest): Promise<ItemData> {
    return new Promise((resolve, reject) => {
      if (!this.#botsAvailable) {
        reject('No bots available');
      }

      let _this = this;

      this.on('inspectResult', function cb(res: ItemData | string) {
        if (typeof res === 'string') {
          if (res.startsWith(params.a)) {
            return reject(res);
          }
        } else if (res.a = params.a) {
          _this.removeListener('inspectResult', cb)

          resolve(res);
        }
      })

      if (this.botsNotBusy !== 0) {
        this.#handleNextInspect();
      }
    })
  }

  inspectItemBulk(links: string[]): Promise<ItemData[]> {
    return new Promise(async (resolve, reject) => {
      const items: ItemData[] = [];

      for (let i = 0; i < links.length; i++) {
        let link = links[i];

        const params = linkToInspectRequest(link);

        if (params === null) {
          reject('Invalid link');
          return;
        }

        this.#inspectQueue.push(params);

        let itemData = await this.#inspectItemBulk(params);

        items.push(itemData);
      }

      resolve(items);
    })
  }

  set botsNotBusy(val: number) {
    this.#botsNotBusy = val;

    if (this.#botsNotBusy > 0) {
      this.#handleNextInspect();
    }
  }

  get botsNotBusy() {
    return this.#botsNotBusy;
  }

  get botsAvailable() {
    return this.#botsAvailable;
  }
}
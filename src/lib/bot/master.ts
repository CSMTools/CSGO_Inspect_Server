import { EventEmitter } from 'events';

import Bot from './bot.js';
import { inspectRequestToInspectFields, linkToInspectRequest, log, shuffleArray } from '../util.js';

import { BotSettings, InspectRequest, ItemData, LoginConfig } from '../types/BotTypes';
import DataManager from '../database/index.js';
import InspectCache from './cache.js';
import { getItemIDFromItem } from '../database/itemId.js';

export default class Master extends EventEmitter {
  #inspectQueue: (InspectRequest | null)[] = [];
  #database: DataManager | null;
  #botsAvailable: number = 0;
  #settings: BotSettings;
  #logins: LoginConfig[];
  #bots: Bot[] = [];
  #inspectCache: InspectCache | null = null;

  constructor(logins: LoginConfig[], settings: BotSettings, database: DataManager | null = null) {
    super();

    this.#logins = logins;
    this.#settings = settings;

    this.#database = database;

    if (database !== null) {
      this.#inspectCache = new InspectCache(database);
    }

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

      bot.on('ready', () => {
        this.#botsAvailable++;
      })
      bot.on('unready', () => {
        this.#botsAvailable--;
      })
    }
  }

  #getNonBusyBot(): Bot | false {
    // Shuffle array to evenly distribute requests
    let bots = shuffleArray(this.#bots);

    for (let bot of bots) {
      console.log(1, bot.name)
      if (!bot.busy && bot.loggedIn) {
        console.log(2, bot.name)
        return bot;
      }
    }

    return false;
  }

  async #handleNextInspect() {
    if (!this.#inspectQueue.length || !this.#botsAvailable) {
      return;
    }

    let inspectData = this.#inspectQueue.shift();

    if (!inspectData) {
      return;
    }

    if (this.#inspectCache) {
      let inspectFields = inspectRequestToInspectFields(inspectData);
      let cachedItem: ItemData | null = await this.#inspectCache.getItemByInspectFields(inspectFields);

      if (cachedItem !== null) {
        return this.emit('inspectResult', cachedItem);
      }
    }

    let bot = this.#getNonBusyBot();
    if (bot) {
      bot.sendFloatRequest(inspectData)
        .then((res) => {
          this.emit('inspectResult', res);

          // The saving process not being awaited is intentional, as it is not neccessary to accomplish the request and can be side-lined.
          if (this.#inspectCache) {
            if (res.s !== '0') {
              this.#inspectCache.createOrUpdateItem(res, 'S' + res.s);
            } else {
              this.#inspectCache.createOrUpdateItem(res, 'M' + res.m);
            }
          }
        })
        .catch((err) => {
          this.emit('inspectResult', `${inspectData?.a} ${err as string}`);
        })
    } else {
      this.#inspectQueue.push(inspectData);
    }
  }

  inspectItem(link: string, addAdditional: boolean = false): Promise<ItemData> {
    return new Promise(async (resolve, reject) => {
      if (!this.#botsAvailable) {
        return reject('No bots available');
      }

      const params = linkToInspectRequest(link);

      if (params === null) {
        return reject('Invalid link');
      }

      this.#inspectQueue.push(params);

      let _this = this;

      this.on('inspectResult', function cb(res: ItemData | string) {
        if (typeof res === 'string') {
          if (res.startsWith(params.a)) {
            return reject(res);
          }

          //I managed to create an amazing typo below, where I put = instead of === and that caused me multiple days of debugging fml. Just wanted to put this here to always remember.
        } else if (res.a === params.a) {
          _this.removeListener('inspectResult', cb);

          if (addAdditional) {
            res = _this.#database?.gameData.addAdditionalItemProperties(res) || res;
          }

          if (res.itemid.length !== 32) {
            res.itemid = getItemIDFromItem(res);
          }

          resolve(res);
        }
      })

      if (this.#getNonBusyBot()) {
        this.#handleNextInspect();
      }
    })
  }

  inspectItemBulk(links: string[], addAdditional: boolean = false): Promise<ItemData[]> {
    return new Promise(async (resolve, reject) => {
      const promises: Promise<ItemData>[] = [];
      const items: ItemData[] = [];

      for (let link of links) {
        promises.push(this.inspectItem(link, addAdditional));
      }

      Promise.allSettled(promises).then((results) => {
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            items.push(result.value);
          } else {
            reject(result.reason);
          }
        })

        resolve(items);
      })
    })
  }

  get botsAvailable() {
    return this.#botsAvailable;
  }
}
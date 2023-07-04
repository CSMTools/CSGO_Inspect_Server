import Queue from 'better-queue';

// These lines make "require" available
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import Bot from './bot.js';
import { inspectRequestToInspectFields, linkToInspectRequest, log, shuffleArray } from '../util.js';

import { BotSettings, InspectRequest, ItemData, LoginConfig } from '../types/BotTypes';
import DataManager from '../database/index.js';
import InspectCache from './cache.js';
import { getItemIDFromItem } from '../database/itemId.js';
import SteamUser from 'steam-user';
import CDN from '../database/cdn.js';
import GameData from '../database/game-data.js';
import { isAcidFade, isAmberFade, isFade } from '@csmtools/fadegradients';

const { AcidFadeCalculator, AmberFadeCalculator, FadeCalculator } = require('csgo-fade-percentage-calculator');

const TAG = 'Master';

export default class Master {
  #inspectQueue: Queue = new Queue((task: InspectRequest, cb) => {
    this.#handleInspect(task, cb)
  }, {
    precondition: (cb) => 
      cb(null, !this.#allBotsBusy()),
    preconditionRetryTimeout: 10
  });
  #botsAvailable: number = 0;
  #settings: BotSettings;
  #logins: LoginConfig[];
  #bots: Bot[] = [];
  #inspectCache: InspectCache | null = null;
  #steamClient: SteamUser = new SteamUser;
  CDN: CDN = new CDN(this.#steamClient);
  gameData: GameData = new GameData(this.CDN);

  constructor(logins: LoginConfig[], settings: BotSettings, database: DataManager | null = null) {
    this.#logins = logins;
    this.#settings = settings;

    if (database !== null) {
      this.#inspectCache = new InspectCache(database, this.gameData);
    }

    this.CDN.on('ready', () => {
      this.#createBots();
    })

    this.#logOnMaster();
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
        this.#bindBotEvents();
      }
    }
  }

  #bindBotEvents() {
    for (let i = 0; i < this.#bots.length; i++) {
      const bot = this.#bots[i];

      bot.on('ready', () => {
        this.#botsAvailable++;
      })
      bot.on('unready', () => {
        this.#botsAvailable--;
      })
    }
  }

  #logOnMaster() {
    //@ts-ignore
    this.#steamClient.logOn({ anonymous: true });

    this.#steamClient.on("loggedOn", (_details) => {
      log(TAG, `Logged on as anonymous`);
    })
  }

  #getNonBusyBot(): Bot | false {
    // Shuffle array to evenly distribute requests
    let bots = shuffleArray(this.#bots);

    for (let bot of bots) {
      if (!bot.busy && bot.loggedIn) {
        return bot;
      }
    }

    return false;
  }

  #allBotsBusy(): boolean {
    for (let bot of this.#bots) {
      if (!bot.busy && bot.loggedIn) {
        return false;
      }
    }

    return true;
  }

  async #handleInspect(inspectData: InspectRequest, callback: (err: any, result?: ItemData) => void) {
    if (this.#inspectCache) {
      let inspectFields = inspectRequestToInspectFields(inspectData);
      let cachedItem: ItemData | null = await this.#inspectCache.getItemByInspectFields(inspectFields);

      if (cachedItem !== null) {
        return callback(null, cachedItem);
      }
    }

    let bot = this.#getNonBusyBot();

    // This should always equal true due to the checks the queue does before dispatching a job to this function,
    // though this is here for typescript and just in case something fails.
    if (bot) {
      bot.sendFloatRequest(inspectData)
        .then((res) => {
          // Calculate fade percentage if applicable
          const weaponName = this.gameData.getEnglishWeaponName(res, this.gameData.getWeaponData(res), this.gameData.getCodeName(res)).weapon_type;

          if (isFade(res.paintindex)) {
            res.fadePercentage = FadeCalculator.getFadePercentage(weaponName, res.paintseed).percentage;
          } else if (isAmberFade(res.paintindex)) {
            res.fadePercentage = AmberFadeCalculator.getFadePercentage(weaponName, res.paintseed).percentage;
          } else if (isAcidFade(res.paintindex)) {
            res.fadePercentage = AcidFadeCalculator.getFadePercentage(weaponName, res.paintseed).percentage;
          }

          callback(null, res);

          // The saving process not being awaited is intentional, as it is not neccessary to accomplish the request and can be side-lined.
          if (this.#inspectCache) {
            if (res.s !== '0') {
              this.#inspectCache.createOrUpdateItem(res, 'S' + res.s);
            } else {
              this.#inspectCache.createOrUpdateItem(res, 'M' + res.m);
            }
          }
        }).catch(callback)
    } else {
      console.log("This should not happen");
      this.#inspectQueue.push(inspectData, callback);
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

      this.#inspectQueue.push(params)
        .once('finish', (res: ItemData) => {
          if (addAdditional) {
            res = this.gameData.addAdditionalItemProperties(res);
          }

          if (res.itemid.length !== 35) {
            res.itemid = getItemIDFromItem(res);
          }

          resolve(res);
        })
        .once('failed', (err: any) => {
          return reject(err.toString());
        });
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
import { PrismaClient } from '@prisma/client'

import Master from '../bot/master.js';
import Scraper from './web_scraper/index.js';

import { SteamFriend } from '../types/DataManagementTypes.js';

const prisma = new PrismaClient()

export default class DataManager {
  requestsToday: number = 0;
  #steamApiKey: string;
  #botMaster: Master;
  #scraper: Scraper;

  constructor(steamApiKey: string, botMaster: Master) {
    this.#steamApiKey = steamApiKey;
    this.#botMaster = botMaster;

    this.#scraper = new Scraper();
  }
  getInventory(steamId: string) {

  }
  async get100UsersFriends(steamId: string) {
    let users = await prisma.steam_users.findMany({
      where: {
        checked_friends: {
          equals: false
        }
      },
      take: 100
    })
    if (!users) {
      return;
    }

    for (const user of users) {
      let friends = await this.getFriendsOfUser(user.steam_id)
    }
  }
  async getFriendsOfUser(steamId: string): Promise<SteamFriend[]> {
    return new Promise<SteamFriend[]>(async (resolve, reject) => {
      let friends = await this.#scraper.getFriends(steamId)

      resolve(friends)
    })
  }
}
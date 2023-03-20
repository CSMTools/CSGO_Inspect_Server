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
      let friends: {
        steam_id: string;
        avatar_hash: string;
        last_update: number;
        checked_friends: boolean;
      }[] = [];

      (await this.getFriendsOfUser(user.steam_id)).forEach((friend) => {
        friends.push({
          steam_id: friend.steamId,
          avatar_hash: friend.avatar_hash,
          last_update: Date.now(),
          checked_friends: false
        });
      })

      if (!friends.length) {
        continue;
      }
      try {
        await prisma.steam_users.createMany({
          data: friends,
          skipDuplicates: true
        })

        await prisma.steam_users.update({
          where: {
            steam_id: user.steam_id
          },
          data: {
            checked_friends: true
          }
        })
      } catch (err) {
        console.error(err);
      }
    }
  }
  async getFriendsOfUser(steamId: string): Promise<SteamFriend[]> {
    return new Promise<SteamFriend[]>(async (resolve, reject) => {
      let friends = await this.#scraper.getFriends(steamId)

      resolve(friends)
    })
  }
}
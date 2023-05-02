import { PrismaClient } from '@prisma/client'

import Master from '../bot/master.js';
import Scraper from './web_scraper/index.js';
import { inspectRequestToInspectFields, log } from '../util.js'

import { SteamFriend } from '../types/DataManagementTypes.js';
import { ItemData } from '../types/BotTypes.js';
import GameData from './game-data.js';

const prisma = new PrismaClient()

const TAG = '\x1b[31mDATABASE\x1b[0m'

export default class DataManager {
  requestsToday: number = 0;
  #steamApiKey: string;
  #scraper: Scraper;

  constructor(steamApiKey: string) {
    this.#steamApiKey = steamApiKey;

    this.#scraper = new Scraper();

    this.#init();

    new GameData;
  }

  #init() {
    prisma.steam_users.findFirst().then(async (user) => {
      if (!user) {
        log(TAG, 'Creating first user')
        try {
          await prisma.steam_users.create({
            data: {
              steam_id: '76561197960266237',
              avatar_hash: 'a627d3c0e9fe310d6ce9538c3594376522acbb00',
              last_update: Date.now(),
              checked_friends: false
            }
          })
          log(TAG, 'Created first user')
        } catch (e) {
          console.log(e)
        }
      }

      /*this.collect100UsersFriends();

      setInterval(() => {
        this.collect100UsersFriends();
      }, 600000)*/
    })
  }

  collectInventory(steamId: string) {

  }

  async getItemsByOwner(steamId: string) {
    let parsedItems: ItemData[] = [];

    let items = await prisma.steam_item.findMany({
      where: {
        ownerId: steamId
      }
    })

    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      parsedItems.push(item.data as unknown as ItemData);
    }

    return parsedItems;
  }

  async createOrUpdateItem(itemId: string, ownerId: string, isFromMarket: boolean, data: ItemData): Promise<boolean> {
    try {
      let inspectItemFields = inspectRequestToInspectFields({...data, time: 0});

      await prisma.steam_item.upsert({
        where: {
          id: itemId
        },
        create: {
          id: itemId,
          last_inspect_fields: inspectItemFields,
          ownerId,
          data: JSON.stringify(data),
          ownerHistory: [ownerId],
          last_update: Date.now()
        },
        update: {
          last_inspect_fields: inspectItemFields,
          ownerId,
          data: JSON.stringify(data),
          ownerHistory: {
            push: ownerId
          },
          last_update: Date.now()
        }
      })
      
      return true;
    } catch (e) {
      return false;
    }
  }

  async getItemById(itemId: string): Promise<ItemData|null> {
    try {
      let item = await prisma.steam_item.findFirstOrThrow({
        where: {
          id: itemId
        }
      })

      return item.data as unknown as ItemData;
    } catch (e) {
      return null;
    }
  }

  async getItemByInspectFields(inspectFields: string): Promise<ItemData|null> {
    try {
      let item = await prisma.steam_item.findFirstOrThrow({
        where: {
          last_inspect_fields: inspectFields
        }
      })

      return item.data as unknown as ItemData;
    } catch (e) {
      return null;
    }
  }

  async collect100UsersFriends() {
    log(TAG, "Collecting friends of up to 100 users")
    let users = await prisma.steam_users.findMany({
      where: {
        checked_friends: {
          equals: false
        }
      },
      take: 100
    })
    log(TAG, `Collecting friends of ${users.length} users`)
    if (!users) {
      log(TAG, "No friends to collect")
      return;
    }

    for (const user of users) {
      let friends: {
        steam_id: string;
        avatar_hash: string;
        last_update: number;
      }[] = [];

      (await this.collectFriendsOfUser(user.steam_id)).forEach((friend) => {
        friends.push({
          steam_id: friend.steamId,
          avatar_hash: friend.avatar_hash,
          last_update: Date.now(),
        });
      });

      if (!friends.length) {
        await prisma.steam_users.update({
          where: {
            steam_id: user.steam_id
          },
          data: {
            checked_friends: true
          }
        })
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
        log(TAG, user.steam_id)
      } catch (err) {
        console.error(err);
      }
    }

    log(TAG, 'Finished collecting friends')
  }

  async collectFriendsOfUser(steamId: string): Promise<SteamFriend[]> {
    return new Promise<SteamFriend[]>(async (resolve, reject) => {
      try {
        let friends = await this.#scraper.getFriends(steamId);

        resolve(friends);
      } catch (e) {
        resolve([]);
      }
    })
  }
}
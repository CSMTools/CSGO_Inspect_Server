import { PrismaClient, steam_item } from '@prisma/client'

import Master from '../bot/master.js';
import Scraper from './web_scraper/index.js';
import { inspectRequestToInspectFields, linkToInspectRequest, log } from '../util.js'

import { SteamFriend } from '../types/DataManagementTypes.js';
import { ItemData, StickerInItem } from '../types/BotTypes.js';
import GameData from './game-data.js';
import { deserializeStickerData_V1, serializeStickerData_V1 } from './itemId.js';
import config from '../../../config.js';

const prisma = new PrismaClient()

const TAG = '\x1b[31mDATABASE\x1b[0m'

export default class DataManager {
  requestsToday: number = 0;
  #steamApiKey: string;
  #scraper: Scraper;

  gameData: GameData;

  constructor(steamApiKey: string) {
    this.#steamApiKey = steamApiKey;

    this.#scraper = new Scraper();

    this.#init();

    this.gameData = new GameData;
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

  async getItemsByOwner(steamId: string, checkExpiry: boolean) {
    let parsedItems: ItemData[] = [];

    let items = await prisma.steam_item.findMany({
      where: {
        ownerId: steamId
      }
    })

    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      if (checkExpiry && item.last_update + config.caching.expiration_time < BigInt(Date.now())) {
        continue;
      }

      parsedItems.push(this.#steam_itemToItemData(item));
    }

    return parsedItems;
  }

  async createOrUpdateItem(itemId: string, ownerId: string, isFromMarket: boolean, data: ItemData): Promise<boolean> {
    try {
      let inspectItemFields = inspectRequestToInspectFields({ ...data, time: 0 });

      await prisma.steam_item.upsert({
        where: {
          id: itemId
        },
        create: {
          id: itemId,
          last_inspect_fields: inspectItemFields,
          ownerId,

          // Data
          defindex: data.defindex,
          paintindex: data.paintindex,
          rarity: data.rarity,
          quality: data.quality,
          killeaterscoretype: data.killeaterscoretype,
          killeatervalue: data.killeatervalue,
          customname: data.customname,
          paintseed: data.paintseed,
          paintwear: data.paintwear,
          origin: data.origin,
          latest_stickers: this.#serializeStickers(data.stickers),

          ownerHistory: [ownerId],
          last_update: Date.now()
        },
        update: {
          last_inspect_fields: inspectItemFields,
          ownerId,

          // Data
          killeatervalue: data.killeatervalue,
          customname: data.customname,
          latest_stickers: this.#serializeStickers(data.stickers),

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

  async getItemById(itemId: string, checkExpiry: boolean): Promise<ItemData | null> {
    try {
      let item = await prisma.steam_item.findFirstOrThrow({
        where: {
          id: itemId
        }
      })

      if (checkExpiry && item.last_update + config.caching.expiration_time < BigInt(Date.now())) {
        return null;
      }

      return this.#steam_itemToItemData(item);
    } catch (e) {
      return null;
    }
  }

  async getItemByInspectFields(inspectFields: string, checkExpiry: boolean): Promise<ItemData | null> {
    try {
      let item = await prisma.steam_item.findFirstOrThrow({
        where: {
          last_inspect_fields: inspectFields
        }
      })

      if (checkExpiry && item.last_update + config.caching.expiration_time < BigInt(Date.now())) {
        return null;
      }

      return this.#steam_itemToItemData(item);
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

  #serializeStickers(stickers: StickerInItem[]): string[] {
    let serializedStickers: string[] = [];

    for (let sticker of stickers) {
      let s = serializeStickerData_V1(sticker.sticker_id, sticker.slot, sticker.wear, sticker.scale, sticker.rotation, sticker.tint_id);

      serializedStickers.push(s)
    }

    return serializedStickers;
  }

  #deserializeStickers(stickers: string[]): StickerInItem[] {
    let serializedStickers: StickerInItem[] = [];

    for (let sticker of stickers) {
      let s = deserializeStickerData_V1(sticker);

      if (s !== null) {
        serializedStickers.push(s);
      }
    }

    return serializedStickers;
  }

  #steam_itemToItemData(item: steam_item): ItemData {
    let ir = linkToInspectRequest('steam://rungame/730/0/+csgo_econ_action_preview ' + item.last_inspect_fields);

    return {
      itemid: item.id,
      defindex: item.defindex,
      paintindex: item.paintindex,
      rarity: item.rarity,
      quality: item.quality,
      killeaterscoretype: item.killeaterscoretype,
      killeatervalue: item.killeatervalue,
      customname: item.customname,
      paintseed: item.paintseed,
      paintwear: item.paintwear,
      origin: item.origin,
      s: ir?.s ?? '',
      a: ir?.a ?? '',
      d: ir?.d ?? '',
      m: ir?.m ?? '',
      stickers: this.#deserializeStickers(item.latest_stickers)
    };
  }
}
import { ItemOwnerType, PrismaClient, applied_sticker, item_history, steam_item } from '@prisma/client'

//import Scraper from './web_scraper/index.js';
import { inspectRequestToInspectFields, linkToInspectRequest, log } from '../util.js'

import { SteamFriend } from '../types/DataManagementTypes.js';
import { ItemData, StickerInItem } from '../types/BotTypes.js';
import { deserializeStickerData_V1, serializeStickerData_V1 } from './itemId.js';
import config from '../../../config.js';

const prisma = new PrismaClient()

const TAG = '\x1b[31mDATABASE\x1b[0m'

export default class DataManager {
  requestsToday: number = 0;
  #steamApiKey: string;
  //#scraper: Scraper;

  constructor(steamApiKey: string) {
    this.#steamApiKey = steamApiKey;

    //this.#scraper = new Scraper();

    this.#init();
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

  async getItemsByOwner(ownerId: string, checkExpiry: boolean) {
    let parsedItems: ItemData[] = [];

    let items = await prisma.steam_item.findMany({
      where: {
        ownerId: {
          equals: ownerId
        }
      },
      include: {
        stickers: true,
        ownerHistory: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1
        }
      }
    })

    for (let i = 0; i < items.length; i++) {
      let item = items[i];

      if (checkExpiry && item.lastUpdate + config.caching.expiration_time < BigInt(Date.now())) {
        continue;
      }

      parsedItems.push(this.#steam_itemToItemData(item));
    }

    return parsedItems;
  }

  async createOrUpdateItem(itemId: string, ownerId: string, data: ItemData): Promise<boolean> {
    try {
      if (data.paintseed === null) {
        return false;
      }

      let inspectItemFields = inspectRequestToInspectFields({ ...data, time: 0 });

      let ownerType: ItemOwnerType = 'UNKNOWN';
      if (ownerId.startsWith('S')) {
        ownerType = 'USER'
      } else {
        ownerType = 'MARKET'
      }

      let stickers = [];

      for (let sticker of data.stickers) {
        stickers.push({
          stickerId: sticker.sticker_id,
          slot: sticker.slot,
          tintId: sticker.tint_id,
          wear: sticker.wear,
          scale: sticker.scale,
          rotation: sticker.rotation
        })
      }

      let item = await prisma.steam_item.upsert({
        where: {
          id: itemId
        },
        create: {
          id: itemId,
          ownerId,

          defIndex: data.defindex,
          paintIndex: data.paintindex,
          rarity: data.rarity,
          quality: data.quality,
          killeaterScoretype: data.killeaterscoretype,
          killeaterValue: data.killeatervalue,
          customName: data.customname,
          paintSeed: data.paintseed,
          paintWear: data.paintwear,
          origin: data.origin,
          fadePercentage: data.fadePercentage,

          stickers: {
            createMany: {
              data: stickers
            }
          },
          ownerHistory: {
            create: {
              ownerId: ownerId,
              inspectFields: inspectItemFields,
              type: ownerType
            }
          },

          lastUpdate: Date.now()
        },
        update: {
          ownerId,

          killeaterValue: data.killeatervalue,
          customName: data.customname,
          stickers: {
            deleteMany: {},
            createMany: {
              data: stickers
            }
          },

          ownerHistory: {
            create: {
              ownerId: ownerId,
              inspectFields: inspectItemFields,
              type: ownerType
            }
          },
          lastUpdate: Date.now()
        },
        include: {
          ownerHistory: true,
          stickers: true
        }
      })

      if (item.ownerHistory.length > 1) {
        this.#cleanItemHistory(itemId);
      }

      return true;
    } catch (e) {
      console.log(e)
      return false;
    }
  }

  async getItemById(itemId: string, checkExpiry: boolean): Promise<ItemData | null> {
    try {
      let item = await prisma.steam_item.findFirstOrThrow({
        where: {
          id: itemId
        },
        include: {
          stickers: true,
          ownerHistory: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      })

      if (checkExpiry && item.lastUpdate + config.caching.expiration_time < BigInt(Date.now())) {
        return null;
      }

      return this.#steam_itemToItemData(item);
    } catch (e) {
      return null;
    }
  }

  async getItemByInspectFields(inspectFields: string, checkExpiry: boolean): Promise<ItemData | null> {
    try {
      const { item, ...history } = await prisma.item_history.findFirstOrThrow({
        where: {
          inspectFields: inspectFields
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1,

        include: {
          item: {
            include: {
              stickers: true
            }
          }
        }
      })

      if (checkExpiry && item.lastUpdate + config.caching.expiration_time < BigInt(Date.now())) {
        return null;
      }

      return this.#steam_itemToItemData({...item, ownerHistory: [history]});
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
        /*let friends = await this.#scraper.getFriends(steamId);

        resolve(friends);*/
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

  #steam_itemToItemData(item: {
    stickers: applied_sticker[],
    ownerHistory: item_history[]
  } & steam_item): ItemData {
    let ir = linkToInspectRequest('steam://rungame/730/0/+csgo_econ_action_preview ' + item.ownerHistory[0].inspectFields);

    return {
      itemid: item.id,
      defindex: item.defIndex,
      paintindex: item.paintIndex,
      rarity: item.rarity,
      quality: item.quality,
      killeaterscoretype: item.killeaterScoretype,
      killeatervalue: item.killeaterValue,
      customname: item.customName,
      paintseed: item.paintSeed,
      paintwear: item.paintWear,
      origin: item.origin,
      fadePercentage: item.fadePercentage,
      s: ir?.s ?? '',
      a: ir?.a ?? '',
      d: ir?.d ?? '',
      m: ir?.m ?? '',
      stickers: item.stickers.map(sticker => {
        return {
          sticker_id: sticker.stickerId,
          slot: sticker.slot,
          tint_id: sticker.tintId,
          wear: sticker.wear,
          scale: sticker.scale,
          rotation: sticker.rotation
        }
      })
    };
  }

  /**
   * Run this after updating an item, and don't wait for it to finish.
   * @param {string} itemId ID of item
   * @returns {void}
   */
  async #cleanItemHistory(itemId: string) {
    let history = await prisma.item_history.findMany({
      where: {
        itemId
      },
      select: {
        inspectFields: true,
        itemId: true,
        ownerId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 2
    })

    if (!history) {
      return;
    }

    if (history[0].inspectFields === history[1].inspectFields) {
      const wrongHistory = history[0];
      try {
        await prisma.item_history.delete({
          where: {
            itemId_ownerId_createdAt: {
              itemId: wrongHistory.itemId,
              ownerId: wrongHistory.ownerId,
              createdAt: wrongHistory.createdAt
            }
          }
        })

        log(TAG, `Cleaned history of ${itemId}`);
      } catch(e) {
        return log(TAG, 'Failed to clean history of ' + itemId);
      }
    }

    return;
  }
}
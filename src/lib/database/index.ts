import { ItemOwnerType, PrismaClient, applied_sticker, item_history, steam_item } from '@prisma/client'

import { inspectRequestToInspectFields, linkToInspectRequest, log } from '../util.js'

import config from '../../../config.js';
import { ItemData } from '@csmtools/types';

const prisma = new PrismaClient()

const TAG = '\x1b[31mDATABASE\x1b[0m'

export default class DataManager {
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
          ownerHistory: {
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
          },
          stickers: true
        }
      })

      if (item.ownerHistory.length > 1) {
        this.#cleanItemHistory(item.ownerHistory);
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
   * @param {item_history[]} history
   * @returns {void}
   */
  async #cleanItemHistory(history: { inspectFields: string; itemId: string; ownerId: string; createdAt: Date; }[]) {
    if (!history || history.length !== 2) {
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

        log(TAG, `Cleaned history of ${history[0].itemId}`);
      } catch(e) {
        return log(TAG, 'Failed to clean history of ' + history[0].itemId);
      }
    }

    return;
  }
}
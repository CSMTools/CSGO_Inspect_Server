import { getItemIDFromItem } from "../database/items/itemId.js";
import DataManager from "../database/index.js";

import { log } from "../util.js";
import GameData from "../database/items/game-data.js";
import { ItemData } from "@csmtools/types";

const TAG = '\x1b[33mCACHE\x1b[0m'

export default class InspectCache {
    #dataManager: DataManager;
    #gameData: GameData;

    constructor(dataManager: DataManager, gameData: GameData) {
        this.#dataManager = dataManager;
        this.#gameData = gameData;
    }

    async createOrUpdateItem(item: ItemData, ownerId: string): Promise<boolean> {
        if (item.paintseed === null) {
            return false;
        }
        
        log(TAG, `Saving item with assetId ${item.a} into database`)

        if ('delay' in item) {
            delete item.delay;
        }

        let id = getItemIDFromItem(item);

        if (!(await this.#dataManager.createOrUpdateItem(id, ownerId, item))) {
            log(TAG, `Failed saving item with assetId ${item.a} into database`)

            return false;
        }

        log(TAG, `Saved item with assetId ${item.a} into database`)

        return true;
    }

    async getItemById(itemId: string): Promise<ItemData|null> {
        log(TAG, `Getting item with itemId ${itemId} from database`)

        let item = await this.#dataManager.getItemById(itemId, true);

        log(TAG, `Gotten or failed to get item with itemId ${itemId} from database`)

        return item;
    }

    async getItemByInspectFields(inspectFields: string): Promise<ItemData|null> {
        log(TAG, `Getting item with inspectFields ${inspectFields} from database`)

        let item = await this.#dataManager.getItemByInspectFields(inspectFields, true);

        log(TAG, `Gotten or failed to get item with inspectFields ${inspectFields} from database`)

        return item;
    }
}
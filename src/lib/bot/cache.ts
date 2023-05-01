import { getItemIDFromItem } from "../database/itemId.js";
import DataManager from "../database/index.js";

import { ItemData } from "../types/BotTypes";
import { log } from "../util.js";

const TAG = '\x1b[33mCACHE\x1b[0m'

export default class InspectCache {
    #dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.#dataManager = dataManager;
    }

    async createOrUpdateItem(item: ItemData, ownerId: string, isFromMarket: boolean): Promise<boolean> {
        log(TAG, `Saving item with assetId ${item.a} into database`)

        if ('delay' in item) {
            delete item.delay;
        }

        let id = getItemIDFromItem(item);

        if (!(await this.#dataManager.createOrUpdateItem(id, ownerId, isFromMarket, item))) {
            log(TAG, `Failed saving item with assetId ${item.a} into database`)

            return false;
        }

        log(TAG, `Saved item with assetId ${item.a} into database`)

        return true;
    }

    async getItemById(itemId: string): Promise<ItemData|null> {
        log(TAG, `Getting item with itemId ${itemId} from database`)

        let item = await this.#dataManager.getItemById(itemId);

        log(TAG, `Gotten or failed to get item with itemId ${itemId} from database`)

        return item;
    }

    async getItemByInspectFields(inspectFields: string): Promise<ItemData|null> {
        log(TAG, `Getting item with inspectFields ${inspectFields} from database`)

        let item = await this.#dataManager.getItemByInspectFields(inspectFields);

        log(TAG, `Gotten or failed to get item with inspectFields ${inspectFields} from database`)

        return item;
    }
}
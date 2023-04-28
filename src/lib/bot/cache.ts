import { getItemIDFromItem } from "../database/itemId";
import DataManager from "../database";

import { ItemData } from "../types/BotTypes";

export default class InspectCache {
    #dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.#dataManager = dataManager;
    }

    createOrUpdateItem(item: ItemData) {
        if ('delay' in item) {
            delete item.delay;
        }

        let id = getItemIDFromItem(item);

        
    }
}
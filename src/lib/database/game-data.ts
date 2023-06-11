import * as https from 'https';

import config from "../../../config.js";
import UserFileManager from "../files/userFiles.js";
import * as vdf from 'simple-vdf3';
import { getPhaseValue, log } from '../util.js';
import { ItemData, StickerInItem } from '../types/BotTypes.js';
import { StickerDataFromAPI } from '../types/DataManagementTypes.js';
import CDN from './cdn.js';
import { isDoppler } from '../../data/items/DopplerPhases.js';

const floatNames = [{
    range: [0, 0.07],
    name: 'SFUI_InvTooltip_Wear_Amount_0'
}, {
    range: [0.07, 0.15],
    name: 'SFUI_InvTooltip_Wear_Amount_1'
}, {
    range: [0.15, 0.38],
    name: 'SFUI_InvTooltip_Wear_Amount_2'
}, {
    range: [0.38, 0.45],
    name: 'SFUI_InvTooltip_Wear_Amount_3'
}, {
    range: [0.45, 1.00],
    name: 'SFUI_InvTooltip_Wear_Amount_4'
}];

const urls = {
    schema_url: 'https://raw.githubusercontent.com/SteamDatabase/SteamTracking/b5cba7a22ab899d6d423380cff21cec707b7c947/ItemSchema/CounterStrikeGlobalOffensive.json',
}

const fileIds = {
    schema: '0',
}

const LanguageHandler = {
    get: function (obj: any, prop: any) {
        return obj[prop.toLowerCase()];
    },
    has: function (obj: any, prop: any) {
        return prop.toLowerCase() in obj;
    }
};

const TAG = 'game-data'

export default class GameData {
    #files: UserFileManager;
    #schema: any;
    cdn: CDN;

    constructor(cdn: CDN) {
        this.#files = new UserFileManager(config.file_location);

        this.cdn = cdn;

        this.#loadFiles();

        setInterval(() => {
            this.#reloadFiles();
        }, 7200000)
    }

    #loadFiles(): void {
        this.#files.getFile('localserver', 'game-data', fileIds.schema)
            .then((file) => {
                this.#schema = JSON.parse(file)['result'];
            })
            .catch(e => {
                this.#reloadFiles();
            })
    }

    #reloadFiles() {
        this.#downloadFile(urls.schema_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download schema`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.schema, file);

            this.#schema = JSON.parse(file)['result'];
        })
    }

    /*
        Given returned iteminfo, finds the item's min/max float, name, weapon type, and image url using CSGO game data
    */
    addAdditionalItemProperties(item: ItemData) {
        if (!this.#items_game || !this.#items_game_cdn || !this.#cs_english) {
            return item;
        };

        if (!item.additional) {
            item.additional = {
                imageurl: '',
                floatData: {
                    min: 0,
                    max: 1
                },
                weapon_type: '',
                item_name: '',
                rarity_name: '',
                quality_name: '',
                origin_name: '',
                wear_name: '',
                full_item_name: ''
            };
        }

        if (this.isGraffiti(item)) {
            this.addAdditionalGraffitiStickerData(item.stickers[0]);
        } else if (this.isAgent(item)) {

        } else if (this.isPatch(item)) {

        } else {
            this.populateStickers(item);
        }

        // Get the skin name
        let skin_name = this.getSkinName(item);

        // Get the weapon name
        let weapon_name: string = this.getWeaponName(item);

        // Get the paint data and code name
        let code_name = this.getCodeName(item);
        let paint_data = this.getPaintData(item);
        
        // Get the min and max floats
        [item.additional.floatData.min, item.additional.floatData.max] = this.getFloatLimits(paint_data);

        let weapon_data = this.getWeaponData(item);

        let { weapon_type, item_name } = this.getEnglishWeaponName(item, weapon_data, code_name);

        item.additional.weapon_type = weapon_type;
        item.additional.item_name = item_name;

        let rarity_name = this.getRarityName(item);

        if (rarity_name) {
            item.additional.rarity_name = rarity_name;
        }

        item.additional.quality_name = this.getQualityName(item);

        // Get the origin name
        const origin = this.getOriginName(item);

        if (origin) {
            item.additional.origin_name = origin;
        }

        // Get the wear name
        const wearName = this.getWearName(item.paintwear);

        if (wearName) {
            item.additional.wear_name = wearName;
        }

        const itemName = this.getFullItemName(item);

        if (itemName) {
            item.additional.full_item_name = itemName;

            // Get the image url
            let image;

            if (isDoppler(item.paintindex)) {
                image = this.cdn.getItemNameURL(itemName, getPhaseValue(item.paintindex));
            } else {
                image = this.cdn.getItemNameURL(itemName);
            }

            if (image) {
                item.additional.imageurl = image;
            }
        }

        return item;
    }

    getEnglishWeaponName(item: ItemData, weapon_data: any, code_name: string) {
        const result = {
            weapon_type: '',
            item_name: ''
        };

        // Get the weapon_hud
        let weapon_hud: string = this.getWeaponHUD(item, weapon_data);

        // Get the skin name if we can
        if (weapon_hud in this.#cs_english && code_name in this.#cs_english) {
            result.weapon_type = this.#cs_english[weapon_hud];
            result.item_name = this.#cs_english[code_name];
        }

        return result;
    }

    getWearName(float: number) {
        const f = floatNames.find((f) => float > f.range[0] && float <= f.range[1]);

        if (f) {
            return this.#cs_english[f['name']];
        }
    }

    getFullItemName(item: ItemData): string | false {
        if (!item.additional) {
            return false;
        }

        let name = '';

        // Default items have the "unique" quality
        if (item.quality !== 4) {
            name += `${item.additional.quality_name} `;
        }

        // Patch for items that are stattrak and unusual (ex. Stattrak Karambit)
        if (item.killeaterscoretype !== null && item.quality !== 9) {
            name += `${this.#cs_english['strange']} `;
        }

        name += `${item.additional.weapon_type} `;

        if (item.additional.weapon_type === 'Sticker' || item.additional.weapon_type === 'Graffiti' || item.additional.weapon_type === 'Sealed Graffiti') {
            name += `| ${item.stickers[0].name}`;
        }

        // Vanilla items have an item_name of '-'
        if (item.additional.item_name && item.additional.item_name !== '-') {
            name += `| ${item.additional.item_name} `;

            if (item.additional.wear_name) {
                name += `(${item.additional.wear_name})`;
            }
        }

        return name.trim();
    }

    getSkinName(item: ItemData) {
        let skin_name = '';

        if (item.paintindex in this.#items_game['paint_kits']) {
            skin_name = '_' + this.#items_game['paint_kits'][item.paintindex]['name'];

            if (skin_name == '_default') {
                skin_name = '';
            }
        }

        return skin_name;
    }

    getCodeName(item: ItemData) {
        if (item.paintindex in this.#items_game['paint_kits']) {
            return this.#items_game['paint_kits'][item.paintindex]['description_tag'].replace('#', '');
        }
    }

    getPaintData(item: ItemData) {
        if (item.paintindex in this.#items_game['paint_kits']) {
            return this.#items_game['paint_kits'][item.paintindex];
        }
    }

    getFloatLimits(paint_data: any): [number, number] {
        let min = 0.06;
        let max = 0.8;

        // Get the min float
        if (paint_data && 'wear_remap_min' in paint_data) {
            min = parseFloat(paint_data['wear_remap_min']);
        }

        // Get the max float
        if (paint_data && 'wear_remap_max' in paint_data) {
            max = parseFloat(paint_data['wear_remap_max']);
        }

        return [min, max];
    }

    getWeaponData(item: ItemData) {
        if (item.defindex in this.#items_game['items']) {
            return this.#items_game['items'][item.defindex];
        }
    }

    getWeaponName(item: ItemData): string {
        if (item.defindex in this.#items_game['items']) {
            return this.#items_game['items'][item.defindex]['name'];
        }

        return '';
    }

    getWeaponHUD(item: ItemData, weapon_data: any): string {
        if (weapon_data && 'item_name' in weapon_data) {
            return weapon_data['item_name'].replace('#', '');
        } else {
            // need to find the weapon hud from the prefab
            if (item.defindex in this.#items_game['items']) {
                let prefab_val = this.#items_game['items'][item.defindex]['prefab'];
                return this.#items_game['prefabs'][prefab_val]['item_name'].replace('#', '');
            }
        }

        return '';
    }

    getRarityName(item: ItemData): string | void {
        // Get the rarity name (Mil-Spec Grade, Covert etc...)
        const rarityKey = Object.keys(this.#items_game['rarities']).find((key) => {
            return parseInt(this.#items_game['rarities'][key]['value']) === item.rarity;
        });

        if (rarityKey) {
            const rarity = this.#items_game['rarities'][rarityKey];

            // Assumes weapons always have a float above 0 and that other items don't
            // TODO: Improve weapon check if this isn't robust
            return this.#cs_english[rarity[item.paintwear > 0 ? 'loc_key_weapon' : 'loc_key']];
        }
    }

    getQualityName(item: ItemData): string  {
        // Get the quality name (Souvenir, Stattrak, etc...)
        const qualityKey = Object.keys(this.#items_game['qualities']).find((key) => {
            return parseInt(this.#items_game['qualities'][key]['value']) === item.quality;
        }) || '';

        return this.#cs_english[qualityKey];
    }

    getOriginName(item: ItemData): string | void {
        // Get the origin name
        const origin = this.#schema['originNames'].find((o: any) => o.origin === item.origin);

        if (origin) {
            return origin['name'];
        }
    }

    populateStickers(item: ItemData) {
        for (const sticker of item.stickers || []) {
            this.addAdditionalStickerData(sticker, item);
        }
    }

    addAdditionalStickerData(sticker: StickerInItem, item: ItemData): StickerInItem {
        // Get sticker codename/name
        const stickerKits = this.#items_game.sticker_kits;

        const kit = stickerKits[sticker.sticker_id];

        if (!kit) {
            return sticker;
        };

        let name = this.#cs_english[kit.item_name.replace('#', '')];

        if (name) sticker.name = name;

        sticker.codename = kit.name;
        sticker.material = kit.sticker_material;

        let image = this.cdn.getStickerURL(kit.sticker_material);

        if (image) {
            sticker.image = image;
        }

        return sticker;
    }

    addAdditionalGraffitiStickerData(graffiti: StickerInItem) {
        // Get graffiti codename/name
        const stickerKits = this.#items_game.sticker_kits;

        const kit = stickerKits[graffiti.sticker_id];

        if (!kit) {
            return graffiti;
        };

        let name = this.#cs_english[kit.item_name.replace('#', '')];

        if (graffiti.tint_id) {
            name += ` (${this.#cs_english[`Attrib_SprayTintValue_${graffiti.tint_id}`]})`;
        }

        if (name) graffiti.name = name;

        graffiti.codename = kit.name;
        graffiti.material = kit.sticker_material;

        let image = this.cdn.getGraffitiNameURL("Sealed Graffiti | " + name);

        if (!image) {
            return graffiti;
        }

        graffiti.image = image;

        return graffiti;
    }

    isGraffiti(item: ItemData): boolean {
        return (item.defindex === 1348 || item.defindex === 1349);
    }

    isSticker(item: ItemData): boolean {
        return item.defindex === 1209;
    }

    isPatch(item: ItemData): boolean {
        return item.defindex === 4609;
    }

    isAgent(item: ItemData): boolean {
        return this.#items_game.items[item.defindex.toString()].name.startsWith("customplayer");
    }

    #downloadFile(url: string, cb: ((file: string | null) => void)) {
        https.get(url, function (res) {
            let errored = false;

            if (res.statusCode !== 200 && !errored) {
                cb(null);
                return;
            }

            res.setEncoding('utf8');
            let data = '';

            res.on('error', function (err) {
                cb(null);
                errored = true;
            });

            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                cb(data);
            });
        });
    };

    get #cs_english() {
        return this.cdn.csEnglish;
    }

    get #items_game_cdn() {
        return this.cdn.itemsGameCDN;
    }

    get #items_game() {
        return this.cdn.itemsGame;
    }
}
import * as https from 'https';

import config from "../../../config.js";
import UserFileManager from "../files/userFiles.js";
import * as vdf from '../vdf-parser.js';
import { log } from '../util.js';
import { ItemData } from '../types/BotTypes.js';
import { StickerDataFromAPI } from '../types/DataManagementTypes.js';

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
    items_game_url: 'https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/scripts/items/items_game.txt',
    items_game_cdn_url: 'https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/scripts/items/items_game_cdn.txt',
    csgo_english_url: 'https://raw.githubusercontent.com/SteamDatabase/GameTracking-CSGO/master/csgo/resource/csgo_english.txt',
    schema_url: 'https://raw.githubusercontent.com/SteamDatabase/SteamTracking/b5cba7a22ab899d6d423380cff21cec707b7c947/ItemSchema/CounterStrikeGlobalOffensive.json',
    stickers_url: 'https://bymykel.github.io/CSGO-API/api/en/stickers.json',
    graffiti_url: 'https://bymykel.github.io/CSGO-API/api/en/graffiti.json'
}

const fileIds = {
    items_game: '0',
    items_game_cdn: '1',
    csgo_english: '2',
    schema: '3',
    stickers: '4',
    graffiti: '5'
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
    #items_game: any;
    #items_game_cdn: any;
    #csgo_english: any;
    #schema: any;
    #stickers: any;
    #graffiti: any;

    constructor() {
        this.#files = new UserFileManager(config.file_location);

        this.#loadFiles();

        setInterval(() => {
            this.#reloadFiles();
        }, 7200000)
    }

    #loadFiles(): void {
        this.#files.getFile('localserver', 'game-data', fileIds.items_game)
            .then((file) => {
                this.#items_game = vdf.parse(file)['items_game'];

                this.#files.getFile('localserver', 'game-data', fileIds.items_game_cdn)
                    .then((file) => {
                        this.#items_game_cdn = this.#parseItemsCDN(file);
                    })
                    .catch(e => {
                        this.#reloadFiles();
                    })
                this.#files.getFile('localserver', 'game-data', fileIds.csgo_english)
                    .then((file) => {
                        this.#csgo_english = this.#objectKeysToLowerCase(vdf.parse(file)['lang']['Tokens']);
                        this.#csgo_english = new Proxy(this.#csgo_english, LanguageHandler);
                    })
                    .catch(e => {
                        this.#reloadFiles();
                    })
                this.#files.getFile('localserver', 'game-data', fileIds.schema)
                    .then((file) => {
                        this.#schema = JSON.parse(file)['result'];
                    })
                    .catch(e => {
                        this.#reloadFiles();
                    })
                this.#files.getFile('localserver', 'game-data', fileIds.stickers)
                    .then((file) => {
                        this.#stickers = this.#formatAPIFile(JSON.parse(file));
                    })
                    .catch(e => {
                        this.#reloadFiles();
                    })
                this.#files.getFile('localserver', 'game-data', fileIds.graffiti)
                    .then((file) => {
                        this.#graffiti = this.#formatAPIFile(JSON.parse(file));
                    })
                    .catch(e => {
                        this.#reloadFiles();
                    })
            })
            .catch(e => {
                this.#reloadFiles();
            })
    }

    #reloadFiles() {
        this.#downloadFile(urls.items_game_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download items_game`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.items_game, file);

            this.#items_game = vdf.parse(file)['items_game'];
        })
        this.#downloadFile(urls.items_game_cdn_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download items_game_cdn`);
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.items_game_cdn, file)

            this.#items_game_cdn = this.#parseItemsCDN(file);
        })
        this.#downloadFile(urls.csgo_english_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download csgo_english`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.csgo_english, file);

            this.#csgo_english = this.#objectKeysToLowerCase(vdf.parse(file)['lang']['Tokens']);
            this.#csgo_english = new Proxy(this.#csgo_english, LanguageHandler);
        })
        this.#downloadFile(urls.schema_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download schema`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.schema, file);

            this.#schema = JSON.parse(file)['result'];
        })
        this.#downloadFile(urls.stickers_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download stickers.json`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.stickers, file);

            this.#stickers = this.#formatAPIFile(JSON.parse(file));
        })
        this.#downloadFile(urls.graffiti_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download stickers.json`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.graffiti, file);

            this.#graffiti = this.#formatAPIFile(JSON.parse(file));
        })
    }

    /*
        Given returned iteminfo, finds the item's min/max float, name, weapon type, and image url using CSGO game data
    */
    addAdditionalItemProperties(item: ItemData) {
        if (!this.#items_game || !this.#items_game_cdn || !this.#csgo_english) {
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

        // Get sticker codename/name
        const stickerKits = this.#items_game.sticker_kits;

        for (const sticker of item.stickers || []) {
            const kit = stickerKits[sticker.sticker_id];

            if (!kit) {
                continue;
            };

            let name = this.#csgo_english[kit.item_name.replace('#', '')];

            if (sticker.tint_id) {
                name += ` (${this.#csgo_english[`Attrib_SprayTintValue_${sticker.tint_id}`]})`;
            }

            if (name) sticker.name = name;

            let stickerFromAPI: StickerDataFromAPI;

            if (sticker.tint_id) {
                stickerFromAPI = this.#graffiti[`graffiti-${sticker.sticker_id}`];
            } else {
                stickerFromAPI = this.#stickers[`sticker-${sticker.sticker_id}`];
            }

            if (!stickerFromAPI) {
                continue;
            }

            sticker.image = stickerFromAPI.image;
            sticker.rarityname = stickerFromAPI.rarity ?? undefined;
            sticker.codename = kit.name;
            sticker.material = kit.sticker_material;
        }

        // Get the skin name
        let skin_name = '';

        if (item.paintindex in this.#items_game['paint_kits']) {
            skin_name = '_' + this.#items_game['paint_kits'][item.paintindex]['name'];

            if (skin_name == '_default') {
                skin_name = '';
            }
        }

        // Get the weapon name
        let weapon_name: string = '';

        if (item.defindex in this.#items_game['items']) {
            weapon_name = this.#items_game['items'][item.defindex]['name'];
        }

        // Get the image url
        if (item.defindex === 1348 || item.defindex === 1349) {
            item.additional.imageurl = this.#graffiti['graffiti-' + item.stickers[0].sticker_id].image;
        } else {
            let image_name = weapon_name + skin_name;

            if (image_name in this.#items_game_cdn) {
                item.additional.imageurl = this.#items_game_cdn[image_name];
            }
        }

        // Get the paint data and code name
        let code_name;
        let paint_data;

        if (item.paintindex in this.#items_game['paint_kits']) {
            code_name = this.#items_game['paint_kits'][item.paintindex]['description_tag'].replace('#', '');
            paint_data = this.#items_game['paint_kits'][item.paintindex];
        }

        // Get the min float
        if (paint_data && 'wear_remap_min' in paint_data) {
            item.additional.floatData.min = parseFloat(paint_data['wear_remap_min']);
        }
        else item.additional.floatData.min = 0.06;

        // Get the max float
        if (paint_data && 'wear_remap_max' in paint_data) {
            item.additional.floatData.max = parseFloat(paint_data['wear_remap_max']);
        }
        else item.additional.floatData.max = 0.8;

        let weapon_data: any;

        if (item.defindex in this.#items_game['items']) {
            weapon_data = this.#items_game['items'][item.defindex];
        }

        // Get the weapon_hud
        let weapon_hud: string = '';

        if (weapon_data && 'item_name' in weapon_data) {
            weapon_hud = weapon_data['item_name'].replace('#', '');
        } else {
            // need to find the weapon hud from the prefab
            if (item.defindex in this.#items_game['items']) {
                let prefab_val = this.#items_game['items'][item.defindex]['prefab'];
                weapon_hud = this.#items_game['prefabs'][prefab_val]['item_name'].replace('#', '');
            }
        }

        // Get the skin name if we can
        if (weapon_hud in this.#csgo_english && code_name in this.#csgo_english) {
            item.additional.weapon_type = this.#csgo_english[weapon_hud];
            item.additional.item_name = this.#csgo_english[code_name];
        }

        // Get the rarity name (Mil-Spec Grade, Covert etc...)
        const rarityKey = Object.keys(this.#items_game['rarities']).find((key) => {
            return parseInt(this.#items_game['rarities'][key]['value']) === item.rarity;
        });

        if (rarityKey) {
            const rarity = this.#items_game['rarities'][rarityKey];

            // Assumes weapons always have a float above 0 and that other items don't
            // TODO: Improve weapon check if this isn't robust
            item.additional.rarity_name = this.#csgo_english[rarity[item.paintwear > 0 ? 'loc_key_weapon' : 'loc_key']];
        }

        // Get the quality name (Souvenir, Stattrak, etc...)
        const qualityKey = Object.keys(this.#items_game['qualities']).find((key) => {
            return parseInt(this.#items_game['qualities'][key]['value']) === item.quality;
        }) || '';

        item.additional.quality_name = this.#csgo_english[qualityKey];

        // Get the origin name
        const origin = this.#schema['originNames'].find((o: any) => o.origin === item.origin);

        if (origin) {
            item.additional.origin_name = origin['name'];
        }

        // Get the wear name
        const wearName = this.getWearName(item.paintwear);

        if (wearName) {
            item.additional.wear_name = wearName;
        }

        const itemName = this.getFullItemName(item);

        if (itemName) {
            item.additional.full_item_name = itemName;
        }

        return item;
    }

    getWearName(float: number) {
        const f = floatNames.find((f) => float > f.range[0] && float <= f.range[1]);

        if (f) {
            return this.#csgo_english[f['name']];
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
            name += `${this.#csgo_english['strange']} `;
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

    /*
        Parses the data of items_game_cdn
    */
    #parseItemsCDN(data: string) {
        let lines = data.split('\n');

        const result: any = {};

        for (let line of lines) {
            let kv = line.split('=');

            if (kv[1]) {
                result[kv[0]] = kv[1];
            }
        }

        return result;
    }

    /*
        Calls toLowerCase on all object shallow keys, modifies in-place, not pure
     */
    #objectKeysToLowerCase(obj: any) {
        const keys = Object.keys(obj);
        let n = keys.length;
        while (n--) {
            const key = keys[n];
            const lower = key.toLowerCase();
            if (key !== lower) {
                obj[lower] = obj[key];
                delete obj[key];
            }
        }

        return obj;
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

    #formatAPIFile(data: StickerDataFromAPI[]) {
        let object: any = {};

        data.forEach(sticker => {
            object[sticker.id] = sticker;
        })

        return object;
    }
}
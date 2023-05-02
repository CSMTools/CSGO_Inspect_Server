import * as https from 'https';

import config from "../../../config.js";
import UserFileManager from "../files/userFiles.js";
import * as vdf from '../vdf-parser.js';
import { log } from '../util.js';

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
    schema_url: 'https://raw.githubusercontent.com/SteamDatabase/SteamTracking/b5cba7a22ab899d6d423380cff21cec707b7c947/ItemSchema/CounterStrikeGlobalOffensive.json'
}

const fileIds = {
    items_game: '0',
    items_game_cdn: '1',
    csgo_english: '2',
    schema: '3'
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
                return log(TAG, `Failed to download items_game_cdn`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.items_game_cdn, file)

            this.#items_game_cdn = this.#parseItemsCDN(file);
        })
        this.#downloadFile(urls.csgo_english_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download csgo_english`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.csgo_english, file)

            this.#csgo_english = this.#objectKeysToLowerCase(vdf.parse(file)['lang']['Tokens']);
            this.#csgo_english = new Proxy(this.#csgo_english, LanguageHandler);
        })
        this.#downloadFile(urls.schema_url, (file: string | null): void => {
            if (!file) {
                return log(TAG, `Failed to download schema`)
            }

            this.#files.saveFile('localserver', 'game-data', fileIds.schema, file)

            this.#schema = JSON.parse(file)['result'];
        })
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
}
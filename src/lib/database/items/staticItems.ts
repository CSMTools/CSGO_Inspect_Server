import { DopplerData } from "@csmtools/dopplerutils";
import type GameData from "./game-data";

type StaticSticker = {
    name: string;
    description: string;
    material: string;
    codename: string;
    image: string;
}

type StaticWeapon = {
    weaponName: string;
    skinName: string;
    rarity: number;
    rarityName: string;
    setImage: string;
    icon: string;
}

interface StaticWeaponReturnedForSearch {
    rarity: number;
    icon: string;
    defIndex: number;
    paintIndex: number;
}

export default class StaticItems {
    #gameData: GameData;
    paramsToSkinIconIndex: Record<`${number}:${number}`, string> = {};
    itemSearchFile: string = "";

    constructor(gameData: GameData) {
        this.#gameData = gameData;

        setTimeout(() => {
            gameData.cdn.on('ready', async () => {
                console.time("itemSearchFile")
                this.itemSearchFile = await this.#generateItemSearchFile();
                console.timeEnd("itemSearchFile")

                setInterval(async () => {
                    this.itemSearchFile = await this.#generateItemSearchFile();
                }, 60 * 60 * 1000) // 1 hour
            })
        }, 1000)
    }

    getSticker(stickerId: number): StaticSticker | undefined {
        const sticker: StaticSticker = {
            name: "",
            description: "",
            material: "",
            codename: "",
            image: ""
        };

        // Get sticker codename/name
        const stickerKits = this.itemsGame.sticker_kits;

        const kit = stickerKits[stickerId];

        if (!kit) {
            return;
        }

        let name = this.csEnglish[kit.item_name.substring(1)];

        if (name) {
            sticker.name = name;
        }

        let description = this.csEnglish[kit.description_string.substring(1)];

        if (description) {
            sticker.description = description;
        }

        sticker.codename = kit.name;
        sticker.material = kit.sticker_material;

        let image = this.cdn.getStickerURL(kit.sticker_material);

        if (image) {
            sticker.image = image;
        }

        return sticker;
    }

    getSkin(defIndex: number, paintIndex: number): StaticWeapon | undefined {
        const weapon: StaticWeapon = {
            weaponName: "",
            skinName: "",
            rarity: 0,
            rarityName: "",
            setImage: "",
            icon: this.paramsToSkinIconIndex[`${defIndex}:${paintIndex}`] ?? ""
        };

        const paintKits = this.itemsGame.paint_kits;

        const kit = paintKits[paintIndex];

        if (!kit) {
            return;
        }

        let weaponName = this.#gameData.getWeaponName(defIndex);
        let codeName = this.#gameData.getCodeName(paintIndex);
        let weaponData = this.#gameData.getWeaponData(defIndex);

        const { item_name, weapon_type } = this.#gameData.getEnglishWeaponName(defIndex, weaponData, codeName);

        weapon.weaponName = weapon_type;
        weapon.skinName = item_name;

        if (DopplerData[weapon.skinName]) {
            weapon.skinName += DopplerData[weapon.skinName][paintIndex]?.name ? ` (${DopplerData[weapon.skinName][paintIndex]?.name})` : "";
        }

        let set = this.#gameData.getSetBySkin(kit.name, weaponName);

        if (set) {
            // let setImage = this.#gameData.getSetIcon(set.set.original_name.replace("#CSGO_", ""));

            // if (setImage) {
            //     weapon.setImage = setImage;
            // }

            weapon.rarity = set.rarity;
        }

        return weapon;
    }

    async #generateItemSearchFile(): Promise<string/*Record<string, StaticWeaponReturnedForSearch>*/> {
        const result: Record<string, StaticWeaponReturnedForSearch | {
            baseUrl: string
        }> = {};
        const weaponToDefIndex: Record<string, number> = {};
        const paintKitToPaintIndex: Record<string, number> = {};

        for (let defIndex in this.#gameData.items_game['items']) {
            const name = this.#gameData.items_game['items'][defIndex]['name'];

            if (name.startsWith('weapon_')) {
                weaponToDefIndex[name] = parseInt(defIndex);
            }
        }

        for (let paintIndex in this.#gameData.items_game['paint_kits']) {
            const name = this.#gameData.items_game['paint_kits'][paintIndex]['name'];

            paintKitToPaintIndex[name.toLowerCase()] = parseInt(paintIndex);
        }

        const weapons = Object.keys(weaponToDefIndex);

        const itemsPattern = weapons.map((name) => name.slice(7)).filter((value) => {
            if (value === "knife") {
                return false;
            }
            if (value === "knife_t") {
                return false;
            }

            return true;
        }).sort((a, b) => {
            // Hoist m4a1_silencer to be above m4a1 to avoid matching issues.
            if (a === 'm4a1_silencer') {
                return -1;
            }

            if (b === 'm4a1_silencer') {
                return 1;
            }

            return 0;
        }).join("|");

        const extractBaseUrlRegex = /https?:\/\/.+default_generated\//;

        result['_meta'] = {
            baseUrl: (Object.values(this.#gameData.items_game_cdn as Record<string, string>))[0].match(extractBaseUrlRegex)?.[0] ?? ""
        }

        const pattern = "(weapon_(" + itemsPattern + "))(_(.+))?";
        const regex = new RegExp(pattern);

        const iconCleaner = /\\r$/g;

        for (let skin in this.#gameData.items_game_cdn) {
            if (!this.#gameData.items_game_cdn.hasOwnProperty(skin)) {
                continue;
            }

            // Ignore any vanilla weapons
            if (weapons.includes(skin)) {
                continue;
            }
            
            const icon = this.#gameData.items_game_cdn[skin];

            const match = skin.match(regex);

            if (!match) {
                continue;
            }

            const defIndex = weaponToDefIndex[match[1]];
            const paintIndex = paintKitToPaintIndex[match[4]];

            this.paramsToSkinIconIndex[`${defIndex}:${paintIndex}`] = icon;

            const staticWeapon = this.getSkin(defIndex, paintIndex);

            if (!staticWeapon) {
                console.log(`${defIndex}:${paintIndex}`, skin, icon);
                console.log('uh oh this shan\'t hast happent');

                continue;
            }

            result[staticWeapon.weaponName + " | " + staticWeapon.skinName] = {
                rarity: staticWeapon.rarity,
                icon: icon.replace(extractBaseUrlRegex, ''),
                defIndex,
                paintIndex
            };
        }

        return JSON.stringify(result).replace(iconCleaner, '');
    }

    get itemsGame() {
        return this.#gameData.cdn.itemsGame;
    }

    get itemsGameCDN() {
        return this.#gameData.cdn.itemsGameCDN;
    }

    get csEnglish() {
        return this.#gameData.cdn.csEnglish;
    }

    get cdn() {
        return this.#gameData.cdn;
    }
}
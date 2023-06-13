// These lines make "require" available
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import type GameData from "./game-data";

const { AcidFadeCalculator, AmberFadeCalculator, FadeCalculator } = require('csgo-fade-percentage-calculator');

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
}

export default class StaticItems {
    #gameData: GameData;

    constructor(gameData: GameData) {
        this.#gameData = gameData;
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
            setImage: ""
        };

        const paintKits = this.itemsGame.paint_kits;

        const kit = paintKits[paintIndex];

        if (!kit) {
            return;
        }

        let skinName = this.csEnglish[kit.description_tag.substring(1)];

        if (skinName) {
            weapon.skinName = skinName;
        }

        let weaponName = this.#gameData.getWeaponName(defIndex);

        if (weaponName) {
            weapon.weaponName = weaponName;
        }

        let set = this.#gameData.getSetBySkin(kit.name, weaponName)

        if (set) {
            let setImage = this.#gameData.getSetIcon(set.set.original_name.replace("#CSGO_", ""));

            if (setImage) {
                weapon.setImage = setImage;
            }

            weapon.rarity = set.rarity;
        }

        return weapon;
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
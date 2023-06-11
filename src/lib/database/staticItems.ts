// These lines make "require" available
import { createRequire } from "module";
import GameData from "./game-data";
const require = createRequire(import.meta.url);

const { AcidFadeCalculator, AmberFadeCalculator, FadeCalculator } = require('csgo-fade-percentage-calculator');

type StaticSticker = {
    name: string;
    description: string;
    material: string;
    codename: string;
    image: string;
}

export default class StaticItems {
    #gameData: GameData;

    constructor(gameData: GameData) {
        this.#gameData = gameData;
    }

    getStickers(stickerId: number): StaticSticker | undefined {
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

        let name = this.csEnglish[kit.item_name.replace('#', '')];

        if (name) {
            sticker.name = name;
        }

        let description = this.csEnglish[kit.description_string.replace('#', '')];

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
declare module 'csgo-cdn' {
    type config = {
        directory?: string,
        updateInterval?: number,
        stickers?: boolean,
        patches?: boolean,
        graffiti?: boolean,
        characters?: boolean,
        musicKits?: boolean,
        cases?: boolean,
        tools?: boolean,
        statusIcons?: boolean,
        logLevel?: 'error' | 'warn' | 'help' | 'data' | 'info' | 'debug' | 'prompt' | 'http' | 'verbose' | 'input' | 'silly'
    };
    type phases = {
        ruby: string;
        sapphire: string;
        blackpearl: string;
        emerald: string;
        phase1: string;
        phase2: string;
        phase3: string;
        phase4: string;
    }
    type phase = 'phase1' | 'phase' | 'phase3' | 'phase4' | 'emerald' | 'blackpearl' | 'sapphire' | 'ruby';
    export default class CSGOCdn extends EventEmitter {
        constructor(client: SteamUser, options?: config);
        getItemNameURL(marketHashName: string, phase?: phase): string;
        getStickerURL(stickerName: string, large?: boolean): string;
        getPatchURL(patchName: string, large?: boolean): string;
        getWeaponURL(defindex: string, paintindex: string): string;
        getGraffitiNameURL(marketHashName: string, large?: boolean): string;
        getMusicKitNameURL(marketHashName: string): string;
        isWeapon(marketHashName: string): boolean;
        itemsGame: any;
        csgoEnglish: any;
        itemsGameCDN: any;
        phase: phases;
    }
}
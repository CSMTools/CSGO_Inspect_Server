import SteamUser from "steam-user";
import csgoCDN from "csgo-cdn";

import type { config, phase } from "csgo-cdn";

export default class CDN extends csgoCDN {
    constructor(user: SteamUser) {
        super(user, { directory: 'files/data' });
    }

    getItemNameURL(marketHashName: string, phase?: phase): string {
        console.time('getUrl');
        let url = super.getItemNameURL(marketHashName, phase);
        console.timeEnd('getUrl');

        return url;
    }
}
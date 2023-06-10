import SteamUser from "steam-user";
import csgoCDN from "cs2-cdn";

import type { Config, Phase, PhaseValue } from "cs2-cdn";

export default class CDN extends csgoCDN {
    constructor(user: SteamUser) {
        super(user, { directory: 'files/data' });
    }

    getItemNameURL(marketHashName: string, phase?: PhaseValue): string | void {
        console.time('getUrl');
        let url = super.getItemNameURL(marketHashName, phase);
        console.timeEnd('getUrl');

        return url;
    }
}
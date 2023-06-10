import SteamUser from "steam-user";
import csgoCDN from "cs2-cdn";

import type { Config, Phase, PhaseValue } from "cs2-cdn";

export default class CDN extends csgoCDN {
    constructor(user: SteamUser) {
        super(user, { directory: 'files/data' });
    }
}
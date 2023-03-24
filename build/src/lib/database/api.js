import axios from 'axios';
export default class SteamAPI {
    #key;
    constructor(key) {
        this.#key = key;
    }
    getPlayerSummaries(ids) {
        return axios.request({
            method: "GET",
            url: `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.#key}&steamids=${ids.join(',')}`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
            }
        });
    }
}

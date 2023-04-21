import cheerio from 'cheerio';
import axios, { AxiosResponse } from 'axios';

import { SteamFriend } from '../../types/DataManagementTypes';
import { getHashByAvatarURL, log } from '../../util.js';
import SteamAPI from './api.js';

const TAG = '\x1b[33mWebScraper\x1b[0m'

export default class Scraper {

    constructor() {
        (async () => {
            let api = new SteamAPI({
                key: process.env.STEAM_API_KEY,
                proxyURL: process.env.ROTATING_PROXY_URL
            })

            await api.getPlayerInventory("76561198826153281", "730", "2").then((result) => {
                console.log(result.data);
            })
        })();
    }

    getFriends(steamId: string): Promise<SteamFriend[]> {
        return new Promise<SteamFriend[]>(async (resolve, reject) => {
            let friendsHTML = '';

            this.#fetchFriends(steamId)
                .then(async (response) => {
                    friendsHTML = response.data
                    const friendsList = await this.#friendsHtmlToJSON(friendsHTML, steamId);

                    resolve(friendsList);
                })
                .catch(async (err) => {
                    if (!err.response || err.response.status >= 500) {
                        const friendsList = await this.#rateLimitedFriendsHtmlToJSON(steamId);

                        resolve(friendsList);
                    } else {
                        log(TAG, `Error ${err.response.status} for ${steamId}`);

                        reject(err.response.status);
                    }
                });
        })
    }

    #fetchFriends(steamId: string): Promise<AxiosResponse<any, any>> {
        return axios.request({
            method: "GET",
            url: `https://steamcommunity.com/profiles/${steamId}/friends`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
            }
        });
    }

    #rateLimitedFriendsHtmlToJSON(steamId: string, number: number = 1): Promise<SteamFriend[]> {
        return new Promise((resolve, reject) => {
            log(TAG, 'Rate limit exceeded, waiting')

            setTimeout(async () => {
                log(TAG, 'Continuing')
                this.#fetchFriends(steamId)
                    .then(async (response) => {
                        resolve(await this.#friendsHtmlToJSON(response.data, steamId));
                    })
                    .catch(async (e) => {
                        resolve(await this.#rateLimitedFriendsHtmlToJSON(steamId, number + 1));
                    })
            }, 3000 * number)
        })
    }

    #friendsHtmlToJSON(html: string, steamId: string): Promise<SteamFriend[]> {
        return new Promise<SteamFriend[]>((resolve, reject) => {
            const friends: SteamFriend[] = [];

            const $ = cheerio.load(html, null, true);

            if ($('.search_results_none').attr('style') !== 'display:none') {
                return resolve(friends);
            }

            let elements = $('div.friend_block_v2');
            for (let element of elements) {
                let hash = getHashByAvatarURL($(`div[data-steamid=\'${element.attribs['data-steamid']}\'] > div.player_avatar > img`).attr()?.src || '');
                if (!hash) {
                    hash = '';
                }

                friends.push({
                    steamId: element.attribs['data-steamid'],
                    avatar_hash: hash
                })
            }

            resolve(friends);
        })
    }
}
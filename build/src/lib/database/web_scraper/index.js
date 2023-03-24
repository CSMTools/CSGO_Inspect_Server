import cheerio from 'cheerio';
import axios from 'axios';
import { getHashByAvatarURL, log } from '../../util.js';
const TAG = '\x1b[33mWebScraper\x1b[0m';
export default class Scraper {
    constructor() { }
    getFriends(steamId) {
        return new Promise(async (resolve, reject) => {
            let friendsHTML = '';
            this.#fetchFriends(steamId)
                .then(async (response) => {
                friendsHTML = response.data;
                const friendsList = await this.#friendsHtmlToJSON(friendsHTML, steamId);
                resolve(friendsList);
            })
                .catch(async (err) => {
                if (err.status === 502) {
                    const friendsList = await this.#rateLimitedFriendsHtmlToJSON(steamId);
                    resolve(friendsList);
                }
            });
        });
    }
    #fetchFriends(steamId) {
        return axios.request({
            method: "GET",
            url: `https://steamcommunity.com/profiles/${steamId}/friends`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
            }
        });
    }
    #rateLimitedFriendsHtmlToJSON(steamId, number = 1) {
        return new Promise((resolve, reject) => {
            log(TAG, 'Rate limit exceeded, waiting');
            setTimeout(async () => {
                log(TAG, 'Continuing');
                this.#fetchFriends(steamId)
                    .then(response => resolve(response.data))
                    .catch(async (e) => {
                    resolve(await this.#rateLimitedFriendsHtmlToJSON(steamId, number + 1));
                });
            }, 2000 * number);
        });
    }
    #friendsHtmlToJSON(html, steamId) {
        return new Promise((resolve, reject) => {
            const friends = [];
            const $ = cheerio.load(html, null, true);
            if ($('.search_results_none').attr('style') !== 'display:none') {
                resolve(friends);
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
                });
            }
            resolve(friends);
        });
    }
}

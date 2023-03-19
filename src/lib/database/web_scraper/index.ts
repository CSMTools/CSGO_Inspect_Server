import cheerio from 'cheerio';
import axios, { AxiosResponse } from 'axios';

import { SteamFriend } from '../../types/DataManagementTypes';
import { getHashByAvatarURL } from '../../util';


export default class Scraper {
    constructor() {}

    getFriends(steamId: string): Promise<SteamFriend[]> {
        return new Promise<SteamFriend[]>(async (resolve, reject) => {
            const friendsHTML = (await this.#fetchFriends(steamId)).data;
            const friendsList = await this.#friendsHtmlToJSON(friendsHTML);

            resolve(friendsList);
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

    #friendsHtmlToJSON(html: string): Promise<SteamFriend[]>{
        return new Promise<SteamFriend[]>((resolve, reject) => {
            const friends: SteamFriend[] = [];

            const $ = cheerio.load(html, null, true);
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
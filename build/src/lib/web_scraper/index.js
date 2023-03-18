import axios from 'axios';
export default class Scraper {
    constructor() { }
    getFriends(steamId) {
        axios.request({
            method: "GET",
            url: `https://steamcommunity.com/profiles/${steamId}/friends`,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
            }
        })
            .then(response => {
            console.log(response.data);
        });
    }
}

import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import HttpProxyAgent from 'http-proxy-agent';
import randUserAgent from "rand-user-agent";

/**
 * @param {string} key Steam API key
 */
type APIOptions = {
    key?: string,
    proxyURL: string,
    maxInventorySize?: number,
    language?: string
}

export default class SteamAPI {
    #key?: string;
    #agent: any;
    #proxyURL: string;
    maxInventorySize: number;
    language: string;

    constructor({ key, proxyURL, maxInventorySize = 1000, language = 'english' }: APIOptions) {
        this.#key = key;
        this.#proxyURL = proxyURL;
        this.#agent = HttpProxyAgent(proxyURL);
        this.maxInventorySize = maxInventorySize;
        this.language = language;
    }

    getPlayerSummaries(ids: string[]) {
        if (!this.#key) {
            throw new Error("No Steam API Key provided.")
        }

        return axios.request({
            method: "GET",
            url: `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.#key}&steamids=${ids.join(',')}`,
            headers: {
                "User-Agent": randUserAgent("desktop")
            }
        });
    }

    /**
     * Unoffical steam API endpoint to get the inventory of a player.
     * @param {string} steamId The steam id of the player.
     * @param {string} appId The Application ID of the game.
     * @param {string} contextId Context ID of the inventory, default for CS:GO is 2.
     */
    async getPlayerInventory(steamId: string, appId: string, contextId: string) {
        const ip = this.#randomIP();

        return axios.request({
            method: "GET",
            proxy: this.#proxyURLToObject(this.#proxyURL),
            withCredentials: false,
            url: `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}?l=${this.language}&count=${this.maxInventorySize}`,
            headers: {
                "User-Agent": randUserAgent("desktop"),
                "X-Client-IP": ip,
                "X-Remote-IP": ip,
                "X-Remote-Addr": ip,
            }
        });
    }

    #randomIP(): string {
        return (Math.floor(Math.random() * 255) + 1) + "." + (Math.floor(Math.random() * 255)) + "." + (Math.floor(Math.random() * 255)) + "." + (Math.floor(Math.random() * 255));
    }

    #proxyURLToObject(url: string): AxiosProxyConfig{
        let urlObj = new URL(url);

        console.log(urlObj);

        if (!urlObj.username.length) {
            return {
                protocol: urlObj.protocol.slice(0, -1),
                host: urlObj.hostname,
                port: parseInt(urlObj.port)
            }
        }

        return {
            protocol: urlObj.protocol.slice(0, -1),
            host: urlObj.hostname,
            port: parseInt(urlObj.port),
            auth: {
                username: urlObj.username,
                password: urlObj.password
            }
        }
    }
}
import axios, { AxiosResponse } from 'axios';
import { Proxy } from '../../types/ScraperTypes';
import { log } from '../../util.js';

const proxyscrape_proxy_list_urls = [
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=de&ssl=all&anonymity=elite,anonymous'
];

const TAG = '\x1b[33mWebScraperProxy\x1b[0m'

export class Queue {
    #proxies: Proxy[] = [];
    #proxiesToRemove: string[] = [];

    /*{
        proxyHost: number
    }*/
    #timesUsed: any = {};

    constructor() {
        setInterval(() => {
            this.#updateProxies();
        }, 120000)
    }

    async #updateProxies() {
        return new Promise(async (resolve, reject) => {
            this.#proxies = this.#proxies.concat(await this.#getProxyScrape());

            resolve(true);
        })
    }

    #getProxyScrape(): Promise<Proxy[]> {
        return new Promise((resolve, reject) => {
            const promises: Promise<AxiosResponse<string, any>>[] = [];

            proxyscrape_proxy_list_urls.forEach((url) => {
                promises.push(axios.request({
                    method: "GET",
                    url,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
                    }
                }));
            })

            Promise.all(promises).then((responses) => {
                let proxies: Proxy[] = [];

                responses.forEach((response) => {
                    response.data.split('\n').forEach((line) => {
                        if (!line.length) {
                            return;
                        }

                        let url = new URL('http://' + line);

                        proxies.push({
                            protocol: url.protocol,
                            host: url.hostname,
                            port: url.port
                        })
                    })
                })

                resolve(proxies);
            })
        })
    }

    removeProxy(proxy: Proxy) {
        this.#proxies = this.#proxies.filter(function (e) {
            return `${e.host}${e.port !== "" ? `:${e.port}` : ''}` !== `${proxy.host}${proxy.port !== "" ? `:${proxy.port}` : ''}`
        });
    }

    async getNextInQueue(): Promise<Proxy | null> {
        let proxy = this.#proxies.shift();

        if (!proxy) {
            await this.#updateProxies();

            proxy = this.#proxies.shift();
        }

        if (!proxy) {
            log(TAG, "No proxies available");
            return null;
        }

        //Adds one to this.#timesUsed[proxy.host] or sets it to 1 if it doesn't exist
        this.#timesUsed[proxy.host] = typeof this.#timesUsed[proxy.host] === 'number' ? this.#timesUsed[proxy.host] + 1 : 1;

        if (this.#timesUsed[proxy.host] < 100) {
            this.#proxies.push(proxy);
        }

        return proxy;
    }
}

/** Instance of Queue, use this. */
export const queue = new Queue;
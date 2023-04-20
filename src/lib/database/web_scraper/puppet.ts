import puppeteer, { Browser, Page } from 'puppeteer';
import useProxy from 'puppeteer-page-proxy';
import { queue } from './proxy_queue.js';

import { Proxy, UYItem } from '../../types/ScraperTypes';

const TAG = '\x1b[33mWebScraperPuppet\x1b[0m'

const getItemsScript =
`const ownerId = '$INSERT_OWNER_ID;'
if (document.querySelector('.inventory_msg_content').textContent.trim().endsWith('inventory is currently private.')) {
    return [];
}

function formatLink(link, assetId) {
    return link.replace("%owner_steamid%", ownerId).replace("%assetid%", assetId);
}

function itemsToArray(items) {
    let array = [];

    if (!Object.keys(items).length) {
        return array;
    }

    for (let i in items) {
        let item = items[i];

        array.push({
            assetid: item.assetid,
            description: {
                inspectLink: item.description.commodity === 0 && item.description.currency === 0 ? formatLink(item.description.actions[0].link, item.assetid) : null,
                commodity: number,
                currency: number
            }
        })
    }

    return array;
}

return itemsToArray(UserYou.getInventory(730, 2).m_rgAssets);`

export default class Puppet {
    #currentProxy?: Proxy;

    /** {
     *      HOST: {
     *          count: number,
     *          removedTime: date/number
     *      }
     * }*/
    #usedProxyCount: any = {};
    #browser?: Browser;
    #page?: Page;

    constructor() {
        this.#init();
    }

    async #init() {
        this.#browser = await puppeteer.launch({
            executablePath: process.env.CHROME_EXECUTABLE_PATH,
            headless: true,
            ignoreDefaultArgs: ['--disable-extensions']
        });

        this.#page = await this.#browser.newPage();
    }

    async getInventory(steamId: string): Promise<UYItem[]> {
        let proxy = this.#currentProxy;
        let page = this.#page;

        if (!page) {
            throw new Error('No page instance found.');
        }

        if (!proxy || (this.#usedProxyCount[proxy.host].count && this.#usedProxyCount[proxy.host].count === 5)) {
            proxy = await this.#getNewProxy();

            console.log(`${proxy.protocol}//${proxy.host}${proxy.port !== "" ? `:${proxy.port}` : ''}`);
            useProxy(page, `${proxy.host}${proxy.port !== "" ? `:${proxy.port}` : ''}`);
        }

        this.#usedProxyCount[proxy.host].count++;

        try {
            await page.goto(`https://steamcommunity.com/profiles/${steamId}/inventory`);

            return (await this.#getInventoryFromPage(page, steamId));
        } catch(e) {
            console.log(e);
            queue.removeProxy(proxy);
            this.#currentProxy = undefined;

            return this.getInventory(steamId);
        }
    }

    async #getInventoryFromPage(page: Page, steamId: string): Promise<UYItem[]> {
        let exists = await page.evaluate(`return typeof UserYou !== 'undefined';`)

        if (!exists) {
            throw new Error("Page doesn't have UserYou variable, aborting.")
        }

        let items = await page.evaluate(getItemsScript.replace("$INSERT_OWNER_ID;", steamId));

        return items as UYItem[];
    }

    async #getNewProxy(): Promise<Proxy> {
        let proxy = await queue.getNextInQueue();

        if (!proxy) {
            throw new Error('No proxies available.')
        }

        if (this.#usedProxyCount[proxy.host]) {
            // To use again at least 12h must pass
            if (this.#usedProxyCount[proxy.host].removedTime > (Date.now() - 43200000)) {
                return (await this.#getNewProxy());
            } else {
                delete this.#usedProxyCount[proxy.host];
            }
        }

        this.#currentProxy = proxy;

        this.#usedProxyCount[proxy.host] = {
            count: 0,
            removedTime: 0
        }

        return proxy;
    }
}
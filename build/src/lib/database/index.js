import { PrismaClient } from '@prisma/client';
import Scraper from './web_scraper/index.js';
import { log } from '../util.js';
const prisma = new PrismaClient();
const TAG = '\x1b[31mDATABASE\x1b[0m';
export default class DataManager {
    requestsToday = 0;
    #steamApiKey;
    #botMaster;
    #scraper;
    constructor(steamApiKey, botMaster) {
        this.#steamApiKey = steamApiKey;
        this.#botMaster = botMaster;
        this.#scraper = new Scraper();
        this.#init();
    }
    #init() {
        prisma.steam_users.findFirst().then(async (user) => {
            if (!user) {
                log(TAG, 'Creating first user');
                try {
                    await prisma.steam_users.create({
                        data: {
                            steam_id: '76561197960266237',
                            avatar_hash: 'a627d3c0e9fe310d6ce9538c3594376522acbb00',
                            last_update: Date.now(),
                            checked_friends: false
                        }
                    });
                    log(TAG, 'Created first user');
                }
                catch (e) {
                    console.log(e);
                }
            }
            //this.get100UsersFriends();
            /*setInterval(() => {
              this.get100UsersFriends();
            }, 600000)*/
        });
    }
    getInventory(steamId) {
    }
    async get100UsersFriends() {
        log(TAG, "Collecting friends of up to 100 users");
        let users = await prisma.steam_users.findMany({
            where: {
                checked_friends: {
                    equals: false
                }
            },
            take: 100
        });
        log(TAG, `Collecting friends of ${users.length} users`);
        if (!users) {
            log(TAG, "No friends to collect");
            return;
        }
        for (const user of users) {
            let friends = [];
            (await this.getFriendsOfUser(user.steam_id)).forEach((friend) => {
                friends.push({
                    steam_id: friend.steamId,
                    avatar_hash: friend.avatar_hash,
                    last_update: Date.now(),
                    checked_friends: false
                });
            });
            if (!friends.length) {
                await prisma.steam_users.update({
                    where: {
                        steam_id: user.steam_id
                    },
                    data: {
                        checked_friends: true
                    }
                });
                continue;
            }
            try {
                await prisma.steam_users.createMany({
                    data: friends,
                    skipDuplicates: true
                });
                await prisma.steam_users.update({
                    where: {
                        steam_id: user.steam_id
                    },
                    data: {
                        checked_friends: true
                    }
                });
                log(TAG, user.steam_id);
            }
            catch (err) {
                console.error(err);
            }
        }
        log(TAG, 'Finished collecting friends');
    }
    async getFriendsOfUser(steamId) {
        return new Promise(async (resolve, reject) => {
            try {
                let friends = await this.#scraper.getFriends(steamId);
                resolve(friends);
            }
            catch (e) {
                resolve([]);
            }
        });
    }
}

import BotMaster from './lib/bot/master.js';
import DataManager from './lib/database/index.js';
import config from '../config.js';
export default function router(fastify) {
    const botMaster = new BotMaster(config.logins, config.bot_settings);
    const dataManager = new DataManager(process.env.STEAM_API_KEY, botMaster);
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' });
    });
    fastify.get('/inspect', async function (request, reply) {
        if (request.query.link) {
            try {
                reply.send(await botMaster.inspectItem(request.query.link));
            }
            catch (e) {
                reply.send(e);
            }
        }
        else {
            reply.send({});
        }
    });
    if (config.enable_bulk_requests) {
        fastify.get('/inspect/bulk', async function (request, reply) {
            if (config.bulk_key && !request.query.key) {
                return reply.send({
                    error: "No key provided."
                });
            }
            if (request.query.links) {
                let links = request.query.links.split(',');
                if (links.length > config.max_bulk_amount) {
                    return reply.send({
                        error: "Max link amount exceeded."
                    });
                }
                reply.send(await botMaster.inspectItemBulk(links));
            }
            else {
                reply.send({});
            }
        });
    }
}

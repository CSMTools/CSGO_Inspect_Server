import BotMaster from './lib/bot/master.js';
import config from '../config.js';
export default function router(fastify) {
    const botMaster = new BotMaster(config.logins, config.bot_settings);
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' });
    });
    fastify.get('/inspect', async function (request, reply) {
        if (request.query.link) {
            reply.send(await botMaster.inspectItem(request.query.link));
        }
        else {
            reply.send({});
        }
    });
}

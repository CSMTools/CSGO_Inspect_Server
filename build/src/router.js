import Bot from './lib/bot/bot.js';
import config from '../config.js';
const bot = new Bot(config.bot_settings);
bot.login(config.logins[0].user, config.logins[0].pass, config.logins[0].auth);
export default function router(fastify) {
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' });
    });
    fastify.get('/inspect', async function (request, reply) {
        if (request.query.link) {
            reply.send(await bot.sendFloatRequest(request.query.link));
        }
        else {
            reply.send({});
        }
    });
}

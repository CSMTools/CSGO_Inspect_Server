export default function Index(fastify, botMaster) {
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' });
    });
}

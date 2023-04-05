export default function inspect(fastify, botMaster) {
    fastify.get('/inspect', async function (request, reply) {
        if (request.query.link) {
            try {
                reply.send(await botMaster.inspectItem(request.query.link));
            }
            catch (e) {
                reply.status(500).send({
                    code: 500,
                    message: e
                });
            }
        }
        else {
            reply.send({});
        }
    });
}

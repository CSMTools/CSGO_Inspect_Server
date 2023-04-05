export default function inspect(fastify, fileManager) {
    fastify.get('/files/get', async function (request, reply) {
        const { userId, type, fileId } = request.query;
        if (!userId || !type || !fileId) {
            reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            });
        }
        try {
            const contents = await fileManager.getFile(userId, type, fileId);
            reply.status(200).send({
                contents
            });
        }
        catch (err) {
            reply.status(500).send({
                code: 500,
                message: err
            });
        }
    });
}

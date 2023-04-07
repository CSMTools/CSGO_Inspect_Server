export default function get(fastify, fileManager) {
    fastify.get('/files/getList', async function (request, reply) {
        const { userId, type } = request.query;
        if (!userId || !type) {
            reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            });
        }
        try {
            const list = await fileManager.getFileList(userId, type);
            reply.status(200).send({
                list
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

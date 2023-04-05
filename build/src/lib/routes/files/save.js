export default function inspect(fastify, fileManager) {
    fastify.get('/files/save', async function (request, reply) {
        const { userId, type, fileId, contents } = request.query;
        if (!userId || !type || !contents) {
            reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            });
        }
        try {
            const fileId_ = await fileManager.saveFile(userId, type, (fileId ? fileId : null), contents);
            reply.status(200).send({
                fileId: fileId_
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

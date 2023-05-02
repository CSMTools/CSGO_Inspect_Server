import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'

interface SaveBody {
    userId: string;
    type: string;
    fileId?: string;
    contents: string | Buffer;
}

export default function save(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.post<{
        Body: SaveBody
    }>('/files/save', async function (request, reply) {
        const { userId, type, fileId, contents } = request.body;

        if (!userId || !type || !contents) {
            return reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            })
        }

        if (userId === 'localsystem') {
            return reply.status(400).send({
                code: 400,
                message: 'Invalid userId: localsystem'
            })
        }

        try {
            const fileId_ = await fileManager.saveFile(userId, type, (fileId ? fileId : null), contents);

            reply.status(200).send({
              fileId: fileId_
            })
        } catch (err) {
            console.log(err);
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
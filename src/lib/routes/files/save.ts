import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'

interface SaveQuerystring {
    userId: string;
    type: string;
    contents: string | Buffer;
}

export default function inspect(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.get<{
        Querystring: SaveQuerystring
    }>('/files/save', async function (request, reply) {
        const { userId, type, contents } = request.query;

        if (!userId || !type || !contents) {
            reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            })
        }

        try {
            const fileId = await fileManager.saveFile(userId, type, contents);

            reply.status(200).send({
              fileId
            })
        } catch (err) {
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'

interface GetQuerystring {
    userId: string;
    type: string;
    fileId: string;
}

export default function get(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.get<{
        Querystring: GetQuerystring
    }>('/files/get', async function (request, reply) {
        const { userId, type, fileId } = request.query;

        if (!userId || !type || !fileId) {
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
            const contents = await fileManager.getFile(userId, type, fileId);

            reply.status(200).send({
              contents
            })
        } catch (err) {
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
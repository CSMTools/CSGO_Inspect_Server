import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'

interface GetQuerystring {
    userId: string;
    type: string;
}

export default function get(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.get<{
        Querystring: GetQuerystring
    }>('/files/getList', async function (request, reply) {
        const { userId, type } = request.query;

        if (!userId || !type) {
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
            const list = await fileManager.getFileList(userId, type);

            reply.status(200).send({
              list
            })
        } catch (err) {
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
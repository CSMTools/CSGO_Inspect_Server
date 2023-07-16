import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'
import { GetFileListResponse } from "@csmtools/types";

interface GetQuerystring {
    userId: string;
    type: string;
}

export default function get(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.get<{
        Querystring: GetQuerystring,
        Reply: GetFileListResponse
    }>('/files/getList', async function (request, reply) {
        const { userId, type } = request.query;

        if (!userId || !type) {
            return reply.status(400).send({
                data: null,
                errors: ['Missing parameter(s).']
            })
        }

        if (userId === 'localsystem') {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid userId: localsystem']
            })
        }

        try {
            const list = await fileManager.getFileList(userId, type);

            reply.status(200).send({
                data: {
                    list
                },
                errors: []
            })
        } catch (err) {
            reply.status(500).send({
                data: null,
                errors: [(err as string).toString()]
            })
        }
    })
}
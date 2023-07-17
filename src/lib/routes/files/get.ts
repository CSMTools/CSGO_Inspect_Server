import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'
import { GetFileResponse } from "@csmtools/types";

interface GetQuerystring {
    userId: string;
    type: string;
    fileId: string;
}

export default function get(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.get<{
        Querystring: GetQuerystring,
        Reply: GetFileResponse
    }>('/files/get', async function (request, reply) {
        const { userId, type, fileId } = request.query;

        if (!userId || !type || !fileId) {
            return reply.status(400).send({
                data: null,
                errors: ['Missing parameter(s).']
            })
        }

        if (isNaN(parseInt(userId))) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid parameter: userId']
            })
        }

        try {
            const contents = await fileManager.getFile(userId, type, fileId);

            reply.status(200).send({
                data: {
                    content: contents
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
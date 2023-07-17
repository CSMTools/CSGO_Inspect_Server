import { FastifyInstance } from "fastify"

import UserFileManager from '../../files/userFiles.js'
import { SaveFileResponse } from "@csmtools/types";

interface SaveBody {
    userId: string;
    type: string;
    fileId?: string;
    contents: string | Buffer;
}

export default function save(fastify: FastifyInstance, fileManager: UserFileManager) {
    fastify.post<{
        Body: SaveBody,
        Reply: SaveFileResponse
    }>('/files/save', async function (request, reply) {
        const { userId, type, fileId, contents } = request.body;

        if (!userId || !type || !contents) {
            return reply.status(400).send({
                data: null,
                errors: ['Missing parameter(s).']
            })
        }

        if (isNaN(parseInt(userId))) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid userId']
            })
        }

        try {
            const fileId_ = await fileManager.saveFile(userId, type, (fileId ? fileId : null), contents);

            reply.status(200).send({
                data: {
                    fileId: fileId_
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
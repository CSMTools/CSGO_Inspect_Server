import { FastifyInstance } from "fastify"

import type BotMaster from '../bot/master.js'
import type { BotsStatusResponse } from "@csmtools/types"

export default function Status(fastify: FastifyInstance, botMaster: BotMaster) {
    fastify.get<{
        Reply: BotsStatusResponse
    }>('/status', function (_request, reply) {
        try {
            reply.send({
                data: botMaster.getStats(),
                errors: []
            });
        } catch(e) {
            reply.status(500).send({
                data: null,
                errors: [(e as string).toString()]
            })
        }
    })
}
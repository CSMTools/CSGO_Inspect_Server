import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import config from "../../../../config.js"

interface InspectQuerystring {
    link: string
}

export default function inspect(fastify: FastifyInstance, botMaster: BotMaster) {
    if (config.enabled_modules.file_storage) {
        
    }
    
    fastify.get<{
        Querystring: InspectQuerystring
    }>('/inspect', async function (request, reply) {
        if (request.query.link) {
            try {
                reply.send(await botMaster.inspectItem(request.query.link))
            } catch (e) {
                reply.status(500).send({
                    code: 500,
                    message: e
                })
            }
        } else {
            reply.status(400).send({
                code: 400,
                message: "No link provided."
            })
        }
    })
}
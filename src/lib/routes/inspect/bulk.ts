import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import config from "../../../../config.js"

interface BulkInspectQuerystring {
    links: string,
    key?: string
}

export default function inspect(fastify: FastifyInstance, botMaster: BotMaster) {
    if (config.enable_bulk_requests) {
        fastify.get<{
            Querystring: BulkInspectQuerystring
        }>('/inspect/bulk', async function (request, reply) {
            if (config.bulk_key && !request.query.key) {
                return reply.send({
                    error: "No key provided."
                });
            }
            if (request.query.links) {
                let links = request.query.links.split(',');

                if (links.length > config.max_bulk_amount) {
                    return reply.send({
                        error: "Max link amount exceeded."
                    });
                }
                reply.send(await botMaster.inspectItemBulk(links))
            } else {
                reply.send({})
            }
        })
    }
}
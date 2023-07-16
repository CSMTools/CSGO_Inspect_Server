import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import config from "../../../../config.js"
import { BulkInspectResponse, ItemData } from "@csmtools/types"

interface BulkInspectQuerystring {
    links: string,
    key?: string,
    additional?: string
}

export default function inspect(fastify: FastifyInstance, botMaster: BotMaster) {
    if (config.enable_bulk_requests) {
        fastify.get<{
            Querystring: BulkInspectQuerystring,
            Reply: BulkInspectResponse
        }>('/inspect/bulk', async function (request, reply) {
            if (config.bulk_key && !request.query.key) {
                return reply.status(401).send({
                    data: null,
                    errors: ["No key provided."]
                });
            }

            if (config.bulk_key && config.bulk_key !== request.query.key) {
                return reply.status(401).send({
                    data: null,
                    errors: ["Invalid key provided."]
                })
            }

            if (request.query.links) {
                let links = request.query.links.split(',');

                if (links.length > (config.max_bulk_amount ?? (botMaster.botsAvailable / 2))) {
                    return reply.status(400).send({
                        data: null,
                        errors: ["Max link amount exceeded."]
                    });
                }

                if (links.length < 2) {
                    return reply.status(400).send({
                        data: null,
                        errors: ["Only use this endpoint for bulk requests."]
                    });
                }

                let items: ItemData[];

                if (request.query.additional && request.query.additional === 'true') {
                    items = await botMaster.inspectItemBulk(links, true);
                } else {
                    items = await botMaster.inspectItemBulk(links);
                }
                
                reply.send({
                    data: items,
                    errors: []
                });
            } else {
                reply.status(400).send({
                    data: null,
                    errors: ['Invalid links.']
                })
            }
        })
    }
}
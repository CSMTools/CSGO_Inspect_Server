import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import { InspectResponse, ItemData } from "@csmtools/types"

interface InspectQuerystring {
    link: string,
    additional?: string
}

export default function inspect(fastify: FastifyInstance, botMaster: BotMaster) {
    fastify.get<{
        Querystring: InspectQuerystring,
        Reply: InspectResponse
    }>('/inspect', async function (request, reply) {
        if (request.query.link) {
            try {
                let item: ItemData;

                if (request.query.additional && request.query.additional === 'true') {
                    item = await botMaster.inspectItem(request.query.link, true);
                } else {
                    item = await botMaster.inspectItem(request.query.link);
                }

                reply.send({
                    data: item,
                    errors: []
                });

            } catch (e) {
                console.log(e)
                reply.status(500).send({
                    data: null,
                    errors: [(e as string).toString()]
                })
            }
        } else {
            reply.status(400).send({
                data: null,
                errors: ["No link provided."]
            })
        }
    })
}
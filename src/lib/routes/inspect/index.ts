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
        if (!request.query.link) {
            return reply.status(400).send({
                data: null,
                errors: ["No link provided."]
            })
        }

        if (!/steam:\/\/rungame\/730\/\d+\/(\+|\s)csgo_econ_action_preview(\s|%20)(S|M)\d+A\d+D\d+/.test(request.query.link)) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid parameter: link']
            })
        }

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
    })
}
import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import config from "../../../../config.js"
import { ItemData } from "../../types/BotTypes.js"

interface InspectQuerystring {
    link: string,
    additional?: string
}
let i = 0;

export default function inspect(fastify: FastifyInstance, botMaster: BotMaster) {
    if (config.enabled_modules.file_storage) {
        
    }
    
    fastify.get<{
        Querystring: InspectQuerystring
    }>('/inspect', async function (request, reply) {
        i++;
        console.log("count",i);
        if (request.query.link) {
            console.log("count",i);
            try {
                let item: ItemData;

                if (request.query.additional && request.query.additional === 'true') {
                    item = await botMaster.inspectItem(request.query.link, true);
                } else {
                    item = await botMaster.inspectItem(request.query.link);
                }

                reply.send(item);

            } catch (e) {
                console.log(e)
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
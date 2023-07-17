import { FastifyInstance } from "fastify"

import BotMaster from '../../bot/master.js'
import config from "../../../../config.js"
import { BulkInspectResponse, ItemData } from "@csmtools/types"

interface BulkInspectQuerystring {
    links: string,
    key?: string,
    additional?: string
}

export default function inspectBulk(fastify: FastifyInstance, botMaster: BotMaster) {
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

                let promises: (Promise<ItemData> | string)[] = [];

                for (let link of links) {
                    if (!/steam:\/\/rungame\/730\/\d+\/(\+|\s)csgo_econ_action_preview(\s|%20)(S|M)\d+A\d+D\d+/.test(link)) {
                        promises.push('Invalid link.');
                    }

                    promises.push(botMaster.inspectItem(link, request.query.additional === 'true' ? true : false));
                }

                let results: (ItemData | undefined)[] = [];
                let errors: string[] = [];

                (await Promise.allSettled(promises)).forEach((result) => {
                    let value: string | ItemData;
                    if (result.status === "fulfilled") {
                        value = result.value;
                    } else {
                        value = result.reason.toString();
                    }

                    if (typeof value === 'string') {
                        errors.push(value);
                    } else {
                        results.push(value);
                    }
                })

                reply.send({
                    data: results,
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
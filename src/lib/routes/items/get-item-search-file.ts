import { FastifyInstance } from "fastify"
import StaticItems from "../../database/items/staticItems";

export default function getItemSearchFile(fastify: FastifyInstance, items: StaticItems) {
    fastify.get<{
        Reply: any
    }>('/items/get-item-search-file', async function (request, reply) {
        try {
            const file = items.itemSearchFile;

            if (!file) {
                return reply.status(404).send({
                    data: null,
                    errors: ['No file found.']
                })
            }

            reply.status(200).send(file)
        } catch (err) {
            console.log(err);
            reply.status(500).send({
                data: null,
                errors: [(err as string).toString()]
            })
        }
    })
}
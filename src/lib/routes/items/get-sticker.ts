import { FastifyInstance } from "fastify"
import StaticItems from "../../database/staticItems";

interface GetQuerystring {
    stickerId: string;
}

export default function getSticker(fastify: FastifyInstance, items: StaticItems) {
    fastify.get<{
        Querystring: GetQuerystring
    }>('/items/get-sticker', async function (request, reply) {
        const { stickerId } = request.query;

        if (!stickerId) {
            return reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            })
        }

        if (stickerId.match(/\D/)) {
            return reply.status(400).send({
                code: 400,
                message: 'Invalid stickerId.'
            })
        }

        try {
            const sticker = items.getSticker(parseInt(stickerId, 10));

            if (!sticker) {
                return reply.status(404).send({
                    code: 404,
                    message: 'No sticker found.'
                })
            }

            reply.status(200).send({
                sticker
            })
        } catch (err) {
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
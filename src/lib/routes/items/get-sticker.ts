import { FastifyInstance } from "fastify"
import StaticItems from "../../database/items/staticItems";
import { StaticStickerResponse } from "@csmtools/types";

interface GetQuerystring {
    stickerId: string;
}

export default function getSticker(fastify: FastifyInstance, items: StaticItems) {
    fastify.get<{
        Querystring: GetQuerystring,
        Reply: StaticStickerResponse
    }>('/items/get-sticker', async function (request, reply) {
        const { stickerId } = request.query;

        if (!stickerId) {
            return reply.status(400).send({
                data: null,
                errors: ['Missing parameter(s).']
            })
        }

        if (stickerId.match(/\D/)) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid stickerId.']
            })
        }

        try {
            const sticker = items.getSticker(parseInt(stickerId, 10));

            if (!sticker) {
                return reply.status(404).send({
                    data: null,
                    errors: ['No sticker found.']
                })
            }

            reply.status(200).send({
                data: sticker,
                errors: []
            })
        } catch (err) {
            reply.status(500).send({
                data: null,
                errors: [(err as string).toString()]
            })
        }
    })
}
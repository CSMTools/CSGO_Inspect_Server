import { FastifyInstance } from "fastify"
import StaticItems from "../../database/items/staticItems";
import { StaticWeaponResponse } from "@csmtools/types";

interface GetQuerystring {
    defIndex: string;
    paintIndex: string;
}

export default function getSkin(fastify: FastifyInstance, items: StaticItems) {
    fastify.get<{
        Querystring: GetQuerystring,
        Reply: StaticWeaponResponse
    }>('/items/get-skin', async function (request, reply) {
        const { defIndex, paintIndex } = request.query;

        if (!defIndex || !paintIndex) {
            return reply.status(400).send({
                data: null,
                errors: ['Missing parameter(s).']
            })
        }

        if (defIndex.match(/\D/)) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid defIndex.']
            })
        }

        if (paintIndex.match(/\D/)) {
            return reply.status(400).send({
                data: null,
                errors: ['Invalid paintIndex.']
            })
        }

        try {
            const weapon = items.getSkin(parseInt(defIndex, 10), parseInt(paintIndex, 10));

            if (!weapon) {
                return reply.status(404).send({
                    data: null,
                    errors: ['No skin found.']
                })
            }

            reply.status(200).send({
                data: weapon,
                errors: []
            })
        } catch (err) {
            console.log(err);
            reply.status(500).send({
                data: null,
                errors: [(err as string).toString()]
            })
        }
    })
}
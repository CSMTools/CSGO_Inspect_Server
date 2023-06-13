import { FastifyInstance } from "fastify"
import StaticItems from "../../database/staticItems";

interface GetQuerystring {
    defIndex: string;
    paintIndex: string;
}

export default function getSkin(fastify: FastifyInstance, items: StaticItems) {
    fastify.get<{
        Querystring: GetQuerystring
    }>('/items/get-skin', async function (request, reply) {
        const { defIndex, paintIndex } = request.query;

        if (!defIndex || !paintIndex) {
            return reply.status(400).send({
                code: 400,
                message: 'Missing parameter(s).'
            })
        }

        if (defIndex.match(/\D/)) {
            return reply.status(400).send({
                code: 400,
                message: 'Invalid defIndex.'
            })
        }

        if (paintIndex.match(/\D/)) {
            return reply.status(400).send({
                code: 400,
                message: 'Invalid paintIndex.'
            })
        }

        try {
            const weapon = items.getSkin(parseInt(defIndex, 10), parseInt(paintIndex, 10));

            if (!weapon) {
                return reply.status(404).send({
                    code: 404,
                    message: 'No skin found.'
                })
            }

            reply.status(200).send({
                weapon
            })
        } catch (err) {
            console.log(err);
            reply.status(500).send({
                code: 500,
                message: err
            })
        }
    })
}
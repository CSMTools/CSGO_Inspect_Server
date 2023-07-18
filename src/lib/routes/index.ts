import { FastifyInstance } from "fastify"

export default function Index(fastify: FastifyInstance) {
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' })
    })
}
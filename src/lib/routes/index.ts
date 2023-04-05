import { FastifyInstance } from "fastify"

import BotMaster from '../bot/master.js'

export default function Index(fastify: FastifyInstance, botMaster: BotMaster) {
    fastify.get('/', function (request, reply) {
        reply.send({ hello: 'world' })
    })
}
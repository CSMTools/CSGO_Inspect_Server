import { FastifyInstance } from 'fastify'

import BotMaster from './lib/bot/master.js'

import config from '../config.js'

interface IQuerystring {
  link: string
}

export default function router(fastify: FastifyInstance) {
  const botMaster = new BotMaster(config.logins, config.bot_settings)

  fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.get<{
    Querystring: IQuerystring
  }>('/inspect', async function (request, reply) {
    if (request.query.link) {
      reply.send(await botMaster.inspectItem(request.query.link))
    } else {
      reply.send({})
    }
  })
}
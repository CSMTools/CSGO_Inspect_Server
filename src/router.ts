import { FastifyInstance } from 'fastify'

import Bot from './lib/bot/bot.js'

import config from '../config.js'

const bot = new Bot(config.bot_settings)

bot.login(config.logins[0].user, config.logins[0].pass, config.logins[0].auth)

bot.on('ready', async () => {
  console.log('owo')
  let res = await bot.sendFloatRequest('steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198826153281A28987979727D13835621694651971647')
  console.log(res)
})

interface IQuerystring {
  link: string
}

export default function router(fastify: FastifyInstance) {
  fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.get<{
    Querystring: IQuerystring
  }>('/inspect', async function (request, reply) {
    if (request.query.link) {
      reply.send(await bot.sendFloatRequest(request.query.link))
    } else {
      reply.send({})
    }
  })
}
import * as dotenv from 'dotenv'
dotenv.config()

import router from './src/router.js'

import config from './config.js'

import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

router(fastify)

fastify.listen({ port: config.http.port }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
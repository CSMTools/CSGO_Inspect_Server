import * as dotenv from 'dotenv'
dotenv.config()

import router from './src/router.js'

import config from './config.js'

import Fastify from 'fastify'

(async () => {
  const fastify = Fastify({
    logger: true
  })

  if (config.rate_limit.enable) {
    await fastify.register(import('@fastify/rate-limit'), config.rate_limit);
  }
  
  await router(fastify)
  
  fastify.listen({ port: config.http.port }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  })
})();
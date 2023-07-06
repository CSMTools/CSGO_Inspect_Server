import * as dotenv from 'dotenv'
dotenv.config()

import router from './src/router.js'

import config from './config.js'

import Fastify from 'fastify'
import fs from 'fs'

(async () => {
  const fastify = Fastify({
    logger: true
  })

  if (config.rate_limit.enable) {
    await fastify.register(import('@fastify/rate-limit'), config.rate_limit);
  }

  if (!fs.existsSync('./files')) {
    fs.mkdirSync('./files');
  }
  
  await router(fastify)
  
  fastify.listen({ port: config.http.port }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  })
})();
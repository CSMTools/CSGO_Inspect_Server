import * as dotenv from 'dotenv'
dotenv.config()

import router from './src/router.js'

import config from './config.js'

import Fastify from 'fastify'

if (config.enabled_modules.web_scraping && !process.env.ROTATING_PROXY_URL.length) {
  throw new Error('Proxy is required to use web scraping functionality, please add a proxy URL in your .env file')
}

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
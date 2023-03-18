import router from './src/router.js'

import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

router(fastify)

fastify.listen({ port: 443 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})

import Scraper from './src/lib/web_scraper/index.js'

const scraper = new Scraper();

scraper.getFriends('76561198892632539')
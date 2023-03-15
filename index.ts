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
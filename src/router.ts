import { FastifyInstance } from 'fastify'

import BotMaster from './lib/bot/master.js'
import DataManager from './lib/database/index.js'
import UserFileManager from './lib/files/userFiles.js'

import index from './lib/routes/index.js'
import inspect from './lib/routes/inspect/index.js'
import inspectBulk from './lib/routes/inspect/bulk.js'
import filesSave from './lib/routes/files/save.js'
import filesGet from './lib/routes/files/get.js'
import filesGetList from './lib/routes/files/getList.js'

import config from '../config.js'

export default function router(fastify: FastifyInstance) {
  const botMaster = new BotMaster(config.logins, config.bot_settings)

  if (config.enabled_modules.web_scraping) {
    const dataManager = new DataManager(process.env.STEAM_API_KEY, botMaster)
  }

  if (config.enabled_modules.file_storage) {
    const fileManager = new UserFileManager(process.cwd() + '/files')
    
    filesSave(fastify, fileManager);
    filesGet(fastify, fileManager);
    filesGetList(fastify, fileManager);
  }

  index(fastify, botMaster);
  inspect(fastify, botMaster);
  inspectBulk(fastify, botMaster);
}
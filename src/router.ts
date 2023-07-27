import { FastifyInstance } from 'fastify'

import BotMaster from './lib/bot/master.js'
import DataManager from './lib/database/index.js'
import UserFileManager from './lib/files/userFiles.js'

import index from './lib/routes/index.js'
import status from './lib/routes/status.js'
import inspect from './lib/routes/inspect/index.js'
import inspectBulk from './lib/routes/inspect/bulk.js'
import filesSave from './lib/routes/files/save.js'
import filesGet from './lib/routes/files/get.js'
import filesGetList from './lib/routes/files/getList.js'
import itemsGetSticker from './lib/routes/items/get-sticker.js'
import itemsGetSkin from './lib/routes/items/get-skin.js'

import config from '../config.js'
import getItemSearchFile from './lib/routes/items/get-item-search-file.js'

export default async function router(fastify: FastifyInstance) {
  let botMaster;

  if (config.enabled_modules.database) {
    const dataManager = new DataManager()
    botMaster = new BotMaster(config.logins, config.bot_settings, dataManager)
  } else {
    botMaster = new BotMaster(config.logins, config.bot_settings)
  }

  if (config.enabled_modules.file_storage) {
    const fileManager = new UserFileManager(config.file_location)
    
    filesSave(fastify, fileManager);
    filesGet(fastify, fileManager);
    filesGetList(fastify, fileManager);
  }

  index(fastify);

  status(fastify, botMaster);

  inspect(fastify, botMaster);
  inspectBulk(fastify, botMaster);

  itemsGetSticker(fastify, botMaster.gameData.staticItems);
  itemsGetSkin(fastify, botMaster.gameData.staticItems);
  getItemSearchFile(fastify, botMaster.gameData.staticItems);

  return;
}
import EventEmitter from 'events';
import SteamUser from "steam-user";

namespace NodeJS {
  interface ProcessEnv {
    ROTATING_PROXY_URL: string;
    STEAM_API_KEY: string;
    DATABASE_URL: string;
  }
}
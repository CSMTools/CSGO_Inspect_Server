import SteamUser from 'steam-user'
import GlobalOffensive from 'globaloffensive'
import SteamTotp from 'steam-totp'
import { EventEmitter } from 'events'

class Bot extends EventEmitter {
  #loggedIn = false;
  
  constructor() {
    super();

    
  }

  login(username: string, password: string, auth_code: string) {
    this.#loggedIn = false;

    
  }

  get loggedIn() {
    return this.#loggedIn;
  }
}
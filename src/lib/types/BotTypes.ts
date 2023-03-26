import { Sticker } from 'globaloffensive'

export type LoginData = {
    accountName: string,
    password: string,
    rememberPassword: boolean,
    authCode?: string,
    twoFactorCode?: string
  }

export type LoginConfig = {
  user: string,
  pass: string,
  auth: string
}
  
export type ItemData = {
    delay?: number,
    itemid: string,
    defindex: number,
    paintindex: number,
    rarity: number,
    quality: number,
    killeaterscoretype: number | null,
    killeatervalue: number,
    customname: string | null,
    paintseed: number | null,
    paintwear: number,
    origin: number,
    s: string,
    a: string,
    d: string,
    m: string,
    stickers: (Sticker & {
      tint_id: number | null;
    })[],
  }
  
export type InspectRequest = {
    s: string,
    a: string,
    d: string,
    m: string,
    time: number
  }
  
export type BotSettings = {
    max_attempts: number,
    request_delay: number,
    request_ttl: number
  }
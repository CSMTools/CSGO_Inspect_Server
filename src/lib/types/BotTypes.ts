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
    delay: number,
    itemId: string,
    defindex: number,
    paintindex: number,
    rarity: number,
    quality: number,
    killeatervalue: number,
    s: string,
    a: string,
    d: string,
    m: string,
    paintseed: number | null,
    paintwear: number,
    stickers: (Sticker & {
      tint_id: number | null;
    })[]
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
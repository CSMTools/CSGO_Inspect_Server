import { Sticker as GOSticker } from 'globaloffensive';

export type RefreshLoginData = {
  refreshToken: string;
}

export type LoginData = {
  accountName: string;
  password: string;
  authCode: string;
}

export type LoginConfig = {
  user: string,
  pass: string,
  auth: string
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
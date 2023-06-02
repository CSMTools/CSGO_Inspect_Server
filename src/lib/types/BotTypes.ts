import { Sticker } from 'globaloffensive'

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
  stickers: StickerInItem[],
  // Additional data, never stored, only added in requests:
  additional?: {
    imageurl: string;
    floatData: {
      min: number,
      max: number
    };
    weapon_type: string;
    item_name: string;
    rarity_name: string;
    quality_name: string;
    origin_name: string;
    wear_name: string;
    full_item_name: string;
  }
}

export type StickerInItem = Sticker & {
  tint_id: number | null;
  codename?: string;
  material?: string;
  name?: string;
  image?: string;
  rarityname?: string;
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
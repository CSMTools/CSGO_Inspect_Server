import { InspectRequest } from "./types/BotTypes.js";

export function log(tag: string, message: string) {
  console.log(`log(${tag}, ${Math.floor(process.uptime())}s): ${message};`)
}

export function isInspectLinkValid(link: string): boolean {
  return new RegExp(/steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview%20(S\d+|M\d+)(A\d+)(D\d+)/).test(link)
}

export function linkToInspectRequest(link: string): InspectRequest | null {
  const request: InspectRequest = {
    s: "",
    a: "",
    d: "",
    m: "",
    time: 0
  };

  link = decodeURI(link);

  let linkParams = link.match(/steam:\/\/rungame\/730\/\d+\/(\+|\s)csgo_econ_action_preview\s(S\d+|M\d+)(A\d+)(D\d+)/)

  if (!linkParams) {
    return null;
  }

  if (linkParams[2].startsWith('S')) {
    request.s = linkParams[2].substring(1)
  } else {
    request.m = linkParams[2].substring(1)
  }

  request.a = linkParams[3].substring(1)
  request.d = linkParams[4].substring(1)

  return request;
}

export function getHashByAvatarURL(url: string): string | null {
  return url.match(/https:\/\/avatars\.akamai\.steamstatic\.com\/([\da-f]+)(_medium|_full)?\.(jpg|png|webp)/)?.[1] || null;
}

function random(seed: number) {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function getBotTag(username: string): string {
  let seed = 0;
  for (let i = 0; i < username.length; i++) {
    seed += username.charCodeAt(i);
  }

  let num = Math.round(random(seed) * (47 - 30) + 30);

  return `\x1b[${num}m${username}\x1b[0m`
}
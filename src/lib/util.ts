import cdn, { PhaseValue, Phases } from "cs2-cdn";
import { InspectRequest } from "./types/BotTypes.js";
import { DopplerData, getDopplerType } from "@csmtools/dopplerutils";

export function log(tag: string, message: string) {
  console.log(`log(${tag}, ${Math.floor(process.uptime())}s): ${message};`)
}

export function isInspectLinkValid(link: string): boolean {
  return new RegExp(/steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview%20(S\d+|M\d+)(A\d+)(D\d+)/).test(link)
}

export function linkToInspectRequest(link: string): InspectRequest | null {
  const request: InspectRequest = {
    s: "0",
    a: "0",
    d: "0",
    m: "0",
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

export function inspectRequestToInspectFields(d: InspectRequest): string {
  let string = '';

  if (d.s !== '0') {
    string += `S${d.s}`
  } else {
    string += `M${d.m}`
  }

  string += `A${d.a}D${d.d}`

  return string;
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

/* Randomize array in-place using Durstenfeld shuffle algorithm */
export function shuffleArray(array: any[]) {
  let a = [...array];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

export function getPhaseValue(paintIndex: number): PhaseValue {
  const type = getDopplerType(paintIndex);
  let normalizedName = DopplerData[type][paintIndex].name.toLowerCase().replaceAll(" ", "");

  return cdn.phase[normalizedName as keyof Phases];
}

/** Intercepts writes to any property of an object */
export function observeProperty<T extends Object, K extends keyof T>(
  obj: T,
  property: K,
  onChanged: (val: T[K]) => void,
  customDescriptor?: PropertyDescriptor | undefined
) {
  let val = obj[property]
  Object.defineProperty(obj, property, {
    get() {
      return val
    },
    set(newVal) {
      val = newVal
      onChanged(newVal)
    },
    enumerable: true,
    configurable: true,
    ...customDescriptor
  })
}
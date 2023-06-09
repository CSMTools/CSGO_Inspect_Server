// a simple parser for Valve's KeyValue format
// https://developer.valvesoftware.com/wiki/KeyValues
//
// author: Rossen Georgiev, 2014-2016
// contributors: Tom Shaver, 2017 & Albin hedwall, 2023


// Copyright (c) 2014 Rossen Georgiev
// https://github.com/rossengeorgiev

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


// duplicate token can be undefined. If it is, checks are skipped later on.
// it is expected for DUPLICATE_TOKEN to be a string identifier appended to
// duplicate keys
export function parse(text: string, DUPLICATE_TOKEN?: string) {
  if (typeof text !== 'string') {
    throw new TypeError('VDF.parse: Expecting text parameter to be a string')
  }

  // If duplicate token exists AND is not a string
  if (DUPLICATE_TOKEN && typeof DUPLICATE_TOKEN !== 'string') {
    throw new TypeError('VDF.parse: Expecting DUPLICATE_TOKEN parameter to be a string if defined')
  }


  let lines = text.split('\n')

  let obj: any = {}
  let stack: any[] = [obj]
  let expectBracket = false
  let line = ''
  let m: RegExpExecArray | null = null;

  let reKV = new RegExp(
    '^("((?:\\\\.|[^\\\\"])+)"|([a-z0-9\\-\\_]+))' +
    '([ \t]*(' +
    '"((?:\\\\.|[^\\\\"])*)(")?' +
    '|([a-z0-9\\-\\_]+)' +
    '))?'
  )

  let i = 0
  let j = lines.length

  for (; i < j; i++) {
    line = lines[i].trim()

    // skip empty and comment lines
    if (line === '' || line[0] === '/') {
      continue
    }

    // todo, implement case for handling #base 'includdes' that will
    // import another ENTIRE file to import documents with.

    // implemented for now to stop system from erroring out.
    if (line[0] === '#') {
      continue
    }

    // one level deeper
    if (line[0] === '{') {
      expectBracket = false
      continue
    }

    if (expectBracket) {
      throw new SyntaxError('VDF.parse: expected bracket on line ' + (i + 1))
    }

    // one level back
    if (line[0] === '}') {
      stack.pop()
      continue
    }

    let done = false

    // parse keyvalue pairs
    while (!done) {
      m = reKV.exec(line)

      if (m === null) {
        throw new SyntaxError('VDF.parse: invalid syntax on line ' + (i + 1))
      }

      // qkey = 2
      // key = 3
      // qval = 6
      // vq_end = 7
      // val = 8
      let key = (typeof m[2] !== 'undefined') ? m[2] : m[3]
      let val = (typeof m[6] !== 'undefined') ? m[6] : m[8]

      if (typeof val === 'undefined') {
        // this is a duplicate key so we need to do special increment
        // check to see if duplicate token is declared. if it's undefined, the user didn't set it/
        // so skip this below operation. instead, proceed to the original behavior of merging.
        if (DUPLICATE_TOKEN && stack[stack.length - 1][key]) {
          // if we are in here, the user has opted for not overriding duplicate keys

          // we don't know how many duplicate keys exist, so we have to while loop
          // and check our increments.
          let newKeyFound = false; // by default, no idea where we are
          let int = 2; // start at 2, the unmodified first one is "1".
          let base = key; // the base of what the key variable should have each time

          while (!newKeyFound) {
            key = base + `-${DUPLICATE_TOKEN}-${int}`; // what the key shoud look like

            // if this key has an assigned value already, keep going up
            if (stack[stack.length - 1][key]) {
              int++;
              continue;
              // this key does NOT have anything assigned. Assign it.
            } else {
              stack[stack.length - 1][key] = {} // assign it
              newKeyFound = true // break loop
            }
          }
        }

        // new key time!
        if (!stack[stack.length - 1][key]) {
          stack[stack.length - 1][key] = {}
        }

        stack.push(stack[stack.length - 1][key])
        expectBracket = true
      } else {
        if (!m[7] && !m[8]) {
          line += '\n' + lines[++i]
          continue
        }

        stack[stack.length - 1][key] = val
      }

      done = true
    }
  }

  if (stack.length !== 1) {
    throw new SyntaxError('VDF.parse: open parentheses somewhere')
  }

  return obj
}

function _dump(obj: any, pretty: boolean, level: number, DUPLICATE_TOKEN?: string) {
  let indent = '\t'
  let buf = ''
  let lineIndent = ''

  if (pretty) {
    for (let i = 0; i < level; i++) {
      lineIndent += indent
    }
  }

  for (let key in obj) {
    // the key may not be the /binding/ key, for now we declare a variable
    // and assign it to key.
    // BELOW, with our if statement, we tentatively can change it.
    let finalKey = key
    // if a duplicate token was defined, check to see if this key has it.
    // if it does, override the key in this context with only the original key value by taking index 0
    if (DUPLICATE_TOKEN && key.includes(DUPLICATE_TOKEN)) finalKey = key.split(`-${DUPLICATE_TOKEN}-`)[0]

    // in the below section, we update finalKey instead of key in this area because
    // we want the stripped key as the key. BUT, we want the ORIGINAL keys data.
    if (typeof obj[finalKey] === 'object') {
      buf += [lineIndent, '"', finalKey, '"\n', lineIndent, '{\n', _dump(obj[key], pretty, level + 1, DUPLICATE_TOKEN), lineIndent, '}\n'].join('')
    } else {
      buf += [lineIndent, '"', finalKey, '"', indent, indent, '"', String(obj[key]), '"\n'].join('')
    }
  }

  return buf
}

export function stringify(obj: any, pretty: boolean, DUPLICATE_TOKEN?: string) {
  return _dump(obj, pretty, 0, DUPLICATE_TOKEN)
}

export const dump = stringify;
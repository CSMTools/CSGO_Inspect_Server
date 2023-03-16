export function log(tag: string, message: string) {
  console.log(`log(${tag}, ${Math.floor(process.uptime())}s): ${message};`)
}
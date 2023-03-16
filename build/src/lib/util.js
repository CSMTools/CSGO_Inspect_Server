export function log(tag, message) {
    console.log(`log(${tag}, ${Math.floor(process.uptime())}s): ${message};`);
}

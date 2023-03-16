export function log(tag, message) {
    console.log(`log(${tag}, ${Math.floor(process.uptime())}s): ${message};`);
}
export function isInspectLinkValid(link) {
    return new RegExp(/steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview%20(S\d+|M\d+)(A\d+)(D\d+)/).test(link);
}
export function linkToInspectRequest(link) {
    const request = {
        s: "",
        a: "",
        d: "",
        m: "",
        time: 0
    };
    link = decodeURI(link);
    let linkParams = link.match(/steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview\s(S\d+|M\d+)(A\d+)(D\d+)/);
    if (!linkParams) {
        return null;
    }
    if (linkParams[1].startsWith('S')) {
        request.s = linkParams[1].substring(1);
    }
    else {
        request.m = linkParams[1].substring(1);
    }
    request.a = linkParams[2].substring(1);
    request.d = linkParams[3].substring(1);
    return request;
}

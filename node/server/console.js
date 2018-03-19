/* Add colors to console output */
let conWarn = console.warn;
function warn(msg, ...args) {
    conWarn.call(null, `\x1b[93m${msg}\x1b[0m`, ...args);
}

let conError = console.error;
function error(msg, ...args) {
    conWarn.call(null, `\x1b[91m${msg}\x1b[0m`, ...args);
}

let conDebug = console.debug;
function debug(msg, ...args) {
    conDebug.call(null, `\x1b[92m${msg}\x1b[0m`, ...args);
}

let conInfo = console.info;
function info(msg, ...args) {
    conInfo.call(null, `\x1b[96m${msg}\x1b[0m`, ...args);
}

let conTrace = console.trace;
function trace(msg, ...args) {
    // don't change color yet... too lazy to think of one
    conTrace.call(null, msg, ...args);
}

let conLog = console.log;
function log(msg, ...args) {
    // don't change color yet... too lazy to think of one
    conLog.call(null, msg, ...args);
}

function noop() {}

function setLogLevel(level) {
    let l;
    switch (level) {
        case 'debug':
        case 1:
            l = 1;
            break;

        case 'info':
        case undefined:
        case '2':
            l = 2;
            break;

        case 'warn':
        case 3:
            l = 3;
            break;

        case 'error':
        case '4':
            l = 4;
            break;

        default:
            throw new Error(`Invalid log level: ${level}`);
    }

    console.trace = l <= 1 ? trace : noop;
    console.debug = l <= 1 ? debug : noop;
    console.log = l <= 2 ? log : noop;
    console.info = l <= 2 ? info : noop;
    console.warn = l <= 3 ? warn : noop;
    console.error = l <= 4 ? error : noop;
}

export default setLogLevel;
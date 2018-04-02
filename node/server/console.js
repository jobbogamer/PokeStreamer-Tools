/* Add colors to console output */
// NOTE: use lambda-functions so that they aren't bound
let conWarn = console.warn;
function warn(msg, ...args) {
    conWarn(`\x1b[93m${prefix(msg)}\x1b[0m`, ...args);
}

let conError = console.error;
function error(msg, ...args) {
    conWarn(`\x1b[91m${prefix(msg)}\x1b[0m`, ...args);
}

let conDebug = console.debug;
function debug(msg, ...args) {
    conDebug(`\x1b[92m${prefix(msg)}\x1b[0m`, ...args);
}

let conInfo = console.info;
function info(msg, ...args) {
    conInfo(`\x1b[96m${prefix(msg)}\x1b[0m`, ...args);
}

let conLog = console.log;
function log(msg, ...args) {
    // don't change color yet... too lazy to think of one
    conLog(`${prefix(msg)}`, ...args);
}

function noop() {}

function noPrefix() {
    return '';
}

function useDatePrefix() {
    setPrefix(() => `[${new Date().toLocaleTimeString('en-US')}]`, '\t');
}

let prefix = noPrefix;

function parseLevel(level) {
    if (level === undefined || level === null) {
        return 2;
    }

    switch (level) {
        case 'debug':
        case 1:
            return 1;

        case 'info':
        case 2:
            return 2;

        case 'warn':
        case 3:
            return 3;

        case 'error':
        case 4:
            return 4;

        default:
            throw new Error(`Invalid log level: ${level}`);
    }
}

function setLevel(level) {
    level = parseLevel(level);
    console.debug   = level <= 1 ? debug : noop;
    console.log     = level <= 2 ? log : noop;
    console.info    = level <= 2 ? info : noop;
    console.warn    = level <= 3 ? warn : noop;
    console.error   = level <= 4 ? error : noop;
}

function setPrefix(fn, separator) {
    if (!fn) {
        prefix = noPrefix;
        return;
    }

    if (typeof fn !== 'function') {
        console.warn(`Arugment 'fn' in setPrefix() must be a function.  Found: ${typeof fn}`);
        return;
    }

    if (separator === undefined) {
        separator = ' ';
    } else if (separator instanceof Number) {
        let tmp = [];
        tmp.length = separator + 1;
        separator = tmp.join(' ');
    }

    prefix = function(msg) {
        if (msg) {
            return fn() + separator + msg;
        }

        // case for when calling console.log() to add a blank line
        // don't want to add our prefix then
        return '';
    };
}

function clearPrefix() {
    prefix = noPrefix;
}

export default {
    setLevel,
    setPrefix,
    useDatePrefix,
    clearPrefix,
    parseLevel,
};
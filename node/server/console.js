import { styles } from 'colors';

const { debug, log, info, warn, error } = console;
const [ timestampColor, debugColor, logColor, infoColor, warnColor, errorColor, resetColor ] = 
      [ 'gray', 'gray', 'white', 'cyan', 'yellow', 'red', 'reset' ].map(c => styles[c].open);

let currentLevel = 4;

function noop() {}

function noPrefix() {
    Object.defineProperty(console, 'prefix', { get: () => resetColor, configurable: true });
}

function useDatePrefix() {
    setPrefix(() => `${timestampColor}[${new Date().toLocaleTimeString('en-US')}]`);
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
    currentLevel = parseLevel(level);
    console.debug   = level <= 1 ?  debug.bind(console, console.prefix + debugColor) : noop;
    console.log     = level <= 2 ?  log.bind(console,   console.prefix + logColor)   : noop;
    console.info    = level <= 2 ?  info.bind(console,  console.prefix + infoColor)  : noop;
    console.warn    = level <= 3 ?  warn.bind(console,  console.prefix + warnColor)  : noop;
    console.error   = level <= 4 ?  error.bind(console, console.prefix + errorColor) : noop;
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
        separator = '';
    } else if (separator instanceof Number) {
        let tmp = [];
        tmp.length = separator + 1;
        separator = tmp.join(' ');
    }

    Object.defineProperty(console, 'prefix', { get: () => resetColor + fn() + separator, configurable: true });
    setLevel(currentLevel);
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
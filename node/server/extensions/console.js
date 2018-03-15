/* Add colors to console output */
let tmpWarn = console.warn;
console.warn = function(msg, ...args) {
    tmpWarn.call(null, `\x1b[93m${msg}\x1b[0m`, ...args);
};

let tmpErr = console.error;
console.error = function(msg, ...args) {
    tmpWarn.call(null, `\x1b[91m${msg}\x1b[0m`, ...args);
};

let tmpDebug = console.debug;
console.debug = function(msg, ...args) {
    tmpDebug.call(null, `\x1b[92m${msg}\x1b[0m`, ...args);
};

let tmpInfo = console.info;
console.info = function(msg, ...args) {
    tmpInfo.call(null, `\x1b[96m${msg}\x1b[0m`, ...args);
};
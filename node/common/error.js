class TimeoutError extends Error {
    constructor(message = { msg: null, ttl: null }, ...args) {
        super(message.msg || 'Timed out', ...args);
        let { msg, ttl } = message;
        if (hasValue(ttl) && !hasValue(msg)) {
            this.message = `Timed out after ${ttl / 1000} seconds`;
        }

        this.ttl = ttl;
    }
}

class EmptyOrMissingConfigError extends Error {
    constructor(filename = 'config.json', exists) {
        super(exists ? `Config file ${filename} is empty.` : `Config file ${filename} does not exist.`);
        Error.captureStackTrace(this, EmptyOrMissingConfigError);
        this.exists = !!exists;
    }
}

export {
    TimeoutError,
    EmptyOrMissingConfigError
};
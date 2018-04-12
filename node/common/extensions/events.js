import EventEmitter from 'events';
import { TimeoutError } from '../../common/error';

EventEmitter.prototype.matchOnce = function (event, predicate, callback, timeout = -1, timeoutCallback = null) {
    let cb = (...args) => {
        if (predicate(...args)) {
            if (callback) {
                callback(...args);
            }

            this.removeListener(event, cb);
            clearTimeout(t);
        }
    }, t;

    if (timeout !== -1) {
        t = setTimeout(() => {
            this.removeListener(event, cb);
            if (timeoutCallback) {
                timeoutCallback(new TimeoutError({ ttl: timeout }));
            }
        }, timeout);
    }

    this.on(event, cb);
};

EventEmitter.prototype.matchOnceAsync = async function (event, predicate, timeout = -1) {
    return new Promise((resolve, reject) => {
        try {
            this.matchOnce(event, predicate, resolve, timeout, reject);
        } catch (err) {
            reject(err);
        }
    });
};
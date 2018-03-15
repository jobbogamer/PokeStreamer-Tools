import fs from 'fs';
import EventEmitter from 'events';
import compileConfig from '../common/configCompiler';

class ConfigWatcher extends EventEmitter {
    constructor(config) {
        super();

        let self = this;
        let createWatcher = file => fs.watch(file, function(e, fn) { self.emit(e, fn); }.bind(this));
        let watchers = this.watchers = [];
        watchers.push(createWatcher('config.json'));
        if (config.configOverride) {
            if (config.configOverride.constructor === String) {
                watchers.push(createWatcher(config.configOverride));
            } else {
                // assume at this point that configOverride is an Array, or it would have failed earlier
                config.configOverride.forEach(file => watchers.push(createWatcher(file)));
            }
        }

        console.log(`Watching ${watchers.length} config file(s).`);
    }

    close() {
        for (let watcher of this.watchers) {
            watcher.close();
        }
    }
}

class Config extends EventEmitter {
    constructor() {
        super();

        this._readConfig();
    }

    _readConfig(e, filename) {
        let next;
        try
        {
            next = compileConfig();
        } catch (e) {
            // an error is thrown if config.json is empty, which happens immediately after saving the file
            return;
        }

        // sloppy but it doesn't really matter for our purposes if we load too many times
        if (this._current && JSON.stringify(this._current) === JSON.stringify(next)) {
            return;
        }

        if (filename) {
            console.log(`File ${filename} was updated.  Updating config.`);
        }

        let prev = this._current;
        this._current = next;

        if (this.configWatcher) {
            this.configWatcher.close();
        }

        this.configWatcher = new ConfigWatcher(next);
        this.emit('update', { prev: prev, next: this._current });
    }

    get Current() { return Object.assign({}, this._current); }
}

const config = new Config();
export default config;
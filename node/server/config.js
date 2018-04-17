import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

import compileConfig from '../common/configCompiler';
import CleanupProcess from './cleanup-process';
import { Paths } from './constants';
import Log from './console';

const NodeRoot = Paths.NodeRoot;

class ConfigWatcher extends EventEmitter {
    constructor(config) {
        super();

        let self = this;
        let createWatcher = file => 
            fs.watch(path.resolve(NodeRoot, file), function (e, fn) { self.emit(e, fn); }.bind(this));

        let watchers = this.watchers = [];
        watchers.push(createWatcher('config.json'));
        if (config.advancedConfig) {
            // don't need to warn here if config.advancedConfig does not exist, as compileConfig() will handle that
            watchers.push(createWatcher(config.advancedConfig));
        }

        if (config.configOverride) {
            if (config.configOverride.constructor === String) {
                watchers.push(createWatcher(config.configOverride));
            } else if (config.configOverride.constructor === Array) {
                config.configOverride.forEach(file => watchers.push(createWatcher(file)));
            } else {
                throw new Error([
                    'config.configOverride is neither a string nor an array.  How in the world did you get to this ',
                    'error?  No seriously, something is terribly wrong.'].join(''));
            }
        }

        console.log(`Watching ${watchers.length} config file(s).`);
        CleanupProcess(this.close);
    }

    close() {
        if (this.watchers) {
            for (let watcher of this.watchers) {
                watcher.close();
                watcher.removeAllListeners();
            }
        }
    }
}

class Config extends EventEmitter {
    constructor() {
        super();

        this._readConfig();
        this._configMissingTimeout = null;
    }

    _readConfig(e, filename) {
        let next;
        clearTimeout(this._configMissingTimeout);

        try
        {
            next = compileConfig();
        } catch (e) {
            // an error is thrown if config.json is empty, which happens immediately after saving the file
            // set a timeout to make sure the config file becomes available and has not merely been deleted or renamed
            this._configMissingTimeout = setTimeout(() => { 
                throw new Error(`Config file '${filename}' is not found.`); 
            }, 500);
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
            this.configWatcher.removeAllListeners();
            delete this.configWatcher;
        }

        this.configWatcher = new ConfigWatcher(next);
        this.configWatcher.on('change', this._readConfig.bind(this));

        let ll = this._current.logLevel = Log.parseLevel(this._current.logLevel);
        Log.setLevel(ll);
        if (ll <= 2) {
            Log.useDatePrefix();
        } else {
            Log.clearPrefix();
        }

        this.emit('update', prev, this._current );
    }
}

const configProxy = new Proxy(new Config(), {
    get: function(config, prop) {
        if (Object.getOwnPropertyNames(config._current).indexOf(prop) !== -1) {
            return JSON.parse(JSON.stringify(config._current[prop]));
        } else {
            return config[prop];
        }
    }
});

export default configProxy;
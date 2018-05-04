import fs from 'fs';
import path from 'path';
import json5 from 'json5';
import EventEmitter from 'events';
import { bindFunctionProps } from '../helpers';
import mergeDeep from '../../common/mergeDeep';

const EmptyConfigJSON = JSON.stringify(json5.parse(fs.readFileSync(path.join(__dirname, '../../common/config.empty.json'))));

class Config extends EventEmitter {
    constructor() {
        super();

        bindFunctionProps(this, '__reset', '__mergeConfigValues', '__setPrevConfig', '__triggerChangeEvent');
        
        this.__reset();
    }

    __reset() {
        this._prevConfig = null;
        this._config = JSON.parse(EmptyConfigJSON);
    }

    __mergeConfigValues(configValues) {
        this._config = mergeDeep(this._config, configValues);
    }

    __setPrevConfig() {
        this._prevConfig = this._config;
    }

    __triggerChangeEvent() {
        this.emit('update', this._prevConfig, this._config);
    }
}

const config = new Proxy(new Config(), {
    get: function(cfg, prop) {
        if (prop.startsWith('__')) {
            return cfg[prop];
        }

        return cfg._config[prop];
    }
});

export default config;
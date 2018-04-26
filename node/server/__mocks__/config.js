import fs from 'fs';
import path from 'path';
import json5 from 'json5';
import mergeDeep from '../../common/mergeDeep';

const EmptyConfig = json5.parse(fs.readFileSync(path.join(__dirname, '../../common/config.empty.json')));
let config;

function __reset() {
    config = JSON.parse(JSON.stringify(EmptyConfig));
}

__reset();

function __mergeConfigValues(configValues) {
    config = mergeDeep(config, configValues);
}

let mock = {
    __reset,
    __mergeConfigValues
};

const ConfigProxy = new Proxy({}, {
    get: function(cfg, prop) {
        if (prop.startsWith('__')) {
            return mock[prop];
        } else {
            return config[prop];
        }
    }
});

export default ConfigProxy;
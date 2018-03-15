import json5 from 'json5';
import path from 'path';
import fs from 'fs';

function parse(file) {
    return json5.parse(fs.readFileSync(file));
}

export default function compileConfig(initialConfig) {
    initialConfig = initialConfig || parse(path.join(__dirname, '../config.json'));

    if (!initialConfig.configOverride) {
        return initialConfig;
    }
    
    let co = initialConfig.configOverride;
    switch (co.constructor) {
        case String:
            return mergeDeep(initialConfig, parse(co));
        
        case Array:
            let configs = co.map(f => parse(f));
            return configs.reduce((prev, next) => mergeDeep(next, prev), initialConfig);
        
        default:
            throw new Error(`Invalid value for configOverride in config.json.  Must be an array or a string.  Found ${co}.`);
    }
}

// helper methods from https://stackoverflow.com/a/37164538/3120446

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
}
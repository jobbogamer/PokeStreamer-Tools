import json5 from 'json5';
import path from 'path';
import fs from 'fs';
import { NodeRoot } from '../server/constants';

function parse(file) {
    if (!fs.existsSync(file)) {
        throw new Error(`Config file '${file}' not found.  Check that the path is right in config.json.`);
    }

    return json5.parse(fs.readFileSync(file));
}

export default function compileConfig(initialConfig) {
    initialConfig = initialConfig || parse(path.resolve(NodeRoot, 'config.json'));

    if (!initialConfig.advancedConfig) {
        console.warn(`config.json is missing "advancedConfig" setting.  If things are broken, this is a likely cause.`);
    } else if (!fs.existsSync(initialConfig.advancedConfig)) {
        throw new Error(`Advanced config file '${initialConfig.advancedConfig}' does not exist.`);
    } else {
        let ac = parse(initialConfig.advancedConfig);
        initialConfig = mergeDeep(ac, initialConfig);
    }

    if (!initialConfig.configOverride) {
        return initialConfig;
    }
    
    let co = initialConfig.configOverride;
    switch (co.constructor) {
        case String:
            return mergeDeep(initialConfig, parse(co));
        
        case Array:
            let configs = co.map(f => parse(f));
            return configs.reduce(mergeDeep, initialConfig);
        
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
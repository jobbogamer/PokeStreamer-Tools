import json5 from 'json5';
import path from 'path';
import fs from 'fs';
import { Paths } from '../server/constants';

const NodeRoot = Paths.NodeRoot;

function parse(file) {
    if (!fs.existsSync(file)) {
        throw new Error(`Config file '${file}' not found.  Check that the path is right in config.json.`);
    }

    return json5.parse(fs.readFileSync(file));
}

function addMissingKeys(config) {
    return mergeDeep(parse(path.resolve(__dirname, 'config.empty.json')), config);
}

function compileConfig(config) {
    config = config || parse(path.resolve(NodeRoot, 'config.json'));

    if (!config.advancedConfig) {
        console.warn(`config.json is missing "advancedConfig" setting.  If things are broken, this is a likely cause.`);
    } else if (!fs.existsSync(config.advancedConfig)) {
        throw new Error(`Advanced config file '${config.advancedConfig}' does not exist.`);
    } else {
        let ac = parse(config.advancedConfig);
        config = mergeDeep(ac, config);
    }

    if (!config.configOverride) {
        return config;
    }
    
    let co = config.configOverride;
    switch (co.constructor) {
        case String:
            return mergeDeep(config, parse(co));
        
        case Array:
            return co.map(f => parse(f)).reduce(mergeDeep, config);
        
        default:
            throw new Error(`Invalid value for configOverride in config.json.  Must be an array or a string.  Found ${co}.`);
    }
}

//#region Helpers
/* helper methods from https://stackoverflow.com/a/37164538/3120446 */
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
//#endregion

export default function(config) {
    return addMissingKeys(compileConfig(config));
}
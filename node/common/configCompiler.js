import json5 from 'json5';
import path from 'path';
import fs from 'fs';
import mergeDeep from './mergeDeep';
import { Paths } from '../server/constants';
import { EmptyOrMissingConfigError } from './error';

const NodeRoot = Paths.NodeRoot;

let dependencies = new Set();

function parse(file) {
    if (!fs.existsSync(file)) {
        throw new EmptyOrMissingConfigError(file, false);
    }

    dependencies.add(file);
    let text = fs.readFileSync(file).toString();
    if (!text.length) {
        throw new EmptyOrMissingConfigError(file, true);
    }

    try {
        return json5.parse(text);
    } catch (error) {
        let errorMessage = `Invalid config: ${file}`;
        if (text.search(/^[<=>]/g) !== -1) {
            errorMessage += `\nIt appears that there was a merge conflict when you last updated, and you haven't resolved the conflict.  Search for lines beginning with '<', '=', or '>'.`;
        }

        throw new Error(errorMessage);
    }
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

function compile(config)  {
    return addMissingKeys(compileConfig(config));
}

export {
    compile as default,
    dependencies
};
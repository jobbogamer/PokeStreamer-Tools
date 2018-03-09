import _ from 'lodash';
import path from 'path';

const importRegex = /@import\s+'([^']+\.js)'\s*;/ig;

function validateExportType(data) {
    if (!_.isObject(data)) {
        throw new Error(`Export must be an object.`);
    }
}

function transform(data) {
    validateExportType(data);
    let sass = [];
    for (let key of Object.keys(data)) {
        let val = data[key];
        if (key.startsWith('%')) {
            let css = Object.keys(val).map(k => `    ${k}: ${val[k]};`).join('\n');
            sass.push(`${key} {\n${css}\n}`);
        } else if (isValidKey(key)) {
            sass.push(`$${key}: ${parseValue(data[key])};`);
        } else {
            console.warn(`Invalid key '${key}'.  Skipping.`);
        }
    }

    return sass.join('\n');
}

function isValidKey(key) {
    return /^[^$@%:].*/.test(key);
}

function parseValue(value) {
    if (_.isArray(value)) {
        return parseList(value);
    } else if (_.isPlainObject(value)) {
        return parseMap(value);
    } else if (value === '') {
        return '""';
    } else if (_.isString(value) && shouldWrapInStrings(value)) {
        return `"${value}"`;
    } else {
        return value;
    }
}

function parseList(list) {
    return `(${list.map(v => parseValue(v)).join(',')})`;
}

function parseMap(map) {
    return `(${Object.keys(map)
        .filter(key => isValidKey(key))
        .map(key => `${key}: ${parseValue(map[key])}`)
        .join(',')})`;
}

function shouldWrapInStrings(input) {
    const inputWithoutFunctions = input.replace(/[a-zA-Z]+\([^)]*\)/, ""); // Remove functions
    return inputWithoutFunctions.includes(',');
}

export default function (content) {
    let self = this;
    this.cacheable();

    return content.replace(importRegex, (match, relativePath) => {
        if (match) {
            let modulePath = path.join(self.context, relativePath);
            self.addDependency(modulePath);
            let data = require(modulePath).default;
            return transform(data);
        }
    });
}
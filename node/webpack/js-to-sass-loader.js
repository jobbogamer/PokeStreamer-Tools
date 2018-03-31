import _ from 'lodash';
import path from 'path';
import { DepGraph } from 'dependency-graph';

import { findSassVariableReferences } from './sass-helper';

const importRegex = /@import\s+'([^']+\.js)'\s*;/ig;

function validateExportType(data) {
    if (!_.isObject(data)) {
        throw new Error(`Export must be an object.`);
    }
}

function transform(data) {
    validateExportType(data);
    let dg = new DepGraph();
    
    for (let [key, val] of Object.entries(data)) {
        if (key.startsWith('%')) {
            dg.addNode(key);
            for (let [prop, propVal] of Object.entries(val)) {
                findSassVariableReferences(propVal).forEach(v => {
                    v = v.slice(1);
                    if (!dg.hasNode(v)) {
                        dg.addNode(v);
                    }
                    
                    dg.addDependency(key, v);
                });
            }
            
            let css = Object.keys(val).map(k => `    ${k}: ${val[k]};`).join('\n');
            dg.setNodeData(key, `${key} {\n${css}\n}`);
        } else if (isValidKey(key)) {
            dg.addNode(key);
            let varVal = parseValue(data[key]);
            findSassVariableReferences(varVal).forEach(v => {
                v = v.slice(1);
                if (!dg.hasNode(v)) {
                    dg.addNode(v);
                }
                dg.addDependency(key, v);
            });
            
            dg.setNodeData(key, `$${key}: ${varVal};`);
        } else {
            console.warn(`Invalid key '${key}'.  Skipping.`);
        }
    }
    
    let scss = dg.overallOrder().map(k => dg.getNodeData(k)).join('\n');
    // console.info(scss);
    return scss;
    
    // return sass.join('\n');
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
    
    return content.replace(importRegex, (match, relativePath) => {
        if (match) {
            let filePath = path.join(self.context, relativePath);
            self.addDependency(filePath);
            
            // prevent cacheing of the module
            delete require.cache[require.resolve(filePath)];
            return transform(require(filePath).default);
        }
    });
}
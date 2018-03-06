import json5 from 'json5';

export default function (source) {
    return JSON.stringify(json5.parse(source));
}
import json5 from 'json5';
import fs from 'fs';
const config = json5.parse(fs.readFileSync('config.json'));

console.log('Generating SASS variables.');
let sass = {
        nuzlockeEnabled: config.nuzlocke.enabled,
        applyDeathSpin: config.nuzlocke && config.nuzlocke.applyDeathSpin,
        ripPrefix: config.nuzlocke && config.nuzlocke.ripPrefix || '',

        allInOne: config.layout.allInOne,
    };

for (let key of Object.keys(config.style)) {
    sass[key] = config.style[key];
}

sass.debug = (process.env.NODE_ENV || 'production').trim() === 'development';

export default sass;
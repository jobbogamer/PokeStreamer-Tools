import json5 from 'json5';
import fs from 'fs';
const config = json5.parse(fs.readFileSync(process.env.CONFIG_JSON));

let sass = {
        allInOne: config.layout.allInOne,

        nuzlockeEnabled: config.nuzlocke.enabled,
        applyDeathSpin: config.nuzlocke && config.nuzlocke.applyDeathSpin,
        ripPrefix: config.nuzlocke && config.nuzlocke.ripPrefix || '',

        soulLinkEnabled: config.nuzlocke.enabled && config.nuzlocke.soulLink.enabled,
    };

for (let key of Object.keys(config.style)) {
    sass[key] = config.style[key];
}

sass.debug = (process.env.NODE_ENV || 'production').trim() === 'development';

export default sass;
import fs from 'fs';
import json5 from 'json5';

export default json5.parse(fs.readFileSync('config.json'));
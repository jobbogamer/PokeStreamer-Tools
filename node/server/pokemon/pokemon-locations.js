import fs from 'fs';
import json5 from 'json5';
import path from 'path';

export default json5.parse(fs.readFileSync(path.resolve(__dirname, '../../common/location-names.json')));
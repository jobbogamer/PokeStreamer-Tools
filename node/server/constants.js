import './extensions';
import { Img } from './image-format';

let SupportedImageFormats = [
    Img('jpg', 'jpeg', ['jpg', 'jpeg']),
    Img('png'),
    Img('apng'),
    Img('gif'),
    Img('svg', 'svg+xml'),
    Img('bmp'),
    Img('ico', 'x-icon'),
];

SupportedImageFormats.validExtensions = SupportedImageFormats.map(f => f.searchStrings).flatten();

const ImageRegex = new RegExp(`(\\d+)(\\w*)\\.(${SupportedImageFormats.validExtensions.join('|')})$`, 'i');
const ShinyImageRegex = new RegExp(`(\\d+)s(\\w*)\\.(${SupportedImageFormats.validExtensions.join('|')})$`, 'i');

const ConfigFile = process.env.CONFIG_JSON || 'config.json';
export { SupportedImageFormats, ImageRegex, ShinyImageRegex, ConfigFile };
import path from 'path';
import './extensions';
import { Img } from './pokemon/image-format';

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

const NodeRoot = path.resolve(__dirname, '..');

export { SupportedImageFormats, ImageRegex, NodeRoot, ShinyImageRegex };

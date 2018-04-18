import path from 'path';
import '../common/extensions';
import { Img } from './pokemon/image-format';

const NodeRoot = path.resolve(__dirname, '..');
const PublicPath = path.join(NodeRoot, 'public');
const GameDataPath = path.join(NodeRoot, 'gameData');
const SoulLinkFile = path.join(GameDataPath, 'soullinkdata.json');
const NuzlockeFile = path.join(GameDataPath, 'nuzlockedata.json');

export const Paths = {
    NodeRoot,
    PublicPath,
    GameDataPath,
    SoulLinkFile,
    NuzlockeFile,
};

export const API = {
    CleanConnectionIntervalMS: 2000,
    KeepAliveIntervalMS: 30000,
};

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

const ImageRegex = new RegExp(`^0*(\\d+)([\\w-]*)\\.(${SupportedImageFormats.validExtensions.join('|')})$`, 'i');
const ShinyImageRegex = new RegExp(`^0*(\\d+)s([\\w-]*)\\.(${SupportedImageFormats.validExtensions.join('|')})$`, 'i');
const EggImageRegex = new RegExp(`^egg(\\d*)\\.(${SupportedImageFormats.validExtensions.join('|')})$`, 'i');

export const Image = { 
    SupportedImageFormats,
    ImageRegex,
    ShinyImageRegex,
    EggImageRegex,
};

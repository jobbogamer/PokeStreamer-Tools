import fs, { mkdirSync } from 'fs';
import path from 'path';
import * as Constants from '../server/constants';
const Paths = Constants.Paths,
    {
        PublicPath,
        GameDataPath,
        NuzlockeFile,
        SoulLinkFile
    } = Paths,
    OldSoulLinkFile = path.resolve(PublicPath, 'soullinkdata.json'),
    OldNuzlockeFile = path.resolve(PublicPath, 'nuzlockedata.json');

console.info('Porting game data');
let foundGameData = false;

if (!fs.existsSync(GameDataPath)) {
    fs.mkdirSync(GameDataPath);
    console.log(`Created game data directory at ${GameDataPath}`);
}

if (fs.existsSync(OldNuzlockeFile)) {
    fs.renameSync(OldNuzlockeFile, NuzlockeFile),
    console.log(`Moved 'nuzlocke.json' from ${PublicPath} to ${GameDataPath}.`);
    foundGameData = true;
}

if (fs.existsSync(OldSoulLinkFile)) {
    fs.renameSync(OldSoulLinkFile, SoulLinkFile),
    console.log(`Moved 'soullink.json' from ${PublicPath} to ${GameDataPath}.`);
    foundGameData = true;
}

console.log(`Found no previous game data in ${PublicPath}`);
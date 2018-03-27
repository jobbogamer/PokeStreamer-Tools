import fs from 'fs';
import path from 'path';
import Config from '../server/config';

const config = Config.Current,
    pokemonImagesPath = path.resolve(__dirname, '..', config.pokemonImagesPath),
    pokemonImagesFormsPath = path.resolve(pokemonImagesPath, 'forms');

// rename Giratina
let giratinaPath = path.resolve(pokemonImagesFormsPath, 'Giratina');
if (!fs.existsSync(giratinaPath)) {
    console.warn(`Giratina forms path at '${giratinaPath}' not found... Skipping.`);
} else {
    let anotherGiratinaPath = path.resolve(giratinaPath, '487another.png'),
        anotherGiratinaShinyPath = path.resolve(giratinaPath, 'shiny', '487sanother.png');
    if (!fs.existsSync(anotherGiratinaPath)) {
        console.warn(`Giratina alternate form image at '${anotherGiratinaPath}' not found... Skipping.`);
    } else {
        fs.copyFileSync(anotherGiratinaPath, path.resolve(giratinaPath, '487altered.png'));
        console.log(`Copied 487another.png to 487altered.png`);
    }
    
    if (!fs.existsSync(anotherGiratinaShinyPath)) {
        console.warn(`Giratina alternate shiny form image at '${anotherGiratinaShinyPath}' not found... Skipping.`);
    } else {
        fs.copyFileSync(anotherGiratinaShinyPath, path.resolve(giratinaPath, 'shiny', '487saltered.png'));
        console.log(`Copied 487sanother.png to 487saltered.png`);
    }
}

// copy and rename Arceus
const arceusTypeMap = {
    normal: 'normal',
    fighting: 'fist',
    flying: 'sky',
    poison: 'toxic',
    ground: 'earth',
    rock: 'stone',
    bug: 'insect',
    ghost: 'spooky',
    steel: 'iron',
    fire: 'flame',
    water: 'splash',
    grass: 'meadow',
    lightning: 'zap',
    psychic: 'mind',
    ice: 'icicle',
    dragon: 'draco',
    dark: 'dread',
    mystery: 'mystery'
};

const arceusRegex = new RegExp(`^(${Object.keys(arceusTypeMap).join('|')})((?:shiny)?)2\.png$`);

let arceusDir = path.resolve(pokemonImagesPath, '../DPPt/Arceus'),
    arceusTargetDir = path.resolve(pokemonImagesFormsPath, 'arceus'),
    arceusShinyTargetDir = path.resolve(arceusTargetDir, 'shiny');
if (!fs.existsSync(arceusDir)) {
    console.warn(`Arceus directory at '${arceusDir}' not found... skipping.`);
} else {
    if (!fs.existsSync(arceusTargetDir)) {
        fs.mkdirSync(arceusTargetDir);
        
        if (!fs.existsSync(arceusShinyTargetDir)) {
            fs.mkdirSync(arceusShinyTargetDir);
        }
    }
    
    for (let file of fs.readdirSync(arceusDir)) {
        let match = arceusRegex.exec(file);
        if (match) {
            let target;
            if (match[2]) {
                target = path.resolve(arceusShinyTargetDir, `493s${arceusTypeMap[match[1]]}.png`);
            } else {
                target = path.resolve(arceusTargetDir, `493${arceusTypeMap[match[1]]}.png`);
            }
            
            fs.copyFileSync(path.resolve(arceusDir, file), target);
            console.log(`Copied '${file}' to '${target}'.`);
        }
    }
}

// copy spiky-eared pichu sprites
let pichuFormsPath = path.resolve(__dirname, '../../pokemon-images/pichu'),
    pichuFormsDestPath = path.resolve(pokemonImagesFormsPath, 'pichu');
if (!fs.existsSync(pichuFormsPath)) {
    console.warn(`Pichu forms directory at '${pichuFormsPath}' not found... skipping.`);
} else {
    if (!fs.existsSync(pichuFormsDestPath)) {
        fs.mkdirSync(pichuFormsDestPath);
    }

    if (!fs.existsSync(path.join(pichuFormsDestPath, 'shiny'))) {
        fs.mkdirSync(path.join(pichuFormsDestPath, 'shiny'));
    }
    
    fs.copyFileSync(path.join(pichuFormsPath, '172spiky-eared.png'), path.join(pichuFormsDestPath, '172spiky-eared.png'));
    fs.copyFileSync(path.join(pichuFormsPath, 'shiny/172sspiky-eared.png'), path.join(pichuFormsDestPath, 'shiny/172sspiky-eared.png'));
    console.log(`Copied pichu forms from '${pichuFormsPath}' to '${pichuFormsDestPath}'.`);
}

process.exit(0);
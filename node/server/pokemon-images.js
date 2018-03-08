import path from 'path';
import fs from 'fs';
import config from './config';
import { ImageRegex, SupportedImageFormats } from './constants';

let pokemonImages = {},
    totalImgMemory = 0;

class PokemonImage {
    constructor() {
        this.base = null;
        this.female = null;
        this.shiny = null;
        this.shinyFemale = null;
    }

    getImage(female, shiny) {
        if (female && shiny) {
            return this.shinyFemale || this.shiny || this.female || this.base;
        } else if (female) {
            return this.female || this.base;
        } else if (shiny) {
            return this.shiny || this.base;
        } else {
            return this.base;
        }
    }
}

function getImgSrcString(filePath, fileType) {
    let data = Buffer.from(fs.readFileSync(filePath)).toString('base64');
    return `data:image/${fileType};base64, ${data}`;
}

function loadImages(variant, dir) {
    if (!fs.existsSync(dir)) {
        console.warn(`Warning: Image directory '${dir}' does not exist.  Skipping.`);
        return;
    }

    let imagesFound = 0,
        files = fs.readdirSync(dir);

    for (let file of files) {
        let m = ImageRegex.exec(file),
            id = m && m[1],
            fileType = m && m[2];

        if (id) {
            if (parseInt(id) === 201) {
                // remove optional hyphen
                id = id.replace('-', '');
                let shinyUnown = id.endsWith('s');
                if (shinyUnown) {
                    id = id.replace('s', '');
                }

                if (!pokemonImages[id]) {
                    pokemonImages[id] = new PokemonImage();
                }

                imagesFound++;
                pokemonImages[id][shinyUnown ? 'shiny' : 'base'] = getImgSrcString(path.resolve(dir, file), fileType);
                continue;
            }

            if (!pokemonImages[id]) {
                pokemonImages[id] = new PokemonImage();
            }

            imagesFound++;
            pokemonImages[id][variant] = getImgSrcString(path.resolve(dir, file), fileType);
        }
    }

    console.log(`Found ${imagesFound} ${variant} images in ${fs.realpathSync(dir)}`);
}

function setEmptySlotImage(filePath) {
    filePath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(filePath)) {
        console.warn(`emptySlot image '${filePath}' does not exist.  Skipping.`);
        return;
    }

    let m = /\.(png|gif|jpg|jpeg|bmp)/i.exec(filePath);
    if (!m) {
        console.warn(`emptySlot image '${filePath}' has unrecognized image type.  Skipping.  Valid image extensions: png, gif, jpg, jepg, and bmp`);
        return;
    }

    pokemonImages['-1'] = {
        base: getImgSrcString(filePath, m[1]) 
    };
}

const validVariants = [
    'base',
    'female',
    'shiny',
    'shinyfemale',
    'unown',
    'emptySlot'
];

let paths = config.pokemonImagePaths;
if (!paths["base"]) {
    throw new Error(`config.json is missing 'base' in 'pokemonImagePaths' object`);
} else if (!fs.existsSync(path.resolve(__dirname, paths.base))) {
    throw new Error(`Specified pokemonImagePaths.base '${path.resolve(__dirname, paths.base)}' in config.json does not exist.`);
}

for (let [variant, varientPath] of Object.entries(paths)) {
    if (varientPath && validVariants.includes(variant)) {
        if (variant === 'emptySlot') {
            setEmptySlotImage(varientPath);
        } else {
            loadImages(variant, path.resolve(__dirname, varientPath));
        }
    } else {
        console.warn(`Invalid key 'pokemonImagePaths.${variant}' in config.json.  Valid keys are: ${validVariants.join(', ')}`);
    }
}

module.exports = pokemonImages;
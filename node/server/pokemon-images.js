import path from 'path';
import fs from 'fs';
import Config from './config';
import { ImageRegex, ShinyImageRegex, SupportedImageFormats, ConfigFile } from './constants';

let pokemonImages = {},
    gettingFormImages = false;

class PokemonImage {
    constructor() {
        this.base = null;
        this.female = null;
        this.shiny = null;
        this.shinyFemale = null;
        this.forms = {};
    }
    
    getImage(female, shiny, form) {
        if (form && this.forms[form]) {
            return this.forms[form].getImage(female, shiny) || this.base;
        }
        
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
        if (!gettingFormImages || variant === 'shiny') {
            console.warn(`Warning: Image directory '${dir}' does not exist.  Skipping.`);
        }

        return;
    }
    
    let imagesFound = 0;
    
    for (let file of fs.readdirSync(dir)) {
        let m, id, alternateForm, fileType,
        filePath = path.resolve(dir, file),
        shiny = variant.search('shiny') !== -1;
        
        if (!fs.lstatSync(filePath).isFile()) {
            // skip directories
            continue;
        }
        
        if (shiny) {
            m = ShinyImageRegex.exec(file);
        } else {
            m = ImageRegex.exec(file);
        }
        
        id = m && m[1];
        alternateForm = m && m[2];
        fileType = m && m[3];
        
        if (id) {
            if (!pokemonImages[id]) {
                pokemonImages[id] = new PokemonImage();
            }
            
            if (!alternateForm) {
                pokemonImages[id][variant] = getImgSrcString(filePath, fileType);
            } else {
                if (!pokemonImages[id].forms[alternateForm]) {
                    pokemonImages[id].forms[alternateForm] = new PokemonImage();
                }    
                
                pokemonImages[id].forms[alternateForm][variant] = getImgSrcString(filePath, fileType);                
            }
            
            imagesFound++;
        }
    }
    
    console.log(`Found ${imagesFound} ${variant} images in ${fs.realpathSync(dir)}`);
}

function setEmptySlotImage(filePath) {
    filePath = path.resolve(filePath);
    if (!fs.existsSync(filePath)) {
        console.warn(`emptySlot image '${filePath}' does not exist.  Skipping.`);
        return;
    }
    
    let m = /\.(png|gif|jpg|jpeg|bmp)/i.exec(filePath);
    if (!m) {
        console.warn(`emptySlot image '${filePath}' has unrecognized image type.  Skipping.  Valid image extensions: png, gif, jpg, jepg, and bmp`);
        return;
    }
    
    pokemonImages[-1] = {
        base: getImgSrcString(filePath, m[1]) 
    };
}

const basicImageDirs = {
    base: '.',
    female: 'female',
    shiny: 'shiny',
    shinyFemale: 'shiny/female'
};

function loadImageDir(dirPath) {
    for (let [variant, varientPath] of Object.entries(basicImageDirs)) {
        loadImages(variant, path.resolve(dirPath, varientPath));
    }
}

function initPokemonImages() {
    pokemonImages = {};
    gettingFormImages = false;

    if (!Config.Current.emptySlotImagePath) {
        console.warn('No specified empty slot image.  Skipping.');
    } else {
        setEmptySlotImage(Config.Current.emptySlotImagePath);
    }
    
    let basePath = path.resolve(__dirname, Config.Current.pokemonImagesPath),
        formsPath = path.resolve(basePath, 'forms');
    
    if (!fs.existsSync(basePath)) {
        throw new Error(`Specified pokemonImagePath '${basePath}' in ${ConfigFile} does not exist.`);
    }
    
    loadImageDir(basePath);
    
    if (!fs.existsSync(formsPath)) {
        console.warn(`No additional forms directory found at '${path.resolve(formsPath)}'.`);
        return;
    }
    
    gettingFormImages = true;
    for (let dir of fs.readdirSync(formsPath)) {
        let dirPath = path.resolve(formsPath, dir);
        if (!fs.lstatSync(dirPath).isDirectory()) {
            continue;
        }
        
        loadImageDir(dirPath);
    }
}

initPokemonImages();
Config.on('update', e => {
    if (e.prev.pokemonImagePath !== e.next.pokemonImagePath ||
        e.prev.emptySlotImagePath !== e.next.emptySlotImagePath) {
        console.log('Pokemon image paths in config changed.  Reloading all images.');
        initPokemonImages();
    }
});
    
export default pokemonImages;
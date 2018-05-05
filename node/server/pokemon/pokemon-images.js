import path from 'path';
import fs from 'fs';
import Config from '../config';
import { Image, Paths } from '../constants';
import PokemonImage from './pokemon-image';

const {
    ImageRegex, 
    ShinyImageRegex,
    EggImageRegex,
    SupportedImageFormats
} = Image;

const basicImageDirs = {
    base: '.',
    female: 'female',
    shiny: 'shiny',
    shinyFemale: 'shiny/female'
};

class PokemonImages {
    constructor() {
        this._images = {};
        this._gettingFormImages = false;

        this._initPokemonImages();

        Config.on('update', (p, n) => {
            if (p.pokemonImagesPath !== n.pokemonImagesPath ||
                p.emptySlotImagePath !== n.emptySlotImagePath) {
                console.log('Pokemon image paths in config changed.  Reloading all images.');
                this._initPokemonImages();
            }
        });
    }

    get(species) {
        return this._images[species];
    }

    _initPokemonImages() {
        this._images = {};
        this._gettingFormImages = false;
    
        if (!Config.emptySlotImagePath) {
            console.debug('No specified empty slot image.  Skipping.');
            this._images[-1] = new PokemonImage();
        } else {
            this._setEmptySlotImage(path.resolve(Paths.NodeRoot, Config.emptySlotImagePath));
        }
        
        let basePath = path.resolve(Paths.NodeRoot, Config.pokemonImagesPath),
            formsPath = path.resolve(basePath, 'forms');
        
        if (!fs.existsSync(basePath)) {
            throw new Error(`Specified pokemonImagePath '${basePath}' in config does not exist.`);
        }
        
        this._loadImageDir(basePath);
        
        if (!fs.existsSync(formsPath)) {
            console.warn(`No additional forms directory found at '${path.resolve(formsPath)}'.`);
            return;
        }
        
        this._gettingFormImages = true;
        for (let dir of fs.readdirSync(formsPath)) {
            let dirPath = path.resolve(formsPath, dir);
            if (!fs.lstatSync(dirPath).isDirectory()) {
                continue;
            }
            
            this._loadImageDir(dirPath);
        }
    }

    _getImgSrcString(filePath, fileType) {
        let data = Buffer.from(fs.readFileSync(filePath)).toString('base64');
        return `data:image/${fileType};base64, ${data}`;
    }

    _loadImages(variant, dir) {
        let basePath = path.resolve(Paths.NodeRoot, Config.pokemonImagesPath),
            formsPath = path.resolve(basePath, 'forms');

        if (!fs.existsSync(dir)) {
            // search for shiny/female variants for all normal forms
            // don't search for shiny/female variants of egg
            // otherwise make sure there is at least shiny variant for each alternate form
            if (!this._gettingFormImages || 
                (variant === 'shiny' && path.relative(formsPath, dir).search('egg') === -1)) {
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
                if (id === '0') {
                    // attempting to add an egg that is not an egg image
                    continue;
                }

                if (!this._images[id]) {
                    this._images[id] = makeImageProxy();
                }
                
                if (!alternateForm) {
                    this._images[id][variant] = this._getImgSrcString(filePath, fileType);
                } else {
                    if (!this._images[id].forms[alternateForm]) {
                        this._images[id].forms[alternateForm] = new PokemonImage();
                    }    
                    
                    this._images[id].forms[alternateForm][variant] = this._getImgSrcString(filePath, fileType);                
                }
                
                imagesFound++;
            } else if ((m = EggImageRegex.exec(file)) !== null) {
                if (this._images[0]) {
                    // already have an egg
                    continue;
                }

                fileType = m[3];
                
                this._images[0] = new PokemonImage();
                this._images[0]['base'] = this._getImgSrcString(filePath, fileType);
            }
        }
        
        console.debug(`Found ${imagesFound} ${variant} images in ${fs.realpathSync(dir)}`);
    }

    _setEmptySlotImage(filePath) {
        if (!fs.existsSync(filePath)) {
            console.warn(`emptySlot image '${filePath}' does not exist.  Skipping.`);
            return;
        }
        
        let m = /\.(png|gif|jpg|jpeg|bmp)/i.exec(filePath);
        if (!m) {
            console.warn(`emptySlot image '${filePath}' has unrecognized image type.  Skipping.  Valid image extensions: png, gif, jpg, jepg, and bmp`);
            return;
        }
        
        this._images[-1] = new PokemonImage();
        this._images[-1].base = this._getImgSrcString(filePath, m[1]);
    }

    _loadImageDir(dirPath) {
        for (let [variant, varientPath] of Object.entries(basicImageDirs)) {
            this._loadImages(variant, path.resolve(dirPath, varientPath));
        }
    }
}

function makeImageProxy() {
    return new Proxy(new PokemonImage(), {
        get: function(img, prop) {
            if (prop === 'getImage') {
                return (female, shiny, form, egg) => {
                    if (egg) {
                        return pokemonImages.get(0).base;
                    }

                    return img.getImage(female, shiny, form, egg);
                }
            }

            return img[prop];
        }
    });
}

const pokemonImages = new PokemonImages();
export default pokemonImages;
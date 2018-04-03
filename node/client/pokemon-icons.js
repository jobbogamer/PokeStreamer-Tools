import Pokedex from 'pokedex';

class PokemonIcons {
    constructor() {
        let req = require.context('../resources/icons/regular', false, /\.png$/);
        req.keys().forEach(fn => {
            let species = /([-a-zA-Z0-9]+)\.png$/.exec(fn)[1];
            this[species] = { regular: req(fn) };
        });
        
        req = require.context('../resources/icons/shiny', false, /\.png$/);
        req.keys().forEach(fn => {
            let species = /([-a-zA-Z0-9]+)\.png$/.exec(fn)[1];
            this[species].shiny = req(fn);
        });

        let egg = require('../resources/icons/egg.png');
        this.egg = { regular: egg, shiny: egg };
    }

    getIcon(pokemon) {
        if (pokemon.isEgg) {
            return this.egg.regular;
        }
        
        return this[Pokedex.FileNames[pokemon.species]][pokemon.shiny];
    }
}

const pi = new PokemonIcons();
export default pi;
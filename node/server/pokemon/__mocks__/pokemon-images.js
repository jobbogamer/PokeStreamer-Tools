import PokemonImage from '../pokemon-image';

const EggImg = new PokemonImage(),
    EmptyImg = new PokemonImage(),
    PkmnImg = new PokemonImage();

EggImg.base = 'egg';
EmptyImg.base = 'empty';
Object.assign(PkmnImg, {
    base: 'pkmn',
    female: 'female pkmn',
    shiny: 'shiny pkmn',
    shinyFemale: 'shiny female pkmn'
});

class PokemonImages {
    get(species) {
        switch (species) {
            case 0:
                return EggImg;
            case -1: 
                return EmptyImg;
            default:
                return PkmnImg;
        }
    }
}

export default new PokemonImages();
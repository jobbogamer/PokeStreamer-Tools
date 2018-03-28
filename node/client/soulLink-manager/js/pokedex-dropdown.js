import PokedexDropdown from '../templates/pokedex-dropdown.ejs';
import pokemonIcons from './pokemon-icons';

let dropdowns = {};

export default function getDropDown(pokemon) {
    let gen = pokemon.generation,
        shiny = pokemon.isShiny ? 'shiny' : 'regular';
    if (!dropdowns[gen]) {
        dropdowns[gen] = { regular: null, shiny: null };
    }

    if (!dropdowns[gen][shiny]) {
        dropdowns[gen][shiny] = $('<div>').append(PokedexDropdown({ pokemon, pokemonIcons }));
    }

    let dropdown = dropdowns[gen][shiny].clone();
    dropdown.find('select').on('change', function() {
        dropdown.find('img').attr('src', $(this).find(':selected').attr('data-img'));
    }).change();
    return dropdown;
}
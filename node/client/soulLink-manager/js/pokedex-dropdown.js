import PokedexDropdown from '../templates/pokedex-dropdown.ejs';
import pokemonIcons from '../../pokemon-icons';

let dropdowns = {};

export default function getDropDown(pokemon, selectedSpecies) {
    let gen = pokemon.generation,
        shiny = pokemon.isShiny ? 'shiny' : 'regular';
    if (!dropdowns[gen]) {
        dropdowns[gen] = { regular: null, shiny: null };
    }

    if (!dropdowns[gen][shiny]) {
        dropdowns[gen][shiny] = $(PokedexDropdown({ pokemon, pokemonIcons }));
    }

    let $dexDropdown = dropdowns[gen][shiny].clone(),
        $dropdown = $dexDropdown.filter('select'),
        $img = $dexDropdown.filter('img');

    $dropdown.children('option')
        .sort((o1, o2) => o1.value === "0" ? -1 : o1.dataset.speciesName > o2.dataset.speciesName ? 1 : -1)
        .appendTo($dropdown);

    $dropdown.val(selectedSpecies || 0);

    $dropdown.on('change', function () {
        $img.attr('src', $(this).find(':selected').attr('data-img'));
    }).change();
    
    return $dexDropdown;
}
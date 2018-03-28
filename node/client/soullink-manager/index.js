import Cookies from 'js-cookie';
import './sass/index.scss';
import config from 'config.json';
import PokemonRow from './templates/pokemon-row';
import { getGraveyardName } from './js/misc';
import pokemonRow from './templates/pokemon-row';
import Pokedex from '../../common/pokedex';
import PokemonIcons from './js/pokemon-icons';
import PokedexDropdown from './js/pokedex-dropdown';

$('#graveyardheader').text(getGraveyardName());

let doAutoLink = JSON.parse(Cookies.get('autolink') || true);
if (doAutoLink === undefined) {
    doAutoLink = true;
}

let icons = null; 

if (LINKING_METHOD !== 'manual') {
    let $autolink = $('input#autoLink');
    $autolink.prop('checked', doAutoLink);
    $autolink.on('change', function() {
        Cookies.set('autolink', this.checked);
    });
}

let unlinkedPokemon = [],
    unlinkedPartnerPokmeon = [],
    linkedPokemonPairs = [],
    lastLinkedPokemonPid;

const ws = new WebSocket(`ws://${API_BASE_URL}/soulLink`);

ws.addEventListener('message', e => {
    let msg = JSON.parse(e.data);
    switch (msg.messageType) {
        case 'addPokemon':
            addPokemon(msg);
            break;

        case 'newSoulLinkPokemon':
            addNewSoulLinkPokemon(msg);
            break;

        case 'killPokemon':
            killPokemon(msg);
            break;

        default:
            console.warn(`Unknown message type received from API: ${msg.messageType}`);
            return;
    }
});

function getIcon(pokemon) {
    return PokemonIcons[Pokedex.FileNames[pokemon.species]][pokemon.shiny];
}

function removePokemonRow(pokemon) {
    $(`#${pokemon.pid}`).remove();
}

function addPokemon(msg) {
    let {
        pokemon,

        linkedPokemon, // for when the pokemon already hasa a link (full Pokemon object, not just a pid)
        expectedPids // for when the incoming pokemon is not already linked in the system
    } = msg;

    pokemon.shiny = pokemon.isShiny ? 'shiny' : 'regular';
    pokemon.static = pokemon.staticId > 0 ? 'static' : '';
    pokemon.icon = getIcon(pokemon);

    removePokemonRow(pokemon);

    if (LINKING_METHOD === 'manual' && Number.isInteger(pokemon.linkedSpecies) && pokemon.linkedSpecies > -1) {
        linkedPokemon = {
            species: pokemon.linkedSpecies,
            speciesName: Pokedex[pokemon.linkedSpecies],
            shiny: pokemon.shiny
        };

        linkedPokemon.icon = getIcon(linkedPokemon);
    }

    let $newRow;
    if (linkedPokemon) {
        linkedPokemon.icon = getIcon(linkedPokemon);
        $newRow = $(PokemonRow.Linked({ pokemon, linked: linkedPokemon }));
        $newRow.prependTo(`tbody.linked-pokemon`);
    } else {
        if (LINKING_METHOD !== 'manual') {
            $newRow = $(PokemonRow.Unlinked({ 
                pokemon, 
                likelyMatches: pokemon.likelyMatches, 
                unlikelyMatches: pokemon.unlikelyMatches
            }));
        } else {
            $newRow = $(PokemonRow.Unlinked({ pokemon }));
            $newRow.find('div.dropdown').append(PokedexDropdown(pokemon));
        }

        $newRow.prependTo(`tbody.unlinked-pokemon`);
    }

    $newRow.find('[data-toggle="tooltip"]').tooltip('enable');
    setImmediate(() => $newRow.addClass('show'));
}

function addNewSoulLinkPokemon(msg) {
    let {
        pokemon,
        expectedPids
    } = msg;
}

function killPokemon(msg) {
    let {
        pokemon
    } = msg;

    removePokemonRow(pokemon);

    
}

$('.manager').on('click', '.btn-link', function() {

}).on('click', '.btn-void', function () {
    
});

window.onbeforeunload = () => ws.close();

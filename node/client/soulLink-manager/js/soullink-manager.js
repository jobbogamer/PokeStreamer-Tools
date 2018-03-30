import Cookies from 'js-cookie';
import config from 'config.json';
import ws from './websocket-listener';
import { getGraveyardName } from './misc';
import SoulLinkRow from './soullink-row';

$('#graveyardheader').text(getGraveyardName());
setInterval(() => $('#graveyardheader').text(getGraveyardName()), 5 * 60 * 1000);

const $dcModal = $('#disconnectedModal');
$dcModal.on('shown.bs.modal', () => {
    if (ws.connected) {
        $dcModal.modal('hide');
    }
});

ws.on('open', () => {
    $dcModal.modal('hide');
});
ws.on('close', () => {
    $dcModal.modal('show');
});

let doAutoLink = JSON.parse(Cookies.get('autolink') || true);
if (doAutoLink === undefined) {
    doAutoLink = true;
}

let icons = null; 

if (!MANUAL_LINKING) {
    let $autolink = $('input#autoLink');
    $autolink.prop('checked', doAutoLink);
    $autolink.on('change', function() {
        Cookies.set('autolink', this.checked);
    });
}

let knownPokemon = {};

ws.on('message', e => {
    let msg = JSON.parse(e.data);
    if (msg.messageType === 'add-pokemon' && !knownPokemon[msg.pokemon.pid]) {
        knownPokemon[msg.pokemon.pid] = new SoulLinkRow(msg);
    }
});

ws.init();

setTimeout(() => {
    if (!ws.connected) {
        $dcModal.modal('show');
    }
}, 100);

// function removePokemonRow(pokemon) {
//     let row = $(`#${pokemon.pid}`).attr('id', '').removeClass('show');
//     setTimeout(() => row.remove(), 500);
// }

// function addPokemon(msg) {
//     let {
//         pokemon,

//         linkedPokemon, // for when the pokemon already hasa a link (full Pokemon object, not just a pid)
//         expectedPids // for when the incoming pokemon is not already linked in the system
//     } = msg;

    

//     removePokemonRow(pokemon);

//     if (MANUAL_LINKING && Number.isInteger(pokemon.linkedSpecies) && pokemon.linkedSpecies > -1) {
//         linkedPokemon = {
//             species: pokemon.linkedSpecies,
//             speciesName: Pokedex[pokemon.linkedSpecies],
//             shiny: pokemon.shiny
//         };

//         linkedPokemon.icon = getIcon(linkedPokemon);
//     }

//     let $newRow;
//     if (linkedPokemon) {
//         linkedPokemon.icon = getIcon(linkedPokemon);
//         $newRow = $(PokemonRow.Linked({ pokemon, linked: linkedPokemon }));
//         $newRow.prependTo(`tbody.linked-pokemon`);

//         if (MANUAL_LINKING) {
//             $newRow.find('div.dropdown').append(PokedexDropdown(pokemon, linkedPokemon.species));
//         }
//     } else {
//         if (!MANUAL_LINKING) {
//             $newRow = $(PokemonRow.Unlinked({ 
//                 pokemon, 
//                 likelyMatches: pokemon.likelyMatches, 
//                 unlikelyMatches: pokemon.unlikelyMatches
//             }));
//         } else {
//             $newRow = $(PokemonRow.Unlinked({ pokemon }));
//             $newRow.find('div.dropdown').append(PokedexDropdown(pokemon));
//         }

//         $newRow.prependTo(`tbody.unlinked-pokemon`);
//     }

//     $newRow.find('[data-toggle="tooltip"]').tooltip('enable');
//     setImmediate(() => $newRow.addClass('show'));
// }

// function addNewSoulLinkPokemon(msg) {
//     let {
//         pokemon,
//         expectedPids
//     } = msg;
// }

// function killPokemon(msg) {
//     let {
//         pokemon
//     } = msg;

//     removePokemonRow(pokemon);
// }

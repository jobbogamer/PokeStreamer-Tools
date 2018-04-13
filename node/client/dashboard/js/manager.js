import Cookies from 'js-cookie';
import config from 'config.json';
import init from './init';
import './discord-connection-monitor';
import newGameModal from './new-game-modal';
import ws from './websocket';
import SoulLinkRow from './soullink-row';

// let doAutoLink = JSON.parse(Cookies.get('autolink') || true);
// if (doAutoLink === undefined) {
//     doAutoLink = true;
// }

// if (!MANUAL_LINKING) {
//     let $autolink = $('input#autoLink');
//     $autolink.prop('checked', doAutoLink);
//     $autolink.on('change', function () {
//         Cookies.set('autolink', this.checked);
//     });
// }

const $refreshBtn = $('.btn-refresh');
$refreshBtn.click(() => {
    $refreshBtn.addClass('spinning').disable();
    ws.send(JSON.stringify({ messageType: 'refresh' }));
});

let knownPokemon = {},
    initialRefreshTimeout;

// There's a race condition I can't find where sometimes (especially if you refresh the page too quickly or on the first
// load), the pokemon aren't being received when the ws is first opened.  This will automatically refresh in case this
// doesn't happen.
function queueRefresh() {
    initialRefreshTimeout = setTimeout(() => {
        if (ws.connected) {
            $refreshBtn.click();
        } else {
            queueRefresh();
        }
    }, 750);
}

ws.on('open', queueRefresh);

ws.on('message', e => {
    let msg = JSON.parse(e.data),
        pid, row;
    switch (msg.messageType) {
        case 'add-pokemon':
            if (!knownPokemon[msg.pokemon.pid]) {
                knownPokemon[msg.pokemon.pid] = new SoulLinkRow(msg);
            } else if (msg.isRefresh) {
                knownPokemon[msg.pokemon.pid].updateLink({ 
                    species: msg.pokemon.spcies, 
                    linkedSpecies: msg.pokemon.linkedSpecies 
                });
            }
            break;

        case 'refresh-done':
            clearTimeout(initialRefreshTimeout);
            $refreshBtn.enable().removeClass('spinning');
            break;

        case 'new-game':
            Object.values(knownPokemon).forEach(row => row.dispose());
            knownPokemon = {};
            break;

        case 'update-link':
            pid = parseInt(msg.pid);
            if (!pid) {
                // happens when we get an update from Discord about an unlinked pokemon
                return;
            }

            row = knownPokemon[pid];
            if (!row) {
                // TODO: figure out why this happens sometimes
                console.error(`Received update for pid ${pid} that has no associated row.`);
                return;
            }

            row.handleMessage(msg);
            break;
            
        case 'kill-pokemon':
        case 'revive-pokemon':
        case 'void-pokemon':
        case 'error':
            pid = parseInt(msg.pid);
            if (!pid) {
                console.error(`Received message type '${msg.messageType}' without a pid.`);
                return;
            }

            row = knownPokemon[pid];
            if (!row) {
                console.error(`Received update for pid ${pid} that has no associated row.`);
                return;
            }

            row.handleMessage(msg);
            break;
    }
});

init();
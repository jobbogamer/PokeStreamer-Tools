import Cookies from 'js-cookie';
import config from 'config.json';
import init from './init';
import './discord-connection-monitor';
import newGameModal from './new-game-modal';
import ws from './websocket';
import SoulLinkRow from './soullink-row';
import NuzlockeRow from './nuzlocke-row';

const $refreshBtn = $('.btn-refresh');
$refreshBtn.click(() => {
    $refreshBtn.addClass('spinning').disable();
    pokemonFromRefresh = new Set();
    ws.send(JSON.stringify({ messageType: 'refresh' }));
});

let knownPokemon = {},
    initialRefreshTimeout,
    pokemonFromRefresh = new Set();

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
            pid = msg.pokemon.pid;
            if (!knownPokemon[pid]) {
                if (SOULLINK_ENABLED) {
                    knownPokemon[pid] = new SoulLinkRow(msg);
                } else {
                    knownPokemon[pid] = new NuzlockeRow(msg);
                }
            }

            if (msg.isRefresh) {
                pokemonFromRefresh.add(msg.pokemon.pid);
            }
            break;

        case 'refresh-done':
            clearTimeout(initialRefreshTimeout);
            Object.keys(knownPokemon).filter(p => !pokemonFromRefresh.has(parseInt(p))).forEach(p => {
                knownPokemon[p].removeRow();
                delete knownPokemon[p];
            });
            $refreshBtn.enable().removeClass('spinning');
            break;

        case 'new-game':
            Object.values(knownPokemon).forEach(row => row.removeRow());
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
            
        case 'update-pokemon':
        case 'set-static-pokemon':
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
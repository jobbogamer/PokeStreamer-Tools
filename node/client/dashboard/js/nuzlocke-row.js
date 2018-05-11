import ws from './websocket';
import config from 'config.json';

import ManagerRow from './manager-row';
import { LivingRow, GraveyardRow } from './row-types';

import PokemonCell from '../templates/pokemon-cell.ejs';
import TooltipTemplate from '../templates/tooltip-template.ejs';

import Icons from '../../pokemon-icons';
import { useReviveButton } from './graveyard';

const $living = $('#pokemonTable > tbody.living-pokemon'),
    $graveyard = $('#pokemonTable > tbody.graveyard');

class NuzlockeRow extends ManagerRow {
    constructor(msg) {
        super(msg);

        if (SOULLINK_ENABLED) {
            throw new Error('Attempt to create a Nuzlocke row when SoulLink is enabled');
        }
        
        this.addRow();
    }

    addRow() {
        let $row, $container;
        if (this.pokemon.dead) {
            $row = this.createGraveyardRow();
            $container = $graveyard;
        } else {
            $row = this.createLivingRow();
            $container = $living;
        }

        super.addRow($container, $row);
    }

    createLivingRow() {
        let $row = $(LivingRow(this));
        return $row;
    }

    createGraveyardRow() {
        let $row = $(GraveyardRow(Object.assign({ useReviveButton }, this))),
            $reviveBtn = $row.find('button.btn-revive');
            
        $reviveBtn.click(() => {
            this.sendNuzlockeMessage('revive-pokemon');
        });
        return $row;
    }

    handleMessage(msg) {
        if (super.handleMessage(msg)) {
            return;
        }

        switch (msg.messageType) {
            case 'update-pokemon':
                this.pokemon = pokemon;
                this.$row.find('td.pokemon > div').replaceWith(PokemonCell(this.pokemon));
                break;

            case 'revive-pokemon':
                if (this.pokemon.dead || this.$row.closest('tbody').is('.graveyard')) {
                    this.pokemon.dead = false;
                    this.addRow();
                }
                break;

            case 'kill-pokemon':
                if (!this.pokemon.dead || this.$row.closest('tbody').is(':not(.graveyard)')) {
                    this.pokemon.dead = true;
                    this.addRow();
                }
                break;

            default:
                console.error(`Received unknown message type from server: ${msg.messageType}`);
                return;
        }
    }

    sendNuzlockeMessage(messageType, ...args) {
        let msg = {
            messageType,
        };

        switch (messageType) {
            case 'revive-pokemon':
                // pass
                break;

            default:
                this.setErrorState(`Unknown message type: ${messageType}`);
                return;
        }

        super.sendMessage(msg);
    }
}

export default NuzlockeRow;
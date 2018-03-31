import ws from './websocket';
import config from 'config.json';
import { useReviveButton } from './graveyard';
import { LinkedRow, GraveyardRow, UnlinkedRow } from './row-types';
import PokedexDropdown from './pokedex-dropdown';
import PokemonCell from '../templates/pokemon-cell.ejs';
import Pokedex from 'pokedex';
import Icons from '../../pokemon-icons';

const $unlinked = $('#pokemonTable > tbody.unlinked-pokemon'),
    $linked = $('#pokemonTable > tbody.linked-pokemon'),
    $graveyard = $('#pokemonTable > tbody.graveyard'),
    ManualLinking = MANUAL_LINKING; // make this a variable so that lines don't get screwed up while testing

function createManualLinkedPokemon(pokemon) {
    let lp = null;
    if (Number.isInteger(pokemon.linkedSpecies) && pokemon.linkedSpecies > -1) {
        lp = {
            species: pokemon.linkedSpecies,
            speciesName: Pokedex[pokemon.linkedSpecies],
            shiny: pokemon.shiny
        };

        lp.icon = Icons.getIcon(lp);
    }
    
    return lp;
}

class SoulLinkRow {
    constructor(msg) {
        ws.on('message', this.onMessage.bind(this));

        this.setErrorState = this.setErrorState.bind(this);
        this.clearErrorState = this.clearErrorState.bind(this);

        let {
            pokemon,
            linkedPokemon,
        } = msg;

        pokemon.shiny = pokemon.isShiny ? 'shiny' : 'regular';
        pokemon.static = pokemon.staticId > 0 ? 'static' : '';
        pokemon.icon = Icons.getIcon(pokemon);

        this.pokemon = pokemon;
        this.pid = pokemon.pid;

        this.linkedPokemon = linkedPokemon || null;

        if (!ManualLinking) {
            this.expectedPids = msg.expectedPids;
        } else {
            this.linkedPokemon = createManualLinkedPokemon(pokemon);
        }

        this.addRow();
    }

    addRow() {
        this.removeRow();

        if (this.pokemon.dead || this.pokemon.isVoid) {
            this.addGraveyardRow();
        } else if (this.linkedPokemon) {
            this.addLinkedRow();
        } else {
            this.addUnlinkedRow();
        }

        this.defaultRowClasses = this.$row.attr('class');

        setImmediate(() => this.$row.addClass('show').find('.traits .icon').tooltip());
    }

    addLinkedRow() {
        let $row = this.$row = $(LinkedRow(this));
        $linked.prepend($row);
        $row.find('button.btn-unlink').click(() => {
            this.sendMessage('unlink');
        });

        if (ManualLinking) {
            $row.find('div.dropdown').append(PokedexDropdown(this.pokemon, this.linkedPokemon.species));
            let $select = $row.find('div.dropdown select'),
                $updateBtn = $row.find('button.btn-update-link'),
                $linkDeadBtn = $row.find('button.btn-link-dead');

            $select.change(() => {
                if (parseInt($select.val()) === this.pokemon.linkedSpecies) {
                    $updateBtn.disable();
                } else {
                    $updateBtn.enable();
                }
            });

            $updateBtn.click(() => {
                this.sendMessage('update-link', parseInt($select.val()));
            });

            $linkDeadBtn.click(() => {
                this.sendMessage('kill-pokemon');
            });
        }
    }

    addUnlinkedRow() {
        let $row = this.$row = $(UnlinkedRow(this));

        if (ManualLinking) {
            $row.find('div.dropdown').append(PokedexDropdown(this.pokemon));            
        }

        let $linkBtn = $row.find('button.btn-add-link'),
            $voidBtn = $row.find('button.btn-void'),
            $select = $row.find('div.dropdown select');

        $unlinked.prepend($row);
        $linkBtn.click(() => {
            // val with either be the species or the PID depending on whether the linking is manual or automatic
            this.sendMessage('update-link', parseInt($select.val()));
        });

        $voidBtn.click(() => {
            this.sendMessage('void-pokemon');
        });
    }

    addGraveyardRow() {
        let $row = this.$row = $(GraveyardRow(Object.assign({ useReviveButton }, this))),
            $reviveBtn = $row.find('button.btn-revive');

        $graveyard.prepend($row);
            
        $reviveBtn.click(() => {
            this.sendMessage('revive-pokemon');
        });
    }

    removeRow() {
        if (this.$row) {
            let $oldRow = this.$row.attr('id', '').removeClass('show');
            this.$row = null;
            setTimeout(() => $oldRow.remove(), 500);
        }
    }

    // handles both the case when your pokemon evolves
    // and when the linked species changes either because it evolved or because we changed it manually
    updateLink(msg) {
        let {
            species,
            linkedSpecies
        } = msg;
        
        if (species !== undefined && this.pokemon.species !== species) {
            this.pokemon.species = species;
            this.$row.find('td.pokemon > div').replaceWith(PokemonCell(this.pokemon));
        }

        if (linkedSpecies !== undefined) {
            this.pokemon.linkedSpecies = linkedSpecies;
            if (this.linkedPokemon && linkedSpecies === null) {
                let oldLink = this.linkedPokemon.species;
                this.linkedPokemon = null;
                this.addRow();
                this.$row.find('select').val(oldLink).change();
                return;
            } else if (!this.linkedPokemon) {
                this.linkedPokemon = createManualLinkedPokemon(this.pokemon);
                this.addRow();
                return;
            } else if (this.linkedPokemon.species !== linkedSpecies) {
                if (ManualLinking) {
                    this.$row.find('td.linked-pokemon > div.dropdown select').val(linkedSpecies).change();
                    this.linkedPokemon.species = linkedSpecies;
                } else {
                    this.$row.find('td.pokemon > div').replaceWith(PokemonCell(this.linkedPokemon));
                }
            }
        }
    }

    onMessage(e) {
        let msg = JSON.parse(e.data),
            pid = parseInt(msg.pid);
        if (!pid || pid !== this.pid) {
            return;
        }

        this.clearErrorState();

        switch (msg.messageType) {
            case 'update-link': 
                this.updateLink(msg);
                break;
            
            case 'kill-pokemon':
                if (!this.pokemon.dead || this.$row.closest('tbody').is(':not(.graveyard)')) {
                    this.pokemon.dead = true;
                    this.addRow();
                }

                break;

            case 'revive-pokemon':
                if (this.pokemon.dead || this.$row.closest('tbody').is('.graveyard')) {
                    this.pokemon.dead = false;
                    this.pokemon.isVoid = false;
                    this.addRow();
                }

                break;

            case 'void-pokemon':
                if (!this.pokemon.dead || this.$row.closest('tbody').is(':not(.graveyard)')) {
                    this.pokemon.dead = true;
                    this.pokemon.linkedPokemon = null;
                    this.addRow();
                }

                break;

            default:
                console.error(`Received unknown message type from server: ${msg.messageType}`);
                return;
        }
    }

    sendMessage(messageType, ...args) {
        this.$row.removeClass('bg-danger text-white').addClass(this.defaultRowClasses).find('button, select').disable();
        this.reenableTimeout = setTimeout(() => this.setErrorState(`There was no response from the server.`), 2000);
        let msg = {
            messageType,
            pid: parseInt(this.pid)
        };

        switch (messageType) {
            case 'update-link':
                if (!ManualLinking) {
                    this.setErrorState(`Cannot update a pokemon link manually when linking is automatic.  How did you even get here?`);
                    return;
                }

                msg.linkedSpecies = args[0];
                ws.send(JSON.stringify(msg));
                break;

            case 'kill-pokemon':
            case 'unlink':
            case 'revive-pokemon':
            case 'void-pokemon':
                ws.send(JSON.stringify(msg));
                break;

            default:
                this.setErrorState(`Unknown message type: ${messageType}`);
                break;
        }
    }

    setErrorState(message) {
        this.$row.removeClass(this.defaultRowClasses);
        this.$row.addClass('bg-danger text-white').find('button, select').enable().filter('select').change();
        if (message) {
            console.error(message);
            this.$row.tooltip({
                title: message,
                container: 'body',
                template: '<div class="tooltip" role="tooltip"><div class="arrow arrow-danger"></div><div class="tooltip-inner bg-danger"></div></div>',
            });
        } else {
            this.$row.tooltip('dispose');
        }

        clearTimeout(this.reenableTimeout);
    }

    clearErrorState() {
        this.$row.removeClass('bg-danger text-white').addClass(this.defaultRowClasses)
            .tooltip('dispose').find('button, select').enable().filter('select').change();
        clearTimeout(this.reenableTimeout);
    }

    dispose() {
        this.removeRow();
        ws.removeListener('message', this.onMessage);
    }
}

export default SoulLinkRow;
import ws from './websocket';
import config from 'config.json';

import LinkDropdown from '../templates/link-dropdown.ejs';
import PokemonDropdownOption from '../templates/pokemon-dropdown-option.ejs';
import PokemonCell from '../templates/pokemon-cell.ejs';
import TooltipTemplate from '../templates/tooltip-template.ejs';

import { useReviveButton } from './graveyard';
import { LinkedRow, GraveyardRow, UnlinkedRow } from './row-types';
import PokedexDropdown from './pokedex-dropdown';
import Pokedex from 'pokedex';
import Icons from '../../pokemon-icons';
import UnlinkedPartnerPokemon from './unlinked-partner-pokemon';

const $unlinked = $('#pokemonTable > tbody.unlinked-pokemon'),
    $linked = $('#pokemonTable > tbody.linked-pokemon'),
    $graveyard = $('#pokemonTable > tbody.graveyard');

function createManualLinkedPokemon(pokemon) {
    if (!MANUAL_LINKING) {
        console.warn(`Called createManualLinkedPokemon() when linking method is not set to 'manual'`);
    }

    let lp = null;
    if (Number.isInteger(pokemon.linkedSpecies) && pokemon.linkedSpecies > -1) {
        lp = {
            species: pokemon.linkedSpecies,
            speciesName: Pokedex[pokemon.linkedSpecies],
            isShiny: pokemon.isShiny
        };

        lp.icon = Icons.getIcon(lp);
    }
    
    return lp;
}

class SoulLinkRow {
    constructor(msg) {
        this.setErrorState = this.setErrorState.bind(this);
        this.clearErrorState = this.clearErrorState.bind(this);
        this.onMessage = this.handleMessage.bind(this);
        this._addUnlinkedPokemonOption = this._addUnlinkedPokemonOption.bind(this);
        this._updateUnlinkedPokemonOption = this._updateUnlinkedPokemonOption.bind(this);
        this._removeUnlinkedPokemonOption = this._removeUnlinkedPokemonOption.bind(this);

        let pokemon = msg.pokemon;

        pokemon.static = pokemon.staticId > 0 ? 'static' : '';
        pokemon.icon = Icons.getIcon(pokemon);

        this.pokemon = pokemon;
        this.pid = pokemon.pid;

        this.linkedPokemon = pokemon.link || null;

        if (MANUAL_LINKING) {
            this.linkedPokemon = createManualLinkedPokemon(pokemon);
        }

        this.addRow();
    }

    addRow() {
        this.removeRow();

        if (!MANUAL_LINKING && this.linkedPokemon) {
            this.linkedPokemon.icon = Icons.getIcon(this.linkedPokemon);
        }
        
        if (this.pokemon.dead || this.pokemon.isVoid) {
            this.addGraveyardRow();
        } else if (this.linkedPokemon) {
            this.addLinkedRow();
        } else {
            this.addUnlinkedRow();
        }

        this.defaultRowClasses = this.$row.attr('class');

        setTimeout(() => this.$row.addClass('show').find('.traits .icon').tooltip(), 20);
    }

    addLinkedRow() {
        let $row = this.$row = $(LinkedRow(this));
        $linked.prepend($row);
        $row.find('button.btn-unlink').click(() => {
            this.sendMessage('unlink');
        });

        if (MANUAL_LINKING) {
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

        if (MANUAL_LINKING) {
            $row.find('div.dropdown').append(PokedexDropdown(this.pokemon));            
        } else {
            $row.find('div.dropdown').append(LinkDropdown({ Icons, Pokedex, unlinkedPartnerPokemon: UnlinkedPartnerPokemon.pokemon }));
        }

        let $linkBtn = $row.find('button.btn-add-link'),
            $voidBtn = $row.find('button.btn-void'),
            $select = $row.find('div.dropdown select'),
            $icon = $row.find('div.dropdown img');

        if (!MANUAL_LINKING) {
            if ($select.children('option').length === 1) {
                $select.val(-1).addClass('no-links');
            } else {
                $select.removeClass('no-links');
            }

            $select.on('change', () => {
                if (parseInt($select.val()) === -1 || $select.children('option').length === 1) {
                    $linkBtn.disable();
                    $icon.removeAttr('src');
                } else {
                    $linkBtn.enable();
                    setImmediate(() => $icon.attr('src', $select.find(':selected').attr('data-img')));
                }
            }).change();

            UnlinkedPartnerPokemon.on('add', this._addUnlinkedPokemonOption);
            UnlinkedPartnerPokemon.on('update', this._updateUnlinkedPokemonOption);
            UnlinkedPartnerPokemon.on('remove', this._removeUnlinkedPokemonOption);
        }

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
            
            if (!MANUAL_LINKING && $oldRow.closest('tbody').is('.unlinked-pokemon')) {
                UnlinkedPartnerPokemon.removeListener('add', this._addUnlinkedPokemonOption);
                UnlinkedPartnerPokemon.removeListener('update', this._updateUnlinkedPokemonOption);
                UnlinkedPartnerPokemon.removeListener('remove', this._removeUnlinkedPokemonOption);
            }

            setTimeout(() => $oldRow.remove(), 500);
        }
    }

    // handles both the case when your pokemon evolves and when the linked species changes either because it evolved or
    // because we changed it manually
    updateLink(msg) {
        let {
            pokemon,
            link
        } = msg;
        
        if (pokemon !== undefined) {
            this.pokemon = pokemon;
            this.$row.find('td.pokemon > div').replaceWith(PokemonCell(this.pokemon));
        }

        if (link !== undefined) {
            if (MANUAL_LINKING) {
                // link is a species
                this.pokemon.linkedSpecies = link;
                if (this.linkedPokemon && link === null) {
                    let oldLink = this.linkedPokemon.species;
                    this.linkedPokemon = null;
                    this.addRow();
                    this.$row.find('select').val(oldLink).change();
                } else if (!this.linkedPokemon) {
                    this.linkedPokemon = createManualLinkedPokemon(this.pokemon);
                    this.addRow();
                } else if (this.linkedPokemon.species !== link) {
                    this.$row.find('td.linked-pokemon > div.dropdown select').val(link).change();
                    this.linkedPokemon.species = link;
                }
            } else {
                // link is a pokemon
                if (this.linkedPokemon && link === null) {
                    let oldLink = this.linkedPokemon.pid;
                    this.linkedPokemon = null;
                    this.addRow();
                    this.$row.find('select').val(oldLink).change();
                } else if (!this.linkedPokemon) {
                    this.linkedPokemon = UnlinkedPartnerPokemon.pokemon[link.pid] || UnlinkedPartnerPokemon.linkedPokemon[this.pokemon.pid];
                    this.addRow();
                } else if (this.linkedPokemon.pid === link.pid) {
                    link.icon = Icons.getIcon(link);
                    this.linkedPokemon = link;
                    this.$row.find('td.linked-pokemon > div').replaceWith(PokemonCell({ pokemon: link }));
                }
            }
        }
    }

    handleMessage(msg) {
        let pid = parseInt(msg.pid);
        if (!pid || pid !== this.pid) {
            console.error(`Row ${this.pid} received mismatched message type '${msg.messageType}' from soullink-manager for pid ${pid}`);
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

            case 'error':
                this.setErrorState(msg.errorMessage);
                break;

            default:
                console.error(`Received unknown message type from server: ${msg.messageType}`);
                return;
        }
    }

    sendMessage(messageType, ...args) {
        this.$row.removeClass('bg-danger text-white').addClass(this.defaultRowClasses).find('button, select').disable();
        this.reenableTimeout = setTimeout(() => this.setErrorState(`There was no response from the server.`), 5000);
        let msg = {
            messageType,
            pid: parseInt(this.pid)
        };

        switch (messageType) {
            case 'update-link':
                msg.link = args[0];
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
                template: TooltipTemplate({ variant: 'danger' }),
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
        ws.removeListener('message', this.handleMessage);
    }

    _addUnlinkedPokemonOption(ulp) {
        this.$row.find('.dropdown select')
            .not(`:has(option[value="${ulp.pid}"])`)
            .prepend(PokemonDropdownOption({ Icons, Pokedex, pokemon: ulp }))
            .change()
            .removeClass('no-links')
            .filter(function () { return $(this).children('option').length === 2; })
            .val(ulp.pid);
    }

    _updateUnlinkedPokemonOption(ulp)  {
        this.$row.find(`.dropdown select option[value="${ulp.pid}"]`)
            .attr('data-img', Icons[Pokedex.FileNames[ulp.species]][ulp.isShiny ? 'shiny' : 'regular'])
            .text(`${ulp.speciesName}${ulp.nickname ? ' / ' + ulp.nickname : ''}`)
            .change();
    }

    _removeUnlinkedPokemonOption(pid) {
        let $select = this.$row.find('.dropdown select').find(`option[value="${pid}"]`).remove().end();
        if ($select.children('option').length === 1) {
            $select.val(-1).addClass('no-links');
        }

        $select.change();
    }
}

export default SoulLinkRow;
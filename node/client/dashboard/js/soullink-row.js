import ws from './websocket';
import config from 'config.json';

import ManagerRow from './manager-row';
import { LinkedRow, GraveyardRow, UnlinkedRow } from './row-types';

import LinkDropdown from '../templates/link-dropdown.ejs';
import PokemonDropdownOption from '../templates/pokemon-dropdown-option.ejs';
import PokemonCell from '../templates/pokemon-cell.ejs';
import TooltipTemplate from '../templates/tooltip-template.ejs';

import { useReviveButton } from './graveyard';
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

class SoulLinkRow extends ManagerRow {
    constructor(msg) {
        super(msg);

        if (!SOULLINK_ENABLED) {
            throw new Error('Attempt to create a SoulLink row when SoulLink is disabled');
        }

        this._addUnlinkedPokemonOption = this._addUnlinkedPokemonOption.bind(this);
        this._updateUnlinkedPokemonOption = this._updateUnlinkedPokemonOption.bind(this);
        this._removeUnlinkedPokemonOption = this._removeUnlinkedPokemonOption.bind(this);

        let pokemon = this.pokemon;
        this.linkedPokemon = pokemon.link || null;

        if (MANUAL_LINKING) {
            this.linkedPokemon = createManualLinkedPokemon(pokemon);
        }

        this.addRow();
    }

    addRow() {
        if (!MANUAL_LINKING && this.linkedPokemon && !this.linkedPokemon.isEmpty) {
            this.linkedPokemon.icon = Icons.getIcon(this.linkedPokemon);
        }

        let $row, $container;
        if (this.pokemon.dead || this.pokemon.isVoid) {
            $row = this.createGraveyardRow();
            $container = $graveyard;
        } else if (this.linkedPokemon) {
            $row = this.createLinkedRow();
            $container = $linked;
        } else {
            $row = this.createUnlinkedRow();
            $container = $unlinked;
        }

        super.addRow($container, $row);
    }

    createLinkedRow() {
        let $row = $(LinkedRow(this));
        $row.find('button.btn-unlink').click(() => {
            this.sendSoulLinkMessage('unlink');
        });

        if (MANUAL_LINKING) {
            $row.find('div.link-dropdown').append(PokedexDropdown(this.pokemon, this.linkedPokemon.species));
            let $select = $row.find('div.link-dropdown select'),
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
                this.sendSoulLinkMessage('update-link', parseInt($select.val()));
            });

            $linkDeadBtn.click(() => {
                this.sendSoulLinkMessage('kill-pokemon');
            });
        }

        return $row;
    }

    createUnlinkedRow() {
        let $row = $(UnlinkedRow(this));

        if (MANUAL_LINKING) {
            $row.find('div.link-dropdown').append(PokedexDropdown(this.pokemon));            
        } else {
            $row.find('div.link-dropdown').append(LinkDropdown({ Icons, Pokedex, unlinkedPartnerPokemon: UnlinkedPartnerPokemon.pokemon }));
        }

        let $linkBtn = $row.find('button.btn-add-link'),
            $voidBtn = $row.find('button.btn-void'),
            $select = $row.find('div.link-dropdown select'),
            $icon = $row.find('div.link-dropdown img');

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

        $linkBtn.click(() => {
            // val with either be the species or the PID depending on whether the linking is manual or automatic
            this.sendSoulLinkMessage('update-link', parseInt($select.val()));
        });

        $voidBtn.click(() => {
            this.sendSoulLinkMessage('void-pokemon');
        });

        return $row;
    }

    createGraveyardRow() {
        let $row = $(GraveyardRow(Object.assign({ useReviveButton }, this))),
            $reviveBtn = $row.find('button.btn-revive');
            
        $reviveBtn.click(() => {
            this.sendSoulLinkMessage('revive-pokemon');
        });

        return $row;
    }

    removeRow() {
        let $oldRow = super.removeRow();
        if (!MANUAL_LINKING && $oldRow && $oldRow.closest('tbody').is('.unlinked-pokemon')) {
            UnlinkedPartnerPokemon.removeListener('add', this._addUnlinkedPokemonOption);
            UnlinkedPartnerPokemon.removeListener('update', this._updateUnlinkedPokemonOption);
            UnlinkedPartnerPokemon.removeListener('remove', this._removeUnlinkedPokemonOption);
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
                    this.$row.find('td.linked-pokemon > div.link-dropdown select').val(link).change();
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
        if (super.handleMessage(msg)) {
            return;
        }

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

    sendSoulLinkMessage(messageType, ...args) {
        let msg = {
            messageType,
        };

        switch (messageType) {
            case 'update-link':
                msg.link = args[0];
                break;

            case 'kill-pokemon':
            case 'unlink':
            case 'revive-pokemon':
            case 'void-pokemon':
                break;

            default:
                this.setErrorState(`Unknown message type: ${messageType}`);
                return;
        }

        super.sendMessage(msg);
    }

    _addUnlinkedPokemonOption(ulp) {
        this.$row.find('.link-dropdown select')
            .not(`:has(option[value="${ulp.pid}"])`)
            .prepend(PokemonDropdownOption({ Icons, Pokedex, pokemon: ulp }))
            .change()
            .removeClass('no-links')
            .filter(function () { return $(this).children('option').length === 2; })
            .val(ulp.pid);
    }

    _updateUnlinkedPokemonOption(ulp)  {
        this.$row.find(`.link-dropdown select option[value="${ulp.pid}"]`)
            .attr('data-img', Icons[Pokedex.FileNames[ulp.species]][ulp.isShiny ? 'shiny' : 'regular'])
            .text(`${ulp.speciesName}${ulp.nickname ? ' / ' + ulp.nickname : ''}`)
            .change();
    }

    _removeUnlinkedPokemonOption(pid) {
        let $select = this.$row.find('.link-dropdown select').find(`option[value="${pid}"]`).remove().end();
        if ($select.children('option').length === 1) {
            $select.val(-1).addClass('no-links');
        }

        $select.change();
    }
}

export default SoulLinkRow;
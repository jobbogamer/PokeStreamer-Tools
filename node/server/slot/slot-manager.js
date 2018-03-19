import EventEmitter from 'events';
import Config from '../config';
import Pokemon from '../pokemon/pokemon';
import Slot from './slot';
import SoulLink from '../soul-link';

const PartySize = 6;
const StorageBoxes = 18;
const BoxSize = 30;

let _playerParty = [];
let _slParty = [];

let _playerBank = [];
let _slBank = [];

let newGame = false;

let scriptChangeIds = [-1, -1, -1, -1, -1, -1];
let soulLinkChangeIDs = [-1, -1, -1, -1, -1, -1];

let slotChangeIds = [-1, -1, -1, -1, -1, -1];

function initSlots(which) {
    let doPlayer = !which || which === 'player',
        doSoulLink = !which || which === 'soulLink';

    if (doPlayer) {
        _playerParty = [];
        _playerBank = [];
    }
    
    if (doSoulLink) {
        _slParty = [];
        _slBank = [];
    }

    for (let i = 0; i < PartySize; i++) {
        doPlayer && _playerParty.push(Slot.empty(i));
        doSoulLink && _slParty.push(Slot.empty(i));
    }
    
    for (let i = 0; i < StorageBoxes; i++) {
        doPlayer && _playerBank.push([]);
        doSoulLink && _slBank.push([]);
        for (let j = 0; j < BoxSize; j++) {
            doPlayer && _playerBank[i].push(Slot.emptyBox(i, j));
            doSoulLink && _slBank[i].push(Slot.emptyBox(i, j));
        }
    }
}

class SlotManager extends EventEmitter {
    constructor() {
        super();
        initSlots();

        SoulLink.on('update', this._handleSoulLinkUpdate);
    }
    
    resetPlayer() {
        initSlots('player');
    }

    resetSoulLink() {
        initSlots('soulLink');
    }

    get currentSlots() {
        let slots = [];
        for (let i = 0; i < PartySize; i++) {
            let slot = Object.assign({}, _playerParty[i]);
            slot.slChangeId = 
            slots.push()
        }
        return _playerParty;
    }
    
    updatePartySlot(...args) {
        let result = this._updatePartySlot(_playerParty, ...args);
        if (result) {
            result.player = 'player';
            result.container = 'party';
            this.emit('update', result);
        }

        let pokemon = result.newSlot.pokemon;

        if (newGame && !pokemon.isEmpty) {
            SoulLink.newGame(pokemon.otid, pokemon.ostid);
            newGame = false;
            return;
        }

        if (result.changeId > -1 && result.newSlot.pokemon.isEmpty) {
            for (let slot of _playerParty) {
                if (slot.changeId < 0 || !slot.pokemon.isEmpty) {
                    return;
                }
            }
        }

        newGame = true;
    }
    
    updateBankSlot(...args) {
        let result = this._updateBankSlot(_playerBank, ...args);
        if (result) {
            result.player = 'player';
            result.container = 'bank';
            this.emit('update', result);
        }
    }
    
    updateSoulLinkPartySlot(...args) {
        let result = this._updatePartySlot(_slParty, ...args);
        if (result) {
            result.player = 'soulLink';
            result.container = 'party';
            this.emit('update', result);
        }
    }
    
    updateSoulLinkBankSlot(...args) {
        let result = this._updateBankSlot(_slBank, ...args);
        if (result) {
            result.player = 'soulLink';
            result.container = 'bank';
            this.emit('update', result);
        }
    }

    _updatePartySlot(partySlots, slotId, changeId, pokemon) {
        if (partySlots[slotId].changeId >= changeId) {
            return false;
        }

        let slots = {
            oldSlot: partySlots[slotId],
            newSlot: pokemon ? new Slot(slotId, changeId, pokemon) : Slot.empty(slotId, changeId)
        };

        partySlots[slotId] = slots.newSlot;
        return slots;
    }

    _updateBankSlot(bankSlots, boxId, slotId, changeId, pokemon) {
        if (bankSlots[boxId][slotId].changeId >= changeId) {
            return false;
        }

        let slots = {
            oldSlot: bankSlots[boxId][slotId],
            newSlot: pokemon ? new Slot(slotId, changeId, pokemon, boxId) : Slot.emptyBox(boxId, slotId, changeId)
        };

        bankSlots[boxId][slotId] = slots.newSlot;
        return slots;
    }

    _handleSoulLinkUpdate(e) {}
}

const manager = new SlotManager();
export default manager;
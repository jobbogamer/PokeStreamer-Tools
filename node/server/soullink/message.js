import assert from 'assert';
import _ from 'lodash';
import https from 'https';
import Discord from 'discord.js';
import Pokemon from '../pokemon/pokemon';
import SoulLink from './soullink';

const messageTypes = [
    'new-game',
    'update-party',
    'update-pokemon',
    'update-link',
    'd',
    'request-data-dump',
    'request-pokemon',
    'message-file'
];

class SoulLinkMessage {
    constructor(messageType) {
        assert(!!messageType, `Argument 'messageType' must have a value.`);
        assert(messageTypes.indexOf(messageType) > -1, `Invalid messageType: ${messageType}`);

        this.mt = messageType;
    }

    // just a wrapper for readability
    get messageType() {
        return this.mt;
    }

    static async parse(msg) {
        try {
            let data = JSON.parse(msg);
            if (Array.isArray(data)) {
                return Promise.all(data.map(m => SoulLinkMessage.parse(JSON.stringify(m))));
            }

            switch (data.mt) {
                case 'new-game':
                    return new NewGame();
                case 'update-party':
                    return new UpdateParty(data.addedPids, data.removedPids);
                case 'update-pokemon':
                    return new UpdatePokemon(Pokemon.fromDiscordJSON(data.pokemon));
                case 'update-link':
                    // switch the arguments so that ourPid and theirPid are relative to us, rather than them
                    return new UpdateLink(data.linkPid, data.pid);
                case 'd':
                    return DataDump.parse(data);
                case 'request-data-dump':
                    return new RequestDataDump();
                case 'request-pokemon':
                    return new RequestPokemon(data.pid);
                case 'message-file':
                    return MessageFile.unpack(msg);
                default:
                    console.error(`Received unknown message type from SoulLink partner: ${data.mt}`);
                    return null;
            }
        } catch (err) {
            console.warn(`Received invalid message from SoulLink partner:\n ${msg}`);
            return null;
        }
    }
}

class NewGame extends SoulLinkMessage {
    constructor() {
        super('new-game');
    }
}

class UpdateParty extends SoulLinkMessage {
    constructor(addedPids, removedPids) {
        super('update-party');
        assert(!!addedPids || !!removedPids, `At least one argument of 'addedPids' and 'removedPids' must be specified.`);
        assert(!!addedPids && Array.isArray(addedPids) && addedPids.every(Number.isInteger), `Argument 'addedPids' must be an array of integers.`);
        assert(!!removedPids && Array.isArray(addedPids) && removedPids.every(Number.isInteger), `Argument 'removedPids' must be an array of integers.`);

        this.addedPids = addedPids;
        this.removedPids = removedPids;
    }
}

class UpdatePokemon extends SoulLinkMessage {
    constructor(pokemon) {
        super('update-pokemon');
        assert(!!pokemon && pokemon.constructor === Pokemon, `Argument 'pokemon' must be a Pokemon.`);

        this.pokemon = pokemon.discordJSON;
    }

    get pokemonObj() {
        return Pokemon.fromDiscordJSON(this.pokemon);
    }
}

class UpdateLink extends SoulLinkMessage {
    constructor(ourPid, theirPid) {
        super('update-link');
        this.pid = ourPid;
        this.linkPid = theirPid;
    }
}

class DataDump extends SoulLinkMessage {
    constructor(knownPokemon, slots, links) {
        super('d');
        knownPokemon = knownPokemon || {};
        slots = slots || [];
        links = links || [];

        this.pokemon = knownPokemon;
        this.links = links.filter(l => l[1] !== null).map(([k, v]) => [parseInt(k), parseInt(v)]);
        let hasPokemon = Object.values(knownPokemon).length > 0;

        Object.assign(this, {
            g: hasPokemon ? Object.values(knownPokemon)[0].generation : undefined,
            v: hasPokemon ? Object.values(knownPokemon)[0].gameVersion : undefined,
            p: Object.mapValues(knownPokemon, p => {
                let json = p.discordJSON;
                // during data dump, we put the gen and game in the parent object
                delete json.g;
                delete json.v;
                return json;
            }),
            l: this.links,
            i: slots.filter(s => s && s.pokemon && s.pokemon.pid && s.pokemon.pid !== -1).map(s => s.pokemon.pid),
        });
    }

    get messageType() {
        return 'data-dump';
    }

    toJSON() {
        // TODO: figure out if we can replace 'mt' with ...Object.getOwnPropertyNames(super) somehow
        return _.pick(this, ['mt', 'g', 'v', 'p', 'l', 'i']);
    }

    /* 
    Message format:
    {
        mt: 'd',
        g: generation,
        v: gameVersion,
        p: [ array of *all* my pokemon ],
        l: [ 
            [my-pokemon-pid, your-pokemon-pid], ...
        ],
        i: [ array of pids in party ]
    }
    */
    static parse(data) {
        let dd = new DataDump({}),
            { g, v, p } = data;
    
        dd.pokemon = p.map(p => Pokemon.fromDiscordJSON(Object.assign(p, { g, v })));
        dd.links = data.l;
        dd.theirPartyPids = data.i;
        return dd;
    }
}

class RequestDataDump extends SoulLinkMessage {
    constructor() {
        super('request-data-dump');
    }
}

class RequestPokemon extends SoulLinkMessage {
    constructor(pid) {
        super('request-pokemon');
        assert(!!pid && Number.isInteger(pid), `Argument 'pid' must be an integer.  Found: ${pid}`);

        this.pid = pid;
    }
}

class MessageFile extends SoulLinkMessage {
    constructor(msg, isTesting) {
        super('message-file');
        assert(SoulLink.discordLinking, `Attempting to create MessageFile message when not using discord linking method.`);
        assert(!!msg && msg.constructor === String, `Argument 'msg' must be a string.  Found: ${msg}`);
        assert(isTesting || msg.length > 2000, `Argument 'msg' was less than 2000 characters long.  Why are you sending this as a file?  Msg.length = ${msg.length}`);

        let buffer = Buffer.from(msg);
        this.attachment = new Discord.Attachment(buffer, `msg-${Date.now()}.json`);
    }

    toJSON() {
        return { mt: this.mt };
    }

    static async unpack(msg) {
        let url = msg.attachments.values().next().value.url;
        let fileData = await MessageFile._getFile(url);
        return SoulLinkMessage.parse(fileData);
    }

    static async _getFile(url) {
        return new Promise(resolve => {
            https.get(url, response => {
                let rawData = [];
                response.setEncoding('utf8');
                response.on('data', rawData.push);
                response.on('end', d => {
                    resolve(rawData.join(''));
                });
            });
        });
    }
}

const parseMessage = SoulLinkMessage.parse;

export {
    parseMessage,
    NewGame,
    UpdateParty,
    UpdatePokemon,
    UpdateLink,
    RequestPokemon,
    DataDump,
    RequestDataDump,
    MessageFile,
};
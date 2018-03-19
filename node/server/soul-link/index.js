import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import Discord from 'discord.js';
import config from '../config';
import SlotManager from '../slot/slot-manager';
import PokemonManager from '../pokemon/pokemon-manager';

let shinyId = 0;

class SoulLink extends EventEmitter {
    constructor() {
        super();

        this._initialized = false;
        this._client = null;
        this._channelId = null;
        this._filename = null;
        this._game = {};

        switch (this.Config.linking.method) {
            case 'manual':
                this._initManual();
                break;

            case 'discord':
                this._initDiscordClient();
                break;

            default:
                throw new Error(`Invalid config.soulLink.method.  Must be "manual" or "discord".  Found '${this.Config.method}'.`);
        }

        // SlotManager.on('update', this._handlePokemonUpdate.bind(this));
        config.on('update', this._handleConfigChange.bind(this));
    }

    get Config() {
        return config.Current.soulLink;
    }

    get Enabled() {
        return config.Current.nuzlocke && config.Current.nuzlocke.enabled &&
            this.Config && this.Config.enabled;
    }

    newGame(otid, otsid) {
        // if (!fs.existsSync(this.Config.dataDirectory)) {
        //     fs.mkdirSync(this.Config.dataDirectory);
        //     console.info(`Creating game data directory at ${this.config.dataDirectory}.`);
        // }

        // if (!otid || !otsid) {
        //     throw new Error(`Attempting to start game without a trainer id...`);
        // }

        // let filename = this._setGameFileName(otid, otsid);

        // if (fs.existsSync(filename)) {
        //     throw new Error(`Attempting to start a new game when a game file already exists.`);
        // }

        // fs.writeFileSync(this.getGameJson());
    }

    loadGame(otid, otsid) {
        // if (!fs.existsSync(this.Config.dataDirectory)) {
        //     fs.mkdirSync(this.Config.dataDirectory);
        // }

        // if (otid) {
        //     if (!otsid) {
        //         throw new Error('otid was defined but otsid was not?');
        //     }

        //     let filename = this._setGameFileName(otid, otsid);

        //     if (!fs.existsSync(filename)) {
        //         console.Error(`Game file missing at: ${filename}\nAre you starting a new game?`);
        //     }
        // }
    }

    close() {
        if (this._client) {
            return this._client.destroy().then(() => this._client = null);
        }
    }

    getNextShinyId() {
        shinyId++;
        // TODO: update this in database
        return shinyId;
    }

    _initDiscordClient() {
        // if (!config.Current.nuzlocke.enabled) {
        //     console.error('Nuzlocke is not enabled in config.json.  Aborting');
        //     return;
        // }

        // if (!this.Config.enabled) {
        //     console.error('Soul Link is not enabled in config.json.  Aborting.');
        //     return;
        // }

        // if (this.Config.method === 'manual') {
        //     console.error('Attempting to init Discord client when method is set to manual.  Aborting.');
        //     return;
        // }

        // if (this._initialized && this._client && this._client.status !== Discord.Constants.Status.DISCONNECTED) {
        //     console.warn('Soul Link is already initialized.  Skipping.');
        //     return;
        // }

        // let c = this._client = new Discord.Client();
        // c.on('ready', () => {
        //     console.debug(`Bot connected to Discord as '${c.user.username}'.`); 
        // });

        // c.on('message', this._handleMessage.bind(this));
        // c.on('reconnecting', () => console.warn('Bot lost connection to Discord.  Reconnecting...'));
        // c.on('disconnect', () => {
        //     console.error('Bot disconnected from Discord.');
        //     if (this._client) {
        //         this._client.destroy();
        //         this._client = null;
        //         this._initialized = false;
        //     }
        // });

        // c.on('error', (err) => {
        //     console.error(`ERROR in connection to Discord: ${err.name}: ${err.message}`);
        //     this._client.destroy();
        //     this._client = null;
        //     this._initialized = false;
        // });

        // this._initialized = true;
        // return c.login(this.Config.userToken).then(() => {
        //     let guild = c.guilds.find('name', this.Config.guild);
        //     if (!guild) {
        //         console.error(`ERROR: Could not find Discord server '${this.Config.guild}'.  Aborting Soul Link.`);
        //         this.close();
        //         return;
        //     }

        //     let channel = guild.channels.find('name', this.Config.channelName);
        //     if (!channel) {
        //         console.error(`ERROR: Could not find channel '${this.Config.channelName}' on Discord server '${this.Config.guild}'.  Aborting Soul Link.`);
        //         this.close();
        //         return;
        //     }

        //     this._channelId = channel.id;
        //     console.log(`Listening to ${this.Config.guild} #${this.Config.channelName} (id: ${channel.id})`);
        // });
    }

    _handleMessage(msg) {
        // if (msg.channel.id !== this._channelId ||
        //     msg.author.id === this._client.user.id) {
        //     return;
        // }

        // console.debug(`${msg.author.username}: ${msg.content}`);

        // try {
        //     let json = JSON.parse(msg.content);

        // } catch (err) {
        //     console.debug('Invalid message. Skipping.');
        //     return;
        // }
    }

    _handlePokemonUpdate(e) {
        // let pokemon = e.next.pokemon;
        // let player = e.player;
        
    }

    _handleConfigChange(e) {
        // if (this.Config.enabled && !this._initialized) {
        //     console.debug('Config changed.  Starting up Soul Link.');
        //     this._initDiscordClient();
        // } else if (this._initialized) {
        //     if (!this.Config.enabled) {
        //         console.debug('Config changed.  Closing down Soul Link.');
        //         this.close();
        //         return;
        //     }

        //     let prev = e.prev.soulLink,
        //         next = e.next.soulLink;

        //     if (prev.channelName !== next.channelName ||
        //         prev.guild !== next.guild ||
        //         prev.userToken !== next.userToken) {
        //         console.debug('Config changed.  Reconnecting to Discord.');
        //         this.close().then(this._initDiscordClient);
        //     }

        //     if (prev.dataDirectory !== next.dataDirectory) {
        //         this.loadGame();
        //     }
        // }
    }

    _initManual() {
        // TODO
    }

    _setGameFileName(otid, otsid) {
        // this._game = { otid, otsid };
        // return this._filename = path.resolve(this.config.dataDirectory, `${otid}-${otsid}.json`);
    }
}

const sl = new SoulLink();
export default sl;
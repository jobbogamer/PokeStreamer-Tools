import EventEmitter from 'events';
import Discord from 'discord.js';
import config from '../config';

class SoulLink extends EventEmitter {
    constructor() {
        super();

        this._initialized = false;
        this._client = null;
        this._channelId = null;

        config.on('update', this._handleConfigChange.bind(this));
    }

    get Config() {
        return config.Current.nuzlocke.soulLink;
    }

    get Enabled() {
        return config.Current.nuzlocke && config.Current.nuzlocke.enabled &&
            this.Config && this.Config.enabled;
    }

    init() {
        if (!config.Current.nuzlocke.enabled) {
            console.error('Nuzlocke is not enabled in config.json.  Aborting');
            return;
        }

        if (!this.Config.enabled) {
            console.error('Soul Link is not enabled in config.json.  Aborting.');
            return;
        }

        if (this._initialized && this._client && this._client.status !== Discord.Constants.Status.DISCONNECTED) {
            console.warn('Soul Link is already initialized.  Skipping.');
            return;
        }

        let c = this._client = new Discord.Client();
        c.on('ready', () => {
            console.debug(`Bot connected to Discord as '${c.user.username}'.`); 
        });
        c.on('message', this._handleMessage.bind(this));
        c.on('reconnecting', () => console.warn('Bot lost connection to Discord.  Reconnectiong...'));
        c.on('disconnect', () => {
            console.warn('Bot disconnected from Discord.');
            this._client.destroy();
            this._client = null;
            this._initialized = false;
        });
        c.on('error', (err) => {
            console.error(`ERROR in connection to Discord: ${err.name}: ${err.message}`);
            this._client.destroy();
            this._client = null;
            this._initialized = false;
        });

        this._initialized = true;
        return c.login(this.Config.userToken).then(() => {
            let guild = c.guilds.find('name', this.Config.guild);
            if (!guild) {
                console.error(`ERROR: Could not find Discord server '${this.Config.guild}'.  Aborting Soul Link.`);
                this.close();
                return;
            }

            let channel = guild.channels.find('name', this.Config.channelName);
            if (!channel) {
                console.error(`ERROR: Could not find channel '${this.Config.channelName}' on Discord server '${this.Config.guild}'.  Aborting Soul Link.`);
                this.close();
                return;
            }

            this._channelId = channel.id;
            console.log(`Listening to ${this.Config.guild} #${this.Config.channelName} (id: ${channel.id})`);
        });
    }

    close() {
        if (this._client) {
            return this._client.destroy().then(() => this._client = null);
        }
    }

    _handleMessage(msg) {
        if (msg.channel.id !== this._channelId ||
            msg.author.id === this._client.user.id) {
            return;
        }

        console.debug(`${msg.author.username}: ${msg.content}`);

        try {
            let json = JSON.parse(msg.content);

        } catch (err) {
            console.debug('Invalid message. Skipping.');
            return;
        }
    }

    _handleConfigChange(e) {
        if (this.Config.enabled && !this._initialized) {
            console.debug('Config changed.  Starting up Soul Link.');
            this.init();
        } else if (this._initialized) {
            if (!this.Config.enabled) {
                console.debug('Config changed.  Closing down Soul Link.');
                this.close();
                return;
            }

            if (e.prev.channelName !== e.next.channelName ||
                e.prev.guild !== e.next.guild ||
                e.prev.userToken !== e.next.userToken) {
                console.debug('Config changed.  Reconnecting to Discord.');
                this.close().then(this.init);
            }
        }
    }
}

const sl = new SoulLink();
export default sl;
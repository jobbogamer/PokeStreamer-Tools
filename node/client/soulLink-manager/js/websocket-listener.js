import EventEmitter from 'events';

const reconnectDelayInSeconds = 5;

// Spaghetti code!
function initWebSocket() {
    return new Promise((res, rej) => {
        let ws = new WebSocket(`ws://${API_BASE_URL}/soulLink`);
        setImmediate(() => {
            if (ws.readyState === 1) {
                res(ws);
                return;
            }

            setTimeout(() => {
                if (ws.readyState !== 1) {
                    rej();
                    return;
                }

                res(ws);
            }, 200);
        });
    });
}

let getWebSocket = function () {
    console.log('Attempting to open websocket');
    this._ws;
    initWebSocket().then(ws => {
        this._ws = ws;
        this._ws.addEventListener('close', () => {
            console.warn('Websocket was closed, probably by the server.  Attempting to reconnect.');
            this.emit('close');
            getWebSocket();
        });

        this._ws.addEventListener('message', e => this.emit('message', e));
        this._ws.addEventListener('error', e => this.emit('error', e));

        console.log('Connected to server');
        this.emit('open');
        return;
    }).catch(err => {
        this._ws = null;
        console.error(err ? err.message : 'Failed to connect to server');
        console.log(`Trying again in ${reconnectDelayInSeconds} seconds`);
        setTimeout(getWebSocket, reconnectDelayInSeconds * 1000);
    });
};

class WebSocketWrapper extends EventEmitter {
    constructor() {
        super();

        this._ws = null;
        getWebSocket = getWebSocket.bind(this);
        getWebSocket();
    }

    close(...args) {
        if (this._ws) {
            this._ws.close(...args);
        }
    }

    send(...args) {
        if (!this._ws) {
            throw new Error('Not connected to server');
        }

        this._ws.send(...args);
    }

    get connected() {
        return this._ws !== null && this._ws.readyState === 1;
    }
}

const ws = new WebSocketWrapper();

window.onbeforeunload = () => {
    ws.removeAllListeners();
    ws.close();
};

export default ws;
import Config from './config';

export default function (req, res, next) {
    // allow WebSockets to pass through
    if (req.protocol === 'ws') {
        next();
        return;
    }

    res.sseSetup = function () {
        if (Config.server.useLessSecureAPI) {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
        } else {
            // NOTE: Config.server.port is always the correct option, even if server is running on devServerPort,
            //       as proxied API calls are still requesting port
            const allowedDomainsRegex = new RegExp(`^(http://${Config.server.host}:${Config.server.port})`);
            let origin = allowedDomainsRegex.exec(req.headers.origin);
            origin = origin && origin[1];

            if (!origin) {
                res.sendStatus(403);
                return false;
            }

            res.writeHead(200, {
                'Access-Control-Allow-Origin': req.headers.origin,
                'Access-Control-Allow-Methods': 'GET',
                'Vary': 'Origin',
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });
        }
        
        return true;
    };

    res.sseSend = function(data) {
        if (!res.connection.destroyed) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    next();
}
function getLocaleString(request) {
    if (!request || !request.headers['accept-language']) {
        return;
    }

    let locale = request.headers['accept-language'].split(/[,;]/g)[0];
    try {
        new Date().toLocaleTimeString(locale);
        return locale;
    } catch (e) {
        return;
    }
}

function bindFunctionProps(self, ...props) {
    if (!props.length) {
        props = Object.getOwnPropertyNames(self);
    }

    for (let prop of props) {
        if (self[prop] instanceof Function) {
            self[prop] = self[prop].bind(self);
        }
    }
}

export { 
    getLocaleString,
    bindFunctionProps
};
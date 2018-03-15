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

export { getLocaleString };
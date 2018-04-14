Map.prototype.toJSON = function () {
    return Array.from(this).reduce((obj, [k, v]) => Object.assign(obj, { [k]: v }), {});
};

Map.from = function (obj) {
    if (!obj) {
        return new Map();
    }

    if (Array.isArray(obj)) {
        return new Map(obj);
    }

    const intRegex = /^\d+$/;
    return new Map(Object.entries(obj).map(([k, v]) => intRegex.test(k) ? [parseInt(k), v] : [k, v]));
};
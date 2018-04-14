Object.mapEntries = function (obj, callback) {
    return Object.entries(obj).map(callback);
};

Object.mapValues = function (obj, callback) {
    return Object.values(obj).map(callback);
};
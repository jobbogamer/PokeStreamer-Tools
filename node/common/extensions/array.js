Array.prototype.flatten = function () {
    return this.reduce((a, b) => a.concat(b), []);
};

Array.makeArray = function (val) {
    if (!Array.isArray(val)) {
        val = [val];
    }

    return val;
};
Array.prototype.flatten = function() {
    return this.reduce((a, b) => a.concat(b), []);
};
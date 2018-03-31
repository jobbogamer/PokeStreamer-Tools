Array.makeArray = function(val) {
    if (!Array.isArray(val)) {
        val = [val];
    }

    return val;
};
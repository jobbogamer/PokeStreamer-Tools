let g;
if (typeof window !== 'undefined') {
    g = window;
} else {
    g = global;
}

g.hasValue = function (v) {
    return v !== undefined && v !== null;
};
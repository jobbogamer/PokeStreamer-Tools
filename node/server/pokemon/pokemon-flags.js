const flagProps = [
    'isFemale',
    'isEgg',
    'dead',
    'isVoid',
    'isShiny',
    'isCritical',
    'isFullyTrained',
];

export function getFlagsValue(pokemon) {
    return flagProps.reduce((prev, flag, i) => prev + (!!pokemon[flag] && Math.pow(2, i)), 0x0);
}

export function parseFlags(flags) {
    return flagProps.reduce((prev, flag, i) => {
        prev[flag] = !!(flags & Math.pow(2, i));
        return prev;
    }, {});
}
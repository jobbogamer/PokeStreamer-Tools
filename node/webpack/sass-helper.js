// pulled regexes from https://stackoverflow.com/a/17194994/3120446

const s = '\u{000080}-\u{00D7FF}\u{00E000}-\u{00FFFD}\u{010000}-\u{10FFFF}',
    H = `[0-9a-fA-F]`,
    UNICODE = `\\\\${H}{1,6}[ \\t\\r\\n\\f]?`,
    NONASCII = `[${s}]`,
    ESCAPE = `${UNICODE}|\\\\[ -~${s}]`,
    NMCHAR = `(?:[a-zA-Z0-9_-]|${NONASCII}|${ESCAPE})`,
    NMSTART = `(?:[_a-zA-Z]|${NONASCII}|${ESCAPE})`,
    IDENT = `-?${NMSTART}${NMCHAR}*`;

function findSassVariableReferences(source) {
    // still want to check for undefined, which should not be legal
    if (source === null || source.constructor !== String) {
        return [];
    }

    return source.match(new RegExp(`\\$${IDENT}`, 'gu')) || [];
}

export { findSassVariableReferences };
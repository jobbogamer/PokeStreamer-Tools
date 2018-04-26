import {
    parseFlags,
    getFlagsValue,
} from '../pokemon-flags';

const flagProps = require('../pokemon-flags').__get__('flagProps');

describe('getFlagsValue()', () => {
    it('returns 0 for all false properties', () => {
        let pokemon = {};
        for (let prop of flagProps) {
            pokemon[prop] = false;
        }

        expect(getFlagsValue(pokemon)).toBe(0);
    });

    it('returns 0 for empty object', () => {
        expect(getFlagsValue({})).toBe(0);
    });

    it('returns 2^i for each individual flag property', () => {
        for (let [i, prop] of flagProps.entries()) {
            let pokemon = {
                [prop]: true
            };

            expect(getFlagsValue(pokemon)).toBe(Math.pow(2, i));
        }
    });
});

describe('parseFlags()', () => {
    it('returns a property for every flag', () => {
        expect(Object.keys(parseFlags(0))).toEqual(expect.arrayContaining(flagProps));
    });

    it(`returns ${flagProps.length} false props for flags === 0`, () => {
        let pokemon = parseFlags(0);
        expect(Object.getOwnPropertyNames(pokemon).length).toBe(flagProps.length);
        for (let [i, prop] of flagProps.entries()) {
            expect(pokemon[prop]).toBe(false);
        }
    });
    
    it(`returns 1 true prop and ${flagProps.length - 1} false props for each power of 2`, () => {
        for (let [i, prop] of flagProps.entries()) {
            let pokemon = parseFlags(Math.pow(2, i));
            expect(Object.getOwnPropertyNames(pokemon).length).toBe(flagProps.length);
            for (let [pProp, val] of Object.entries(pokemon)) {
                expect(val).toBe(prop === pProp);
            }
        }
    });
});

describe('pokemon-flags', () => {
    it('defines parseFlags() and getFlagValues() that are inverses of each other', () => {
        const totalPermutations = Math.pow(2, flagProps.length);
        for (let i = 0; i < totalPermutations; i++) {
            let flags = parseFlags(i);
            expect(getFlagsValue(flags)).toBe(i);
        }
    });
});
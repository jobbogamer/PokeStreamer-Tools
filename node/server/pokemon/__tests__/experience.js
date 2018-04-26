import '../../../common/extensions';
import getLevel from '../experience';
import Config from '../../config';

jest.mock('../../config');

const __get__ = require('../experience').__get__,
    xpLevelThresholds = __get__('xpLevelThresholds'),
    getThresholds = __get__('getThresholds'),
    xpLevelThresholdIds = __get__('xpLevelThresholdIds');

const legendaryPokemon = 150, // Mewtwo
    nonlegendaryPokemon = {
        mediumFast: 10, // Caterpie
        erratic: 350, // Milotic
        fluctuating: 426, // Drifblim
        mediumSlow: 1, // Bulbasaur
        fast: 113, // Chansey
        slow: 143, // Snorlax
    };

describe('standardized experience', () => {
    beforeEach(() => {
        Config.__reset();
        Config.__mergeConfigValues({
            randomizer: {
                enabled: true,
                normalizedExp: true
            }
        });
    });

    it('makes legendary pokemon use slow experience gain', () => {
        expect(getThresholds(legendaryPokemon)).toEqual(expect.arrayContaining(xpLevelThresholds.slow));
    });

    it('makes nonlegendary pokemon use mediumFast experience gain', () => {
        for (let [_, pokemon] of Object.entries(nonlegendaryPokemon)) {
            expect(getThresholds(pokemon)).toEqual(expect.arrayContaining(xpLevelThresholds.mediumFast));
        }
    })
});

describe('vanilla experience', () => {
    beforeEach(() => {
        Config.__reset();
    });

    function checkThresholds() {
        let i = 0;
        for (let [thresholdId, pokemon] of Object.entries(nonlegendaryPokemon)) {
            expect(thresholdId).toBe(xpLevelThresholdIds[i]);
            expect(getThresholds(pokemon)).toEqual(expect.arrayContaining(xpLevelThresholds[thresholdId]));
            i++;
        }
    }

    it('assigns the proper experience thresholds when randomizer is enabled', () => {
        Config.__mergeConfigValues({
            randomizer: {
                enabled: true,
                normalizedExp: false
            }
        });
        checkThresholds();
    });

    it('assigns the proper experience thresholds when randomizer is disabled', () => {
        Config.__mergeConfigValues({
            randomizer: {
                enabled: false,
                normalizedExp: false
            }
        });
        checkThresholds();
    });

    it('ignores normalizedExp value when randomizer is disabled', () => {
        Config.__mergeConfigValues({
            randomizer: {
                enabled: false,
                normalizedExp: true
            }
        });
        checkThresholds();
    });
});

describe('getLevel()', () => {
    it('returns the correct level for each threshold', () => {
        for (let [id, thresholds] of Object.entries(xpLevelThresholds)) {
            let pokemon = {
                species: nonlegendaryPokemon[id]
            };
            for (let [i, xp] of thresholds.entries()) {
                pokemon.exp = xp;
                if (i === 0) {
                    expect(getLevel(pokemon)).toBe(1);
                } else {
                    expect(getLevel(pokemon)).toBe(i + 1);

                    pokemon.exp--;
                    expect(getLevel(pokemon)).toBe(i);
                }
            }
        }
    });

    it('never returns higher than 100', () => {
        for (let [_, species] of Object.entries(nonlegendaryPokemon)) {
            let pokemon = { species };
            pokemon.exp = 2000000;
            expect(getLevel(pokemon)).toBe(100);
        }
    });

    it('never returns lower than 1', () => {
        for (let [_, species] of Object.entries(nonlegendaryPokemon)) {
            let pokemon = { species };
            pokemon.exp = 0;
            expect(getLevel(pokemon)).toBe(1);
        }
    });

    it('returns \'\' when is egg, has negative experience, or undefined experience', () => {
        for (let [_, species] of Object.entries(nonlegendaryPokemon)) {
            let pokemon = { species };
            expect(getLevel(pokemon)).toBe('');

            pokemon.exp = -1;
            expect(getLevel(pokemon)).toBe('');

            pokemon.exp = 0;
            pokemon.isEgg = true;
            expect(getLevel(pokemon)).toBe('');
        }
    });
});
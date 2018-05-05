import '../../../common/extensions';
import Pokemon from '../pokemon';
import Config from '../../config';

jest.mock('../../config');
jest.mock('../pokemon-manager');
jest.mock('../../soullink/soullink');
jest.mock('../pokemon-images');

const 
    // non-legendary
    aggron = {
        species: 306,
        maxHp: 159,
        currentHp: 159,
        ivs: { atk: 23, def: 20, spatk: 19, spdef: 16, hp: 29, spd: 30 },
        evs: { atk: 84, def: 55, spatk: 104, spdef: 98, hp: 78, spd: 91 },
        exp: 148837
    },
    // legendary
    dialga = {
        species: 483,
        maxHp: 55,
        currentHp: 55,
        ivs: { atk: 6, def: 5, spatk: 17, spdef: 23, hp: 26, spd: 4 },
        evs: { atk: 15, def: 15, spatk: 13, spdef: 0, hp: 5, spd: 16 },
        exp: 3736
    };

const aggronIvs = { atk: 23, def: 20, spatk: 19, spdef: 16, hp: 29, spd: 30 }

describe('pokemon-stats with standardized experience', () => {
    beforeEach(() => {
        Config.__reset();
        Config.__mergeConfigValues({
            randomizer: {
                enabled: true,
                normalizedExp: true
            }
        });
    });

    it('correctly calculates isCritical for Aggron when passed maxHp is accurate', () => {
        let pkmnData = Object.assign({}, aggron);
        expect(new Pokemon(pkmnData).isCritical).toBe(false);
        
        pkmnData.currentHp = Math.floor(159 / 4) + 1;
        expect(new Pokemon(pkmnData).isCritical).toBe(false);

        pkmnData.currentHp = Math.floor(159 / 4);
        expect(new Pokemon(pkmnData).isCritical).toBe(true);
    });

    it('correctly calculates isCritical for Dialga when passed maxHp is accurate', () => {
        let pkmnData = Object.assign({}, dialga);
        expect(new Pokemon(pkmnData).isCritical).toBe(false);
        
        pkmnData.currentHp = Math.floor(55 / 4) + 1;
        expect(new Pokemon(pkmnData).isCritical).toBe(false);

        pkmnData.currentHp = Math.floor(55 / 4);
        expect(new Pokemon(pkmnData).isCritical).toBe(true);
    });
});

describe('pokemon-stats with vanilla experience', () => {
    beforeEach(() => {
        Config.__reset();
        Config.__mergeConfigValues({
            randomizer: {
                enabled: true,
                normalizedExp: false
            }
        });
    });

    it('correctly calculates isCritical for Aggron when passed maxHp is accurate', () => {
        let pkmnData = Object.assign({}, aggron, { exp: 175760 });
        expect(new Pokemon(pkmnData).isCritical).toBe(false);
        
        pkmnData.currentHp = Math.floor(159 / 4) + 1;
        expect(new Pokemon(pkmnData).isCritical).toBe(false);

        pkmnData.currentHp = Math.floor(159 / 4);
        expect(new Pokemon(pkmnData).isCritical).toBe(true);
    });

    it('correctly calculates isCritical for Dialga when passed maxHp is accurate', () => {
        let pkmnData = Object.assign({}, dialga);
        expect(new Pokemon(pkmnData).isCritical).toBe(false);
        
        pkmnData.currentHp = Math.floor(55 / 4) + 1;
        expect(new Pokemon(pkmnData).isCritical).toBe(false);

        pkmnData.currentHp = Math.floor(55 / 4);
        expect(new Pokemon(pkmnData).isCritical).toBe(true);
    });
});
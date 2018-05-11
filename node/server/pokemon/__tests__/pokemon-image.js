import PokemonImage from '../pokemon-image';

const variants = {
    base: [ false, false, null, false ],
    female: [ true, false, null, false ],
    shiny: [ false, true, null, false ],
    shinyFemale: [ true, true, null, false ]
};

const forms = [ 'formA', 'formB' ];

test('PokemonImage.getImage() with only a base image always returns base image', () => {
    let img = new PokemonImage();
    img.base = 'base';

    for (let [name, args] of Object.entries(variants)) {
        expect(img.getImage(...args)).toBe('base');
    }

    expect(img.getImage(false, false, 'invalidForm', false)).toBe('base');
});

test('PokemonImage.getImage() with variant images returns the correct variant', () => {
    let img = new PokemonImage();
    for (let key of Object.keys(variants)) {
        img[key] = key;
    }

    for (let [name, args] of Object.entries(variants)) {
        expect(img.getImage(...args)).toBe(name);

        args[2] = 'invalidForm';
        expect(img.getImage(...args)).toBe(name);            
    }
});

test(`PokemonImage.getImage() with forms with only a base image always returns the form's base image`, () => {
    let img = new PokemonImage();
    img.base = 'base';
    for (let form of forms) {
        img.forms[form] = new PokemonImage();
        img.forms[form].base = `${form}base`;
    }
    
    for (let form of ['formA', 'formB']) {
        for (let [name, args] of Object.entries(variants)) {
            args[2] = form;
            expect(img.getImage(...args)).toBe(`${form}base`);
        }
    }

    expect(img.getImage(false, false, 'invalidForm', false)).toBe('base');
});

test(`PokemonImage.getImage() with forms with only a base image always returns the form's base image`, () => {
    let img = new PokemonImage();
    for (let key of Object.keys(variants)) {
        img[key] = key;
    }

    for (let form of forms) {
        img.forms[form] = new PokemonImage();

        for (let key of Object.keys(variants)) {
            img.forms[form][key] = `${form}${key}`;
        }
    }

    for (let form of forms) {
        for (let [name, args] of Object.entries(variants)) {
            args[2] = form;
            expect(img.getImage(...args)).toBe(`${form}${name}`);
        }

        for (let [name, args] of Object.entries(variants)) {
            args[2] = 'invalidForm';
            expect(img.getImage(...args)).toBe(name);
        }
    }
});
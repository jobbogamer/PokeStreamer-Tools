let pokemonIcons = {};
let req = require.context('../../../resources/icons/regular', false, /\.png$/);

req.keys().forEach(fn => {
    let species = /([-a-zA-Z0-9]+)\.png$/.exec(fn)[1];
    pokemonIcons[species] = { regular: req(fn) };
});

req = require.context('../../../resources/icons/shiny', false, /\.png$/);
req.keys().forEach(fn => {
    let species = /([-a-zA-Z0-9]+)\.png$/.exec(fn)[1];
    pokemonIcons[species].shiny = req(fn);
});

let egg = require('../../../resources/icons/egg.png');
pokemonIcons.egg = { regular: egg, shiny: egg };

export default pokemonIcons;
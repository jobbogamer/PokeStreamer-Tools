import Config from 'config.json';

let graveyardNames = [],
    totalWeight = 0;

function addGraveyardName(name, weight) {
    graveyardNames.push({ name, weight });
    totalWeight += weight;
}

function getGraveyardName() {
    let r = Math.random() * totalWeight,
        tmp = 0, idx = -1;
    do {
        idx++;
        tmp += graveyardNames[idx].weight;
    } while (tmp < r && idx < graveyardNames.length - 1);

    return graveyardNames[idx].name;
}

addGraveyardName('Graveyard', 2);
addGraveyardName('Valley of the Fallen', 1.5);
addGraveyardName('Unceremonious corpse pile of shame', .2);
addGraveyardName('Discarded tools', .1);

if (Config.configOverride &&
    (Config.configOverride instanceof String && Config.configOverride.search('config.fail.json') > -1 || 
     Config.configOverride instanceof Array && Config.configOverride.reduce((p, n) => Math.max(p, n.search(/config\.fail\.json/)), -1) > -1)) {
    addGraveyardName(`Failstream's Happy Place`, 1);
    addGraveyardName(`Failstream's Home Away from Home`, 1);
    addGraveyardName(`Failstream's Default First Date Restaurant`, .5);
}

export { getGraveyardName };
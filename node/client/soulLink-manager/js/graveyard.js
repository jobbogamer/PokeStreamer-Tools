import Config from 'config.json';

let graveyardNames = [],
    totalWeight = 0;

function addGraveyardName(name, weight) {
    weight = parseFloat(weight) || 0;
    if (weight > 0) {
        graveyardNames.push({ name, weight });
        totalWeight += weight;
    }
}

function getGraveyardName(prevVal) {
    prevVal = prevVal || 'Graveyard';
    if (graveyardNames.length === 0) {
        return prevVal;
    }

    if (graveyardNames.length === 1) {
        return graveyardNames[0];
    }

    // force a change by making sure next val is not the same as the current val
    let nextVal = null,
        idx = -1;
    do {
        let r = Math.random() * totalWeight,
            tmp = 0;
        do {
            idx++;
            tmp += graveyardNames[idx].weight;
            nextVal = graveyardNames[idx].name;
        } while (tmp < r && idx < graveyardNames.length - 1);
    } while (nextVal === prevVal);

    return nextVal;
}

addGraveyardName('Graveyard', 1);
addGraveyardName('Cemetery', 1);
addGraveyardName('Valley of the Fallen', 1.5);
addGraveyardName('Unceremonious corpse pile of shame', .2);
addGraveyardName('Discarded tools', .1);

if (Config.configOverride &&
    (Config.configOverride instanceof String && Config.configOverride.search('config.fail.json') > -1 || 
     Config.configOverride instanceof Array && Config.configOverride.reduce((p, n) => Math.max(p, n.search(/config\.fail\.json/)), -1) > -1)) {
    addGraveyardName(`Failstream's Happy Place`, 1);
    addGraveyardName(`Failstream's Home Away from Home`, 1);
    addGraveyardName(`Failstream's Preferred First Date Restaurant`, .5);
    addGraveyardName(`Yoshi's House`, 1);
}

const useReviveButton = Math.random() < .9;

export {
    getGraveyardName as default,
    useReviveButton,
};
// Pokemon Row ejs wrapper
if (SOULLINK_ENABLED) {
    module.exports = {
        GraveyardRow: require('../templates/soullink-rows/graveyard-row.ejs'),
        LinkedRow: require('../templates/soullink-rows/linked-pokemon-row.ejs'),
        UnlinkedRow: require('../templates/soullink-rows/unlinked-pokemon-row.ejs'),
    };
} else {
    module.exports = {
        LivingRow: require('../templates/nuzlocke-rows/living-row.ejs'),
        GraveyardRow: require('../templates/nuzlocke-rows/graveyard-row.ejs'),
    };
}
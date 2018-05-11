// mock currently only used for pokemon.js which only accesses knownSLPokemon
class PokemonManager {
    get knownSLPokemon() {
        return {};
    }
}

export default new PokemonManager();
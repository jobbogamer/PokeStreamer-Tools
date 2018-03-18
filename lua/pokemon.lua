local decrypt = require("pokemon_decrypt_gen_4_gen_5")
local pokemon_memory_map, battle_stats_memory_map = unpack(require("pokemon_memory_map_gen_4_gen_5"))
local json = require("dkjson")

local function object_assign(...)
    local obj = {}
    for _, o in ipairs(arg) do
        for key, val in pairs(o) do
            if obj[key] == nil or type(val) ~= "table" then
                obj[key] = val
            else -- val is table that should merge with current obj[key]
                obj[key] = object_assign(obj[key], val)
            end
        end
    end

    return obj
end

local Pokemon = {}

local _defaultPokemonValues = {
    data_str = "",

    -- these four fields form the SoulLink id as they don't change
    otid = -1,              -- original trainer id
    otsid = -1,             -- original trainer secret id
    diamond_pearl_location_met = -1, -- location discovered in HG/SS
    is_shiny = false,       -- whether the pokemon is shiny or not
    
    species = -1,           -- pokedex number
    alternate_form = "",
    nickname = "",
    level = -1,
    female = false,
    living = false,
    level_met = -1
}

local _propertiesToSend = {
    pid = "pid",
    otid = "otid",
    otsid = "otsid",
    diamond_pearl_location_met = "locationMet",
    is_shiny = "shiny",
    species = "species",
    alternate_form = "alternateForm",
    nickname = "nickname",
    level = "level",
    living = "living",
    level_met = "levelMet"
}

function Pokemon.get_words_string(words)
    local hex = ""
    for _, w in ipairs(words) do
        hex = hex .. string.format("%04x", w)
    end
    return hex
end

local function get_pokemon_level(species, xp)
    local exp_levels = experiece_to_reach_level[experience_gain_by_species[species]]
    local level = 1
    while xp > exp_levels[level] do level = level + 1 end
    return level - 1
end

function Pokemon.parse_gen4_gen5(encrypted_words, in_box, gen)
    local pkmn = { gen = gen }
    pkmn.data_str = Pokemon.get_words_string(encrypted_words)

    local valid, words = decrypt(encrypted_words)
    if not valid then
        print("invalid pokemon")
        return nil
    end

    if words == nil then
        -- empty slot
        return Pokemon()
    end
    
    for _, fn in ipairs(pokemon_memory_map) do
        local attr
        attr, fn = unpack(fn)
        if type(fn) == "number" then
            pkmn[attr] = words[fn]
        else
            -- print(attr)
            pkmn[attr] = fn(words, pkmn)
        end
    end
    
    if not in_box then 
        for _, fn in ipairs(battle_stats_memory_map) do
            local attr
            attr, fn = unpack(fn)
            if type(fn) == "number" then
                pkmn[attr] = words[fn]
            else
                -- print(attr)
                pkmn[attr] = fn(words, pkmn)
            end
        end

        pkmn.living = pkmn.current_hp > 0    
    end
    
    pkmn.gen = nil

    -- correct the level in case it's wrong in memory (or because it's in a box)
    pkmn.level = get_pokemon_level(pkmn.species, pkmn.exp)
    return Pokemon(pkmn)
end

function Pokemon:__call(init)
	init = init or {}
    init = object_assign(_defaultPokemonValues, init)

	setmetatable(init, self)
	self.__index = self
	return init
end

function Pokemon.__eq(left, right)
    return left.data_str == right.data_str
end

function Pokemon:__tostring()
	local strs = {}
	for k, v in pairs(self) do
		if type(v) ~= "function" and type(v) ~= "table" then
			strs[#strs + 1] = string.format("%s = %s", k, type(v) == "string" and string.format([["%s"]], v) or tostring(v))
		end
	end
    
	return string.format("{ %s }", table.concat(strs, ", "))
end

function Pokemon:clone()
    return object_assign({}, self)
end

function Pokemon:toJsonSerializableTable()
    local jsonTable = {}
    for k, v in pairs(_propertiesToSend) do
        jsonTable[v] = self[k]
    end
    
    return jsonTable
end

Pokemon.word_size_in_box = 72
Pokemon.word_size_in_party = 118

setmetatable(Pokemon, {
	__index = Pokemon,
	__call = Pokemon.__call
})

return Pokemon
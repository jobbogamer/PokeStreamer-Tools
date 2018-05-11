local decrypt = require("pokemon_decrypt_gen_4_gen_5")
local pokemon_memory_map, battle_stats_memory_map = unpack(require("pokemon_memory_map_gen_4_gen_5"))
local json = require("dkjson")

local gv = require("game_version")

local lshift, rshift, xor, band, bor = bit.lshift, bit.rshift, bit.bxor, bit.band, bit.bor
local function get_bits(a, b, d) return rshift(a, b) % lshift(1, d) end
local function get_byte(word, idx) return get_bits(word, (idx - 1) * 8, 8) end

function gettop(a)
	return(rshift(a,16))
end

function mult32(a,b)
	local c=rshift(a,16)
	local d=a%0x10000
	local e=rshift(b,16)
	local f=b%0x10000
	local g=(c*f+d*e)%0x10000
	local h=d*f
	local i=g*0x10000+h
	return i
end

local function unsign(n)
    if n < 0 then
        n = 4294967296 + n
    end
    return n
end

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

    pid = -1,
    otid = -1,
    otsid = -1,
    platinum_location_met = 0,
    platinum_egg_location_met = 0,
    is_shiny = false,
    is_female = false,

    species = -1,
    alternate_form = "",
    alternate_form_id = -1,
    nickname = "",
    level = -1,
    living = false,
    level_met = -1,
    markings = 0,
    is_gift = false,
    encounter_type = -1,
    is_empty = true,
    is_egg = false,
    valid = true,
    friendship_egg_steps = -1,
    evs = nil,
    ivs = nil
}

--indexed by generation
local _propertiesToSend = {
    [3] = {
        pid = "pid",
        location_met = "locationMet",
        is_shiny = "isShiny",
        is_female = "isFemale",
        is_egg = "isEgg",
        species = "species",
        nickname = "nickname",
        exp = "exp",
        level = "level",
        living = { name = "dead", transform = function (living) return not living end },
        level_met = "levelMet",
        current_hp = "currentHp",
        max_hp = "maxHp",
    },
    [4] = {
        pid = { name = "pid", transform = unsign },
        otid = "otid",
        otsid = "otsid",
        platinum_location_met = "locationMet",
        platinum_egg_location_met = "eggLocationMet",
        is_shiny = "isShiny",
        is_female = "isFemale",
        is_egg = "isEgg",
        species = "species",
        alternate_form = "alternateForm",
        alternate_form_id = "alternateFormId",
        nickname = "nickname",
        exp = "exp",
        level = "level",
        living = { name = "dead", transform = function (living) return not living end },
        level_met = "levelMet",
        encounter_type = "encounterType",
        markings = "markings",
        is_gift = "gift",
        friendship_egg_steps = { 
            name = "eggCycles", 
            transform = function (egg_cycles, pkmn) return pkmn.is_egg and egg_cycles or nil end 
        },
        current_hp = "currentHp",
        max_hp = "maxHp",
        evs = "evs",
        ivs = "ivs"
    },
    [5] = {
        pid = { name = "pid", transform = unsign },
        otid = "otid",
        otsid = "otsid",
        platinum_location_met = "locationMet",
        platinum_egg_location_met = "eggLocationMet",
        is_shiny = "isShiny",
        is_female = "isFemale",
        is_egg = "isEgg",
        species = "species",
        alternate_form = "alternateForm",
        alternate_form_id = "alternateFormId",
        nickname = "nickname",
        exp = "exp",
        level = "level",
        living = { name = "dead", transform = function (living) return not living end },
        level_met = "levelMet",
        encounter_type = "encounterType",
        markings = "markings",
        is_gift = "gift",
        friendship_egg_steps = { 
            name = "eggCycles", 
            transform = function (egg_cycles, pkmn) return pkmn.is_egg and egg_cycles or nil end 
        },
        current_hp = "currentHp",
        max_hp = "maxHp",
    }
}

if gv[3] == 1 then
    table.remove(_propertiesToSend, "platinum_location_met")
    table.remove(_propertiesToSend, "platinum_egg_location_met")
    _propertiesToSend["diamond_pearl_location_met"] = "locationMet"
    _propertiesToSend["diamond_pearl_egg_location_met"] = "eggLocationMet"
end

function Pokemon.get_words_string(words, format)
    format = format or "%04x"
    local hex = ""
    for _, w in ipairs(words) do
        hex = hex .. string.format(format, w)
    end
    return hex
end

-- returns 
-- 1) the value to set current hp at 0
-- 2) the value to set the pokemon to frozen
function Pokemon.get_death_codes(pid)
    local prng = pid
    prng = mult32(prng,0x41C64E6D) + 0x6073
    local frozen_code = xor(get_byte(gettop(prng), 1), lshift(1, 5))
    prng = mult32(prng,0x41C64E6D) + 0x6073
    prng = mult32(prng,0x41C64E6D) + 0x6073
    prng = mult32(prng,0x41C64E6D) + 0x6073    
    return gettop(prng), frozen_code
end

function Pokemon.parse_gen4_gen5(encrypted_words, in_box, gen)
    local pkmn = { gen = gen }
    pkmn.data_str = Pokemon.get_words_string(encrypted_words)

    local valid, words, death_code = decrypt(encrypted_words)

    pkmn.valid = valid -- currently pointless code but I may use it in the future
    if not valid then
        return nil
    end
    
    if words == nil then
        -- empty slot
        return Pokemon()
    end

    -- print("----------------")
    -- print(Pokemon.get_words_string(words))
    -- print("----------------")

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

    pkmn.death_code = death_code

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

    -- best effort to determine that this battle data is not accurate
    -- Blissey has the highest HP base stat, and at level 100, has a maximum max_hp of 714
    if pkmn.level > 100 or pkmn.max_hp > 714 or pkmn.current_hp > 714 or pkmn.current_hp > pkmn.max_hp then
        return nil
    end

    pkmn.living = pkmn.current_hp > 0

    return Pokemon(pkmn)
end

function Pokemon:__call(init)
    if init ~= nil then init.is_empty = false end
	init = init or {}
    init = object_assign(_defaultPokemonValues, init)

	setmetatable(init, self)
	self.__index = self
	return init
end

function Pokemon.__eq(left, right)
    if left.is_empty then return right.is_empty end
    
    for k, v in pairs(_propertiesToSend[left.gen]) do
        if type(v) == "table" then
            local tmpL, tmpR = left[k], right[k]

            if v.transform ~= nil then
                tmpL, tmpR = v.transform(tmpL, left), v.transform(tmpR, right)
            end
        
            if tmpL ~= tmpR then
                -- print(string.format("%s: %s -> %s", k, tostring(tmpL), tostring(tmpR)))
                return false
            end
        else
            -- assumes only 1-dimensional tables
            if (type(left[k]) == "table") then
                for i, val in pairs(left[k]) do
                    if right[k][i] ~= val then
                        return false
                    end
                end
            elseif left[k] ~= right[k] then
                -- print(string.format("%s: %s -> %s", k, tostring(left[k]), tostring(right[k])))
                return false
            end
        end
    end
    
    return true
end

function Pokemon:__tostring()
	local strs = {}
	for k, v in pairs(self) do
		if type(v) ~= "function" and type(v) ~= "table" and k ~= "data_str" then
			strs[#strs + 1] = string.format("%s = %s", k, type(v) == "string" and string.format([["%s"]], v) or tostring(v))
		end
	end

	return string.format("{ %s }", table.concat(strs, ", "))
end

function Pokemon:clone()
    return object_assign({}, self)
end

function Pokemon:toJsonSerializableTable(generation)
    if self.is_empty then
        return json.null
    end

    local jsonTable = {}
    for k, v in pairs(_propertiesToSend[self.gen]) do
        if type(v) == "table" then
            local tmpV = self[k]

            if v.transform ~= nil then
                tmpV = v.transform(tmpV, self)
            end

            if v.format ~= nil then
                tmpV = string.format(v.format, tmpV)
            end

            jsonTable[v.name] = tmpV
        else
            jsonTable[v] = self[k]
        end
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
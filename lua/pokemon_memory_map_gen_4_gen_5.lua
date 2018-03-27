if characterTable == nil then
    do_file "auto_layout_gen4_gen5_tables.lua"
end

local lshift, rshift, xor, band, bor = bit.lshift, bit.rshift, bit.bxor, bit.band, bit.bor
local function lsw(word) return lshift(word, 16) end
local function get_bits(a, b, d) return rshift(a, b) % lshift(1, d) end
local function get_byte(word, idx) return get_bits(word, (idx - 1) * 8, 8) end

local function concat_words(words, start, len)
    local val = 0
    for i = len, 1, -1 do 
        val = bor(lsw(val), words[start + i - 1])
    end
    
    return val
end

local function concat_bytes(words, word_idx, byte_idx, byte_len)
    -- get the bytes of the full words we're getting
    -- little endian hell... do things backwards
    local word_len = rshift(byte_len, 2) -- divide by 2
    local val = 0

    if byte_id == 2 then
        word_idx = word_idx + 1
    end

    -- since byte_idx is 1-indexed and byte_len is 0-indexed, check for even values to determine whether or not we need
    -- to add the last byte
    if (byte_idx + byte_len) % 2 == 0 then
        val = get_byte(words[word_idx + word_len], 1)
    end
    
    -- if byte_idx == 2 then
    --     val = get_byte(words[word_idx], 2)
    --     word_idx = word_idx + 1
    -- end

    for i = word_len, 1, -1 do -- word_idx, word_idx + math.floor(byte_len / 2) do
        val = bor(lsw(val), words[word_idx + i - 1])
    end

    if byte_idx == 2 then
        val = bor(lshift(val, 8), words[word_idx - 1], 2)
    end
    -- -- since byte_idx is 1-indexed and byte_len is 0-indexed, check for even values to determine whether or not we need
    -- -- to add the last byte
    -- if (byte_idx + byte_len) % 2 == 0 then
    --     val = bor(lshift(val, 8), get_byte(words[word_idx + math.floor(byte_len / 2) + 1], 1))
    -- end

    return val
end

local function gcw(word_idx, word_len) -- get concat_words
    return function(words, pkmn_data)
        return concat_words(words, word_idx, word_len)
    end
end

local function gcb(word_idx, byte_idx, byte_len)
    return function(words, pkmn_data)
        return concat_bytes(words, word_idx, byte_idx, byte_len)
    end
end

local function ggbit(word_idx, start, len) -- get get_bits
    return function(words, pkmn_data)
        return get_bits(words[word_idx], start, len)
    end
end

local function ggbool(word_idx, start)
    return function(words, pkmn_data)
        return get_bits(words[word_idx], start, 1) == 1
    end
end

local function ggbyte(word_idx, byte_idx) -- get get_byte
    return function(words, pkmn_data)
        return get_byte(words[word_idx], byte_idx)
    end
end

local function gbt(word_idx, words_len) -- get byte table
    return function(words, pkmn_data)
        local table = {}
        for i = 1, words_len do
            -- print(string.format("%04x %02x %02x", words[i + word_idx]))
            table[#table + 1] = get_byte(words[i + word_idx - 1], 1)
            table[#table + 1] = get_byte(words[i + word_idx - 1], 2)
        end

        return table
    end
end

local function gwt(word_idx, words_len) -- get word table
    return function(words, pkmn_data)
        local table = {}
        for i = 1, words_len do
            table[#table + 1] = words[i + word_idx - 1]
        end

        return table
    end
end

-- TODO
-- local function get_ribbon_set(ribbon_bytes, ribbons)
--     local ribbon_set = {}

--     for i = 0, #ribbons - 1 do
--         ribbon_set[ribbons[i + 1]] = band(ribbon_bytes, 2 ^ i)
--     end

--     return ribbon_set
-- end

-- -- sets is a table = { <set_name> = word_idx }
-- local function get_ribbon_sets(sets)
--     return function(words, pkmn_data) 
--         local ribbons = {}
--         for set_name, word_idx in pairs(sets) do
--             local ribbon_bytes = concat_words(words, word_idx, 2)
--             local set = get_ribbon_set(ribbon_bytes, gen_4_ribbons[set_name])
--         end
--     end
-- end

local function get_ivs(word_idx)
    return function(words, pkmn_data)
        local iv_bytes = concat_bytes(words, word_idx, 1, 4)
        local ivs = { "hp", "atk", "def", "spd", "spatk", "spdef" }
        local iv_vals = {}
        for i, iv in ipairs(ivs) do
            iv_vals[iv] = get_bits(iv_bytes, i - 1, 5)
        end
        return iv_vals
    end
end

local function get_alternate_form(word_idx)
    return function(words, pkmn_data)
        if alternate_forms[pkmn_data.species] ~= nil then
            local form = pkmn_data.alternate_form_id
            return alternate_forms[pkmn_data.species][form + 1] -- Lua is 1-indexed
        else
            return nil
        end
    end
end

local function get_shiny_leaves(word_idx)
    return function(words, pkmn_data) 
        local byte = get_byte(words[word_idx], 2)
        return {
            a = get_bits(byte, 0, 1),
            b = get_bits(byte, 1, 1),
            c = get_bits(byte, 2, 1),
            d = get_bits(byte, 3, 1),
            e = get_bits(byte, 4, 1),
            leaf_crown = get_bits(byte, 5, 1)
        }
    end
end

function get_string(gen, words, word_idx, word_len)
    local str = ""
    for i = 1, word_len do 
        local c = words[word_idx + i - 1]

        if gen == 4 then -- gen 5 uses legit UTF-16 according to the web... unverified
            c = characterTable[c]
        end

        if c == nil then
            return str
        elseif c > 0 and c < 0xFF then
            str = str .. string.char(c)
        else
            -- hopefully never happens
            -- even though lua only supports 3-character octects, write as a 4-char javascript character
            str = str .. string.format("\\{%04d}", c) 
        end
    end

    return str
end

local function get_nickname(word_idx)
    return function(words, pkmn_data)
        if not pkmn_data.is_nicknamed then return "" end
        return get_string(pkmn_data.gen, words, word_idx, 11)
    end
end

local function get_name(word_idx)
    return function(words, pkmn_data)
        return get_string(pkmn_data.gen, words, word_idx, 8)
    end
end

local function get_date(word_idx, byte_id)
    return function(words, pkmn_data)
        -- note: unsure if this is actually the order of the bytes
        if byte_id == 1 then
            return {
                year = get_byte(words[word_idx], 1),
                month = get_byte(words[word_idx], 2),
                day = get_byte(words[word_idx + 1], 1)
            }
        else
            return {
                year = get_byte(words[word_idx], 2),
                month = get_byte(words[word_idx + 1], 1),
                day = get_byte(words[word_idx + 1], 2)
            }
        end
    end
end

local pokemon_memory_map = {
    -- unencrypted bytes
    { "pid", gcw(1, 2) },                       -- 0x00 - 0x03
    -- word 3 is unused                         -- 0x04 - 0x05
    { "checksum", 4 },                          -- 0x06 - 0x07

    -- Block A
    { "species", 5 },                           -- 0x08 - 0x09
    { "held_item", 6 },                         -- 0x0A - 0x0B
    { "otid", 7 },                              -- 0x0C - 0x0D
    { "otsid", 8 },                             -- 0x0E - 0x0F
    { "exp", gcw(9, 2) },                       -- 0x10 - 0x13
    { "friendship_egg_steps", ggbyte(11, 1) },  -- 0x14
    { "ability", ggbyte(11, 2) },               -- 0x15
    { "markings", ggbyte(12, 1) },              -- 0x16
    { "language_of_origin", ggbyte(12, 2) },    -- 0x17
    { "hp_ev", ggbyte(13, 1) },
    { "atk_ev", ggbyte(13, 2) },
    { "def_ev", ggbyte(14, 1) },
    { "spd_ev", ggbyte(14, 2) },
    { "spatk_ev", ggbyte(15, 1) },
    { "spdef_ev", ggbyte(15, 2) },
    { "cool", ggbyte(16, 1) },
    { "beauty", ggbyte(16, 2) },
    { "cute", ggbyte(17, 1) },
    { "smart", ggbyte(17, 2) },
    { "tough", ggbyte(18, 1) },
    { "sheen", ggbyte(18, 2) },
    -- TODO
    -- { "ribbons", get_ribbon_sets({ sinnoh_1, 19, sinnoh_2, 31, hoenn, 97 }) }, -- 0x24 - 0x27, 0x3C - 0x3F, 0x60 - 0x63

    -- Block B
    { "moves", gwt(21, 4) },                            -- 0x28 - 0x2F
    { "move_pp", gbt(25, 2) },                          -- 0x30 - 0x33
    { "move_pp_ups", gbt(27, 2) },                      -- 0x34 - 0x37
    { "ivs", get_ivs(28) },                             -- 0x38 - 0x3B
    { "is_egg", ggbool(30, 14) },                       -- 0x3B
    { "is_nicknamed", ggbool(30, 15) },                 -- 0x3B
    -- Hoenn Ribbon set words 31 - 32                   -- 0x3C - 0x3F
    { "is_fateful_encounter", ggbool(33, 0) },          -- 0x40
    { "is_female", ggbool(33, 1) },                     -- 0x40
    { "is_genderless", ggbool(33, 2) },                 -- 0x40
    { "alternate_form_id", ggbit(33, 3, 5) },           -- 0x40
    { "alternate_form", get_alternate_form(33) },       
    { "shiny_leaves", get_shiny_leaves(33) },           -- 0x41 (byte 2 of word 33) (HG/SS only)
    -- word 34 unsed
    { "platinum_egg_location", 35 },
    { "platinum_location_met", 36 },

    -- Block C
    { "nickname", get_nickname(37) },                   -- 0x48 - 0x5D (0x5E unused)
    { "game_of_origin", ggbyte(48, 2) },                -- 0x5F
    -- Sinnoh 2 Ribbon set words 49 - 50
    -- words 51 - 52 unused

    -- Block D
    { "ot_name", get_name(53) },                        -- 0x68 - 0x77
    { "date_egg_received", get_date(61, 1) },           -- 0x78 - 0x7A
    { "date_met", get_date(62, 2) },
    { "diamond_pearl_egg_location_met", 64 },
    { "diamond_pearl_location_met", 65 },
    { "pokerus", ggbyte(66, 1) },
    { "pokeball", ggbyte(66, 2) },
    { "level_met", ggbit(67, 0, 7) },
    { "is_ot_female", ggbool(67, 7) },
    { "encounter_type", ggbyte(67, 2) },
    { "hg_ss_pokeball", ggbyte(68, 1) },
    { "performance", ggbyte(68, 2) },

    -- calculated
    { "is_shiny", function(words, pkmn_data) 
            return xor(pkmn_data.otid, pkmn_data.otsid, get_bits(pkmn_data.pid, 0, 16), get_bits(pkmn_data.pid, 16, 16)) < 8 
        end },
    { "is_gift", function (words, pkmn_data) return band(pkmn_data.encounter_type, 0xC) == 0xC end },
}

local party_pokemon_memory_map = {
    -- Battle stats
    { "status", ggbyte(69, 1) },                        -- 0x88 TODO: bitmap... see https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_data_structure_in_Generation_IV#Battle_stats
                                                        -- byte 0x89 unknown
    -- word 70 unknown
    { "level", ggbyte(71, 1) },
    { "capsule_index", ggbyte(71, 2) },
    { "current_hp", 72 },
    { "max_hp", 73 },
    { "attack", 74 },
    { "defense", 75 },
    { "speed", 76 },
    { "sp_attack", 77 },
    { "sp_def", 78 },
    -- words 79 - 106 unknown/trash
    { "seal_coordinates", gcw(107, 12) }
}

return { pokemon_memory_map, party_pokemon_memory_map }
Slot = {}
local _defaultSlotValues = {
    -- these four fields form the SoulLink id as they don't change
    -- technically we could probably just use date_met, but I'm not confident I'll be able to find it
    otid = -1,              -- original trainer id
    location_met = -1,      -- game id of location met
    shiny = false,          -- whether the pokemon is shiny or not
    date_met = -1,          -- game value of when the pokemon was caught
    
    species = -1,           -- pokedex number
    alternate_form = "",
    nickname = "",
    level = -1,
    female = false,
    living = false,
    level_met = -1
}

function Slot:__call(init)
	init = init or {}
	for k,v in pairs(_defaultSlotValues) do
        init[k] = init[k] or v
    end
	
	setmetatable(init, self)
	self.__index = self
	return init
end

function Slot:__eq(other)
	return self.species == other.species and
        self.alternate_form == other.alternate_form and
        self.nickname == other.nickname and
        self.level == other.level and
        self.female == other.female and
        self.shiny == other.shiny and
        self.living == other.living and
        self.level_met == other.level_met and
        self.location_met == other.location_met
end

function Slot:__tostring()
	local strs = {}
	for k, v in pairs(self) do
		if type(v) ~= "function" and type(v) ~= "table" then
			strs[#strs + 1] = string.format("%s = %s", k, type(v) == "string" and string.format([["%s"]], v) or tostring(v))
		end
	end
    
	return string.format("{ %s }", table.concat(strs, ", "))
end

setmetatable(Slot, {
	__index = Slot,
	__call = Slot.__call
})
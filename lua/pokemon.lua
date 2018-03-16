Slot = {}
local _defaultSlotValues = {
    -- these four fields form the SoulLink id as they don't change
    otid = -1,              -- original trainer id
    otsid = -1,             -- original trainer secret id
    location_met = -1,      -- game id of location met
    shiny = false,          -- whether the pokemon is shiny or not
    
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

function Slot.__eq(left, right)
    return left.otid == right.otid and
        left.otsid == right.otsid and
        left.species == right.species and
        left.alternate_form == right.alternate_form and
        left.nickname == right.nickname and
        left.level == right.level and
        left.female == right.female and
        left.shiny == right.shiny and
        left.living == right.living and
        left.level_met == right.level_met and
        left.location_met == right.location_met
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

function Slot:clone()
    return Slot({
        otid = self.otid,
        otsid = self.otsid,
        species = self.species,
        alternate_form = self.alternate_form,
        nickname = self.nickname,
        level = self.level,
        female = self.female,
        shiny = self.shiny,
        living = self.living,
        level_met = self.level_met,
        location_met = self.location_met
    })
end

setmetatable(Slot, {
	__index = Slot,
	__call = Slot.__call
})
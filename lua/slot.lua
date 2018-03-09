Slot = {
    species = -1,
    nickname = "",
    level = -1,
    female = false,
    shiny = false,
    living = false,
    level_met = -1,
    location_met = -1
}

function Slot:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

function Slot:equals(other)
    return self.species == other.species and
        self.nickname == other.nickname and
        self.level == other.level and
        self.female == other.female and
        self.shiny == other.shiny and
        self.living == other.living and
        self.level_met == other.level_met and
        self.location_met == other.location_met
end

function Slot:tostring()
    return tostring(self.species) .. " / " .. 
        self.nickname .. " / " .. 
        "Level " .. self.level .. " / " .. 
        (self.female and "Female" or "Male") .. " / " .. 
        (self.shiny and "Shiny" or "Normal") .. " / " .. 
        (self.living and "Living" or "Dead")
end
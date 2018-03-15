-- Based on the Pokemon gen 4 lua script by MKDasher
-- Modified by EverOddish for automatic image updates
-- Modified by dfoverdx for using a NodeJS server for automatic image updates and SoulLink
-----------
-- 1 = Diamond/Pearl, 2 = HeartGold/SoulSilver, 3 = Platinum, 4 = Black, 5 = White, 6 = Black 2, 7 = White 2
local game = 2

-- 1 = Diamond, HeartGold, Platinum, Black, white, Black 2, White 2
-- 2 = Pearl, SoulSilver
local subgame = 1

-- Set this to true if you and a partner are doing a SoulLink run (this will additionally access information in Bill's 
-- 	  PC).  If you are using a version other than HeartGold/SoulSilver, see the note below.
local run_soul_link = true

-- Currently the memory address of Bill's PC are unknown for all versions but HeartGold/SoulSilver
-- This value is required for playing SoulLinked
-- If you would like to be able to detect what Pokemon are stored in boxes:
-- 	  • temporarily set this value to true
-- 	  • go to a PC and open up Bill's PC (don't yet deposit the pokemon)
-- 	  • run this script in DeSmuME
-- 	      • it will print out the first 0x40 bytes of the first member of your party
-- 	      • copy the value between the dashed lines
-- 	      • open up find_memory_address_gen4_gen5.lua in a text editor
-- 	      • paste the value in the "needle = " line (overwriting the current numeric values) and save the file
--        • set print_first_pokemon_bytes back to false in auto_layout_gen4_gen5.lua
-- 	  • stop running this script in DeSmuMe
-- 	  • deposit your first pokemon into Bill's PC in Box 1
-- 	  • open and run find_memory_address_gen4_gen5.lua in DeSmuMe
-- 	  • copy the outputed value (it should look like 0x02XXXXXX)
-- 	  • open auto_layout_gen4_gen5_tables.lua
-- 	  • replace the proper "nil" value with the value outputed from the script and save
-- Now you should be able to run auto_layout_gen4_gen5.lua  
-- If you want to help other players out, post the value (and which game you're using) in the 
--    dxdt#pokemon-streamer-tools Discord channel (https://discord.gg/FKDntWR), and I will add it to the github repo
local print_first_pokemon_bytes = false
-----------

dofile "slot.lua"
dofile "send_data_to_server.lua"
dofile "pokemon_name_to_pokedex_id.lua"

local gen

local pointer
local pidAddr
local pid = 0
local trainerID, secretID, lotteryID
local shiftvalue
local checksum = 0

local mode = 1
local modetext = "Party"
local submode = 1
local modemax = 5
local submodemax = 6
local tabl = {}
local prev = {}

local leftarrow1color, rightarrow1color, leftarrow2color, rightarrow2color

local last_parties = {}
local last_party = {}
local first_run = true
local last_check = 0
local is_zero_hp = {}

local prng
local is_shiny

--BlockA
local pokemonID = 0
local heldItem = 0
local OTID, OTSID
local friendship_or_steps_to_hatch
local ability
local hpev, atkev, defev, speev, spaev, spdev
local evs = {}

--BlockB
local move = {}
local movepp = {}
local hpiv, atkiv, defiv, speiv, spaiv, spdiv
local ivspart = {}, ivs
local isegg
local byte0x40
local is_female
local alternate_form
local nat
local isnicknamed, nickname

local bnd,br,bxr=bit.band,bit.bor,bit.bxor
local rshift, lshift=bit.rshift, bit.lshift
local mdword=memory.readdwordunsigned
local mword=memory.readwordunsigned
local mbyte=memory.readbyteunsigned

--BlockD
local pkrs

--currentStats
local level, hpstat, maxhpstat, atkstat, defstat, spestat, spastat, spdstat
local currentFoeHP = 0

local hiddentype, hiddenpower

--offsets
local BlockAoff, BlockBoff, BlockCoff, BlockDoff

local first_pokemon_bytes

dofile "auto_layout_gen4_gen5_tables.lua"

local xfix = 10
local yfix = 10
function displaybox(a,b,c,d,e,f)
	gui.box(a+xfix,b+yfix,c+xfix,d+yfix,e,f)
end

function display(a,b,c,d)
	gui.text(xfix+a,yfix+b,c, d)
end

function drawarrowleft(a,b,c)
	gui.line(a+xfix,b+yfix+3,a+2+xfix,b+5+yfix,c)
	gui.line(a+xfix,b+yfix+3,a+2+xfix,b+1+yfix,c)
	gui.line(a+xfix,b+yfix+3,a+6+xfix,b+3+yfix,c)
end

function drawarrowright(a,b,c)
	gui.line(a+xfix,b+yfix+3,a-2+xfix,b+5+yfix,c)
	gui.line(a+xfix,b+yfix+3,a-2+xfix,b+1+yfix,c)
	gui.line(a+xfix,b+yfix+3,a-6+xfix,b+3+yfix,c)
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

function getbits(a,b,d)
	return rshift(a,b)%lshift(1,d)
end

function gettop(a)
	return(rshift(a,16))
end

function menu()
	tabl = input.get()
	leftarrow1color = "white"
	leftarrow2color = "white"
	rightarrow1color = "white"
	rightarrow2color = "white"
	if tabl["1"] and not prev["1"] then
		game = game + 1
		if game == 8 then
			game = 1
		end
	end
	if tabl["7"] then
		leftarrow2color = "yellow"
	end
	if tabl["8"] then
		rightarrow2color = "yellow"
	end
	if tabl["3"] then
		leftarrow1color = "yellow"
	end
	if tabl["4"] then
		rightarrow1color = "yellow"
	end
	if tabl["7"] and not prev["7"] and mode < 5 then
		submode = submode - 1
		if submode == 0 then
			submode = submodemax
		end
	end
	if tabl["8"] and not prev["8"] and mode < 5 then
		submode = submode + 1
		if submode == submodemax + 1 then
			submode = 1
		end
	end
	if tabl["3"] and not prev["3"] then
		mode = mode - 1
		if mode == 0 then
			mode = modemax
		end
	end
	if tabl["4"] and not prev["4"] then
		mode = mode + 1
		if mode == modemax + 1 then
			mode = 1
		end
	end
	if tabl["0"] and not prev["0"] then
		if yfix == 10 then
			yfix = -185
		else
			yfix = 10
		end
	end
	prev = tabl
	if mode == 1 then
		modetext = "Party"
	elseif mode == 2 then
		modetext = "Enemy"
	elseif mode == 3 then
		modetext = "Enemy 2"
	elseif mode == 4 then
		modetext = "Partner"
	else -- mode == 5
		modetext = "Wild"
	end
end

function getGen()
	if game < 4 then
		return 4
	else
		return 5
	end
end

function getGameName()
	if game == 1 then
		return "Pearl"
	elseif game == 2 then
		return "HeartGold"
	elseif game == 3 then
		return "Platinum"
	elseif game == 4 then
		return "Black"
	elseif game == 5 then
		return "White"
	elseif game == 6 then
		return "Black 2"
	else--if game == 7 then
		return "White 2"
	end
end

function getPointer()
	if game == 1 then
		return memory.readdword(0x02106FAC)
	elseif game == 2 then
		return memory.readdword(0x0211186C)
	else -- game == 3
		return memory.readdword(0x02101D2C)
	end
	-- haven't found pointers for BW/B2W2, probably not needed anyway.
end

function getCurFoeHP()
	if game == 1 then -- Pearl
		if mode == 4 then -- Partner's hp
			return memory.readword(pointer + 0x5574C)
		elseif mode == 3 then -- Enemy 2
			return memory.readword(pointer + 0x5580C)
		else
			return memory.readword(pointer + 0x5568C)
		end
	elseif game == 2 then --Heartgold
		if mode == 4 then -- Partner's hp
			return memory.readword(pointer + 0x56FC0)
		elseif mode == 3 then -- Enemy 2
			return memory.readword(pointer + 0x57080)
		else
			return memory.readword(pointer + 0x56F00)
		end
	else--if game == 3 then --Platinum
		if mode == 4 then -- Partner's hp
			return memory.readword(pointer + 0x54764)
		elseif mode == 3 then -- Enemy 2
			return memory.readword(pointer + 0x54824)
		else
			return memory.readword(pointer + 0x546A4)
		end
	end
end

function getPidAddr()
	if game == 1 then --Pearl
		enemyAddr = pointer + 0x364C8
		if mode == 5 then
			return pointer + 0x36C6C
		elseif mode == 4 then
			return memory.readdword(enemyAddr) + 0x774 + 0x5B0 + 0xEC*(submode-1)
		elseif mode == 3 then
			return memory.readdword(enemyAddr) + 0x774 + 0xB60 + 0xEC*(submode-1)
		elseif mode == 2 then
			return memory.readdword(enemyAddr) + 0x774 + 0xEC*(submode-1)
		else
			return pointer + 0xD2AC + 0xEC*(submode-1)
		end
	elseif game == 2 then --HeartGold
		enemyAddr = pointer + 0x37970
		if mode == 5 then
			return pointer + 0x38540
		elseif mode == 4 then
			return memory.readdword(enemyAddr) + 0x1C70 + 0xA1C + 0xEC*(submode-1)	
		elseif mode == 3 then
			return memory.readdword(enemyAddr) + 0x1C70 + 0x1438 + 0xEC*(submode-1)
		elseif mode == 2 then
			return memory.readdword(enemyAddr) + 0x1C70 + 0xEC*(submode-1)
		else
			return pointer + 0xD088 + 0xEC*(submode-1)
		end
	elseif game == 3 then --Platinum
		enemyAddr = pointer + 0x352F4
		if mode == 5 then
			return pointer + 0x35AC4
		elseif mode == 4 then
			return memory.readdword(enemyAddr) + 0x7A0 + 0x5B0 + 0xEC*(submode-1)
		elseif mode == 3 then
			return memory.readdword(enemyAddr) + 0x7A0 + 0xB60 + 0xEC*(submode-1) 
		elseif mode == 2 then
			return memory.readdword(enemyAddr) + 0x7A0 + 0xEC*(submode-1) 
		else
			return pointer + 0xD094 + 0xEC*(submode-1)
		end
	elseif game == 4 then --Black
		if mode == 5 then
			return 0x02259DD8
		elseif mode == 4 then
			return 0x0226B7B4 + 0xDC*(submode-1)
		elseif mode == 3 then
			return 0x0226C274 + 0xDC*(submode-1)
		elseif mode == 2 then
			return 0x0226ACF4 + 0xDC*(submode-1)
		else -- mode 1
			return 0x022349B4 + 0xDC*(submode-1) 
		end
	elseif game == 5 then --White
		if mode == 5 then
			return 0x02259DF8
		elseif mode == 4 then
			return 0x0226B7D4 + 0xDC*(submode-1)
		elseif mode == 3 then
			return 0x0226C294 + 0xDC*(submode-1)	
		elseif mode == 2 then
			return 0x0226AD14 + 0xDC*(submode-1)
		else -- mode 1
			return 0x022349D4 + 0xDC*(submode-1) 
		end
	elseif game == 6 then --Black 2
		if mode == 5 then
			return 0x0224795C
		elseif mode == 4 then
			return 0x022592F4 + 0xDC*(submode-1)
		elseif mode == 3 then
			return 0x02259DB4 + 0xDC*(submode-1)			
		elseif mode == 2 then
			return 0x02258834 + 0xDC*(submode-1)
		else -- mode 1
			return 0x0221E3EC + 0xDC*(submode-1)
		end
	else --White 2
		if mode == 5 then
			return 0x0224799C
		elseif mode == 4 then
			return 0x02259334 + 0xDC*(submode-1)
		elseif mode == 3 then
			return 0x02259DF4 + 0xDC*(submode-1)
		elseif mode == 2 then
			return 0x02258874 + 0xDC*(submode-1)
		else -- mode 1
			return 0x0221E42C + 0xDC*(submode-1)
		end
	end
end

function getNatClr(a)
	color = "yellow"
	if nat % 6 == 0 then
		color = "yellow"
	elseif a == "atk" then
		if nat < 5 then
			color = "#0080FFFF"
		elseif nat % 5 == 0 then
			color = "red"
		end
	elseif a == "def" then
		if nat > 4 and nat < 10 then
			color = "#0080FFFF"
		elseif nat % 5 == 1 then
			color = "red"
		end
	elseif a == "spe" then
		if nat > 9 and nat < 15 then
			color = "#0080FFFF"
		elseif nat % 5 == 2 then
			color = "red"
		end
	elseif a == "spa" then
		if nat > 14 and nat < 20 then
			color = "#0080FFFF"
		elseif nat % 5 == 3 then
			color = "red"
		end
	elseif a == "spd" then
		if nat > 19 then
			color = "#0080FFFF"
		elseif nat % 5 == 4 then
			color = "red"
		end
	end
	return color
end

function readPokemon(pidAddr)
	pid = memory.readdword(pidAddr)
	checksum = memory.readword(pidAddr + 6)
	shiftvalue = (rshift((bnd(pid,0x3E000)),0xD)) % 24
	
	BlockAoff = (BlockA[shiftvalue + 1] - 1) * 32
	BlockBoff = (BlockB[shiftvalue + 1] - 1) * 32
	BlockCoff = (BlockC[shiftvalue + 1] - 1) * 32
	BlockDoff = (BlockD[shiftvalue + 1] - 1) * 32
	
	-- Block A
	prng = checksum
	for i = 1, BlockA[shiftvalue + 1] - 1 do
		prng = mult32(prng,0x5F748241) + 0xCBA72510 -- 16 cycles
	end
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	pokemonID = bxr(memory.readword(pidAddr + BlockAoff + 8), gettop(prng))
	if gen == 4 and pokemonID > 494 then --just to make sure pokemonID is right (gen 4)
		pokemonID = -1 -- (pokemonID = -1 indicates invalid data)
	elseif gen == 5 and pokemonID > 651 then -- gen5
		pokemonID = -1 -- (pokemonID = -1 indicates invalid data)
	end
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	heldItem = bxr(memory.readword(pidAddr + BlockAoff + 2 + 8), gettop(prng))
	if gen == 4 and heldItem > 537 then -- Gen 4
		pokemonID = -1 -- (pokemonID = -1 indicates invalid data)
	elseif gen == 5 and heldItem > 639 then -- Gen 5
		pokemonID = -1 -- (pokemonID = -1 indicates invalid data)
	end
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	OTID = bxr(memory.readword(pidAddr + BlockAoff + 4 + 8), gettop(prng))
	prng = mult32(prng,0x41C64E6D) + 0x6073
	OTSID = bxr(memory.readword(pidAddr + BlockAoff + 6 + 8), gettop(prng))
	
	is_shiny = bxr(OTID, OTSID, getbits(pid, 0, 16), getbits(pid, 16, 16)) < 8
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	ability = bxr(memory.readword(pidAddr + BlockAoff + 12 + 8), gettop(prng))
	friendship_or_steps_to_hatch = getbits(ability, 0, 8)
	ability = getbits(ability, 8, 8)
	if gen == 4 and ability > 123 then
		pokemonID = -1 -- (pokemonID = -1 indicates invalid data)
	elseif gen == 5 and ability > 164 then
		pokemonID = -1
	end
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	evs[1] = bxr(memory.readword(pidAddr + BlockAoff + 16 + 8), gettop(prng))
	prng = mult32(prng,0x41C64E6D) + 0x6073
	evs[2] = bxr(memory.readword(pidAddr + BlockAoff + 18 + 8), gettop(prng))
	prng = mult32(prng,0x41C64E6D) + 0x6073
	evs[3] = bxr(memory.readword(pidAddr + BlockAoff + 20 + 8), gettop(prng))
	
	hpev =  getbits(evs[1], 0, 8)
	atkev = getbits(evs[1], 8, 8)
	defev = getbits(evs[2], 0, 8)
	speev = getbits(evs[2], 8, 8)
	spaev = getbits(evs[3], 0, 8)
	spdev = getbits(evs[3], 8, 8)
	
	-- Block B
	prng = checksum
	for i = 1, BlockB[shiftvalue + 1] - 1 do
		prng = mult32(prng,0x5F748241) + 0xCBA72510 -- 16 cycles
	end
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	move[1] = bxr(memory.readword(pidAddr + BlockBoff + 8), gettop(prng))
	if gen == 4 and move[1] > 467 then
		pokemonID = -1
	elseif gen == 5 and move[1] > 559 then
		pokemonID = -1
	end
	prng = mult32(prng,0x41C64E6D) + 0x6073
	move[2] = bxr(memory.readword(pidAddr + BlockBoff + 2 + 8), gettop(prng))
	if gen == 4 and move[2] > 467 then
		pokemonID = -1
	elseif gen == 5 and move[2] > 559 then
		pokemonID = -1
	end
	prng = mult32(prng,0x41C64E6D) + 0x6073
	move[3] = bxr(memory.readword(pidAddr + BlockBoff + 4 + 8), gettop(prng))
	if gen == 4 and move[3] > 467 then
		pokemonID = -1
	elseif gen == 5 and move[3] > 559 then
		pokemonID = -1
	end
	prng = mult32(prng,0x41C64E6D) + 0x6073
	move[4] = bxr(memory.readword(pidAddr + BlockBoff + 6 + 8), gettop(prng))
	if gen == 4 and move[4] > 467 then
		pokemonID = -1
	elseif gen == 5 and move[4] > 559 then
		pokemonID = -1
	end
	prng = mult32(prng,0x41C64E6D) + 0x6073
	moveppaux = bxr(memory.readword(pidAddr + BlockBoff + 8 + 8), gettop(prng))
	movepp[1] = getbits(moveppaux,0,8)
	movepp[2] = getbits(moveppaux,8,8)
	prng = mult32(prng,0x41C64E6D) + 0x6073
	moveppaux = bxr(memory.readword(pidAddr + BlockBoff + 10 + 8), gettop(prng))
	movepp[3] = getbits(moveppaux,0,8)
	movepp[4] = getbits(moveppaux,8,8)
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	ivspart[1] = bxr(memory.readword(pidAddr + BlockBoff + 16 + 8), gettop(prng))
	prng = mult32(prng,0x41C64E6D) + 0x6073
	ivspart[2] = bxr(memory.readword(pidAddr + BlockBoff + 18 + 8), gettop(prng))
	ivs = ivspart[1]  + lshift(ivspart[2],16)
	
	hpiv  = getbits(ivs,0,5)
	atkiv = getbits(ivs,5,5)
	defiv = getbits(ivs,10,5)
	speiv = getbits(ivs,15,5)
	spaiv = getbits(ivs,20,5)
	spdiv = getbits(ivs,25,5)
	isegg = getbits(ivs,30,1)
	isnicknamed = getbits(ivs,31,1) == 1
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	
	byte0x40 = bxr(memory.readword(pidAddr + BlockBoff + 24 + 8), gettop(prng));
	
	-- not sure which method is correct... 
	-- https://bulbapedia.bulbagarden.net/wiki/Personality_value#Gender uses the personality value...
	--
	-- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_data_structure_in_Generation_IV states this one
	--
	is_female = getbits(byte0x40, 1, 1) == 1
	
	alternate_form = getbits(byte0x40, 3, 5)
	
	-- Nature for gen 5, for gen 4, it's calculated from the PID.
	if gen == 5 then
		nat = getbits(byte0x40,8,8)
		if nat > 24 then
			pokemonID = -1
		end
	else -- gen == 4
		nat = pid % 25
	end
	
	-- Block C
	prng = checksum
	for i = 1, BlockC[shiftvalue + 1] - 1 do
		prng = mult32(prng,0x5F748241) + 0xCBA72510 -- 16 cycles
	end
	
	-- Block D
	prng = checksum
	for i = 1, BlockD[shiftvalue + 1] - 1 do
		prng = mult32(prng,0x5F748241) + 0xCBA72510 -- 16 cycles
	end
	
	prng = mult32(prng,0xCFDDDF21) + 0x67DBB608 -- 8 cycles
	prng = mult32(prng,0xEE067F11) + 0x31B0DDE4 -- 4 cycles
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	location_met = bxr(memory.readword(pidAddr + BlockDoff + 0x18 + 8), gettop(prng))
	prng = mult32(prng,0x41C64E6D) + 0x6073
	pkrs = bxr(memory.readword(pidAddr + BlockDoff + 0x1A + 8), gettop(prng))
	pkrs = getbits(pkrs,0,8)
	
	prng = mult32(prng,0x41C64E6D) + 0x6073
	level_met = bxr(memory.readword(pidAddr + BlockDoff + 0x1A + 8), gettop(prng))
	level_met = getbits(level_met, 0, 7)
	
	-- Current stats
	prng = pid
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	prng = mult32(prng,0x41C64E6D) + 0x6073
	level = getbits(bxr(memory.readword(pidAddr + 0x8C), gettop(prng)),0,8)
	if level > 100 then
		-- TODO: figure out why this happens
		pokemonID = -1
	end

	prng = mult32(prng,0x41C64E6D) + 0x6073
	hpstat = bxr(memory.readword(pidAddr + 0x8E), gettop(prng))
	--print("Current HP of pokemon in slot " .. q .. ": " .. hpstat)
	
	local slot
	if pokemonID ~= -1 then
		if pokemon[pokemonID + 1] ~= "none" then
			slot = Slot{
				otid = OTID,
				species = pokemonID,
				--nickname = isnicknamed and nickname or "",
				level = level,
				female = is_female,
				shiny = is_shiny,
				living = hpstat > 0,
			}
			
			if alternate_forms[pokemonID] ~= nil then
				slot["alternate_form"] = alternate_forms[pokemonID][alternate_form + 1]
			end
		else
			slot = Slot()
		end

		return slot
	end

	return nil
end

function do_print_first_pokemon_bytes(pidAddr)
	first_pokemon_bytes = string.format("{ %s }", table.concat(memory.readbyterange(pidAddr, 0x27), ", "))
				
	print("---------------------------")
	print(first_pokemon_bytes)
	print("---------------------------")	
end

function fn()
	--menu()
	current_time = os.time()
	if current_time - last_check > 1 then
		party = {}
		for q = 1, 6 do
			submode = q
			gen = getGen()
			pointer = getPointer()
			pidAddr = getPidAddr()

			if print_first_pokemon_bytes and first_run and q == 1 then
				do_print_first_pokemon_bytes(pidAddr)
			end
			
			party[q] = readPokemon(pidAddr)
		end
		
		local send_data = {}		
		if first_run then
			reset_server()
			last_party = {}
			for k, slot in pairs(party) do
				last_party[k] = slot
				
				print("Slot " .. k .. ": " .. tostring(slot))
				send_data[#send_data + 1] = { slot_id = k, slot = slot }
			end
			first_run = false
		else
			-- For each party slot
			-- print(party)
			-- print(last_party)
			for q = 1, 6 do
				p = party[q]
				lp = last_party[q]
				if p ~= nil and lp ~= nil then
					if p ~= lp then
						print("Slot " .. q .. ": " .. tostring(lp) .. " -> " .. tostring(p))
						send_data[#send_data + 1] = { slot_id = q, slot = p }
					end
				end
			end
			
			last_party = {}
			for k, v in pairs(party) do
				last_party[k] = v
			end
		end

		if (#send_data > 0) then
			send_slots(send_data)
		end

		last_check = current_time
	end
end

gui.register(fn)

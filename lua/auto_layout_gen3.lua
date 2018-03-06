local http = require "socket.http"
local ltn12 = require "ltn12"

-- IMPORTANT: if you edit this value, you must also edit it in /node/config.json
local serverPort = 8081
local serverRoot = "http://localhost:" .. tostring(serverPort)

-- Based on the gen 3 Lua script by FractalFusion
-- Modified by EverOddish for automatic image updates
local game=3 --see below
local startvalue=0x83ED --insert the first value of RNG

-- These are all the possible key names: [keys]
-- backspace, tab, enter, shift, control, alt, pause, capslock, escape,
-- space, pageup, pagedown, end, home, left, up, right, down, insert, delete,
-- 0 .. 9, A .. Z, numpad0 .. numpad9, numpad*, numpad+, numpad-, numpad., numpad/,
-- F1 .. F24, numlock, scrolllock, semicolon, plus, comma, minus, period, slash, tilde,
-- leftbracket, backslash, rightbracket, quote.
-- [/keys]
-- Key names must be in quotes.
-- Key names are case sensitive.
local key={"9", "8", "7"}

-- It is not necessary to change anything beyond this point.

--for different display modes
local status=1
local substatus={1,1,1}

local tabl={}
local prev={}

local xfix=0 --x position of display handle
local yfix=65 --y position of display handle

local xfix2=105 --x position of 2nd handle
local yfix2=0 --y position of 2nd handle

local k 

local new_party = ""
 
local last_check = 0
local last_party = {0, 0, 0, 0, 0, 0}
local last_nicknames = {"", "", "", "", "", "", ""}
local last_levels = {-1, -1, -1, -1, -1, -1}
local last_living_states = {true, true, true, true, true, true}
local print_ivs = 0

--for different game versions
--1: Ruby/Sapphire U
--2: Emerald U
--3: FireRed/LeafGreen U
--4: Ruby/Sapphire J
--5: Emerald J (TODO)
--6: FireRed/LeafGreen J (1360)

local gamename={"Ruby/Sapphire U", "Emerald U", "FireRed/LeafGreen U", "Ruby/Sapphire J", "Emerald J", "FireRed/LeafGreen J (1360)"}

--game dependent

local pstats={0x03004360, 0x020244EC, 0x02024284, 0x03004290, 0x02024190, 0x020241E4}
local estats={0x030045C0, 0x02024744, 0x0202402C, 0x030044F0, 0x00000000, 0x02023F8C}
local rng   ={0x03004818, 0x03005D80, 0x03005000, 0x03004748, 0x00000000, 0x03005040} --0X03004FA0
local rng2  ={0x00000000, 0x00000000, 0x020386D0, 0x00000000, 0x00000000, 0x0203861C}


--HP, Atk, Def, Spd, SpAtk, SpDef
local statcolor = {"yellow", "red", "blue", "green", "magenta", "cyan"}


dofile "auto_layout_gen3_tables.lua"

local flag=0
local last=0
local counter=0

local bnd,br,bxr=bit.band,bit.bor,bit.bxor
local rshift, lshift=bit.rshift, bit.lshift
local mdword=memory.readdwordunsigned
local mword=memory.readwordunsigned
local mbyte=memory.readbyteunsigned

local natureorder={"Atk","Def","Spd","SpAtk","SpDef"}
local naturename={
 "Hardy","Lonely","Brave","Adamant","Naughty",
 "Bold","Docile","Relaxed","Impish","Lax",
 "Timid","Hasty","Serious","Jolly","Naive",
 "Modest","Mild","Quiet","Bashful","Rash",
 "Calm","Gentle","Sassy","Careful","Quirky"}
local typeorder={
 "Fighting","Flying","Poison","Ground",
 "Rock","Bug","Ghost","Steel",
 "Fire","Water","Grass","Electric",
 "Psychic","Ice","Dragon","Dark"}

--a 32-bit, b bit position bottom, d size
function getbits(a,b,d)
 return rshift(a,b)%lshift(1,d)
end

--for RNG purposes
function gettop(a)
 return(rshift(a,16))
end


--does 32-bit multiplication
--necessary because Lua does not allow 32-bit integer definitions
--so one cannot do 32-bit arithmetic
--furthermore, precision loss occurs at around 10^10
--so numbers must be broken into parts
--may be improved using bitop library exclusively
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

--checksum stuff; add halves
function ah(a)
 b=getbits(a,0,16)
 c=getbits(a,16,16)
 return b+c
end

function update_slot_info(info)
    local request_body = [[species=]] .. info.species .. [[&level=]] .. tostring(info.level) .. [[&changeId=]] .. 
        tostring(info.change_id) .. [[&dead=]] .. tostring(info.dead) .. [[&nickname=]] .. tostring(info.nickname) ..
        [[&shiny=]] .. tostring(info.shiny)
    http.request({
        method = "POST",
        url = serverRoot .. "/update/" .. tostring(info.slot),
        source = ltn12.source.string(request_body),
        headers = {
            ["Content-Type"] = "application/x-www-form-urlencoded",
            ["content-length"] = #request_body
        }
    })
end

local slot_changes = {0, 0, 0, 0, 0, 0}

http.request(serverRoot .. "/reset");

--a press is when input is registered on one frame but not on the previous
--that's why the previous input is used as well
prev=input.get()
function fn()

  tabl=input.get()
 
  if tabl["Q"] and not prev["Q"] then
      print_ivs = 1
  end
--*********
current_time = os.time()
if current_time - last_check > 1 then

-- now for display
 if status==1 or status==2 then --status 1 or 2

   if print_ivs == 1 then
       print("")
   end

   party = {}

   for slot = 1, 6 do
    if status==1 then
     start=pstats[game]+100*(slot-1)
    else
     start=estats[game]+100*(substatus[2]-1)
    end

    personality=mdword(start)
    trainerid=mdword(start+4)
    magicword=bxr(personality, trainerid)
	
    i=personality%24

    nicknameoffset=8
    nicknamelength=10
	growthoffset=(growthtbl[i+1]-1)*12
	attackoffset=(attacktbl[i+1]-1)*12
	effortoffset=(efforttbl[i+1]-1)*12
	miscoffset=(misctbl[i+1]-1)*12
    
    nicknamebytes=memory.readbyterange(start+nicknameoffset,nicknamelength)
    nickname=""
    for j=1,10 do
        if nicknamebytes[j] ~= nil and characterTable[nicknamebytes[j]] ~= nil then
            nickname = nickname .. characterTable[nicknamebytes[j]]
        end
    end
	
	growth1=bxr(mdword(start+32+growthoffset),magicword)
	growth2=bxr(mdword(start+32+growthoffset+4),magicword)
	growth3=bxr(mdword(start+32+growthoffset+8),magicword)
	
	attack1=bxr(mdword(start+32+attackoffset),magicword)
	attack2=bxr(mdword(start+32+attackoffset+4),magicword)
	attack3=bxr(mdword(start+32+attackoffset+8),magicword)
	
	effort1=bxr(mdword(start+32+effortoffset),magicword)
	effort2=bxr(mdword(start+32+effortoffset+4),magicword)
	effort3=bxr(mdword(start+32+effortoffset+8),magicword)
	
	misc1=bxr(mdword(start+32+miscoffset),magicword)
	misc2=bxr(mdword(start+32+miscoffset+4),magicword)
	misc3=bxr(mdword(start+32+miscoffset+8),magicword)
	
    cs=ah(growth1)+ah(growth2)+ah(growth3)+ah(attack1)+ah(attack2)+ah(attack3)
	  +ah(effort1)+ah(effort2)+ah(effort3)+ah(misc1)+ah(misc2)+ah(misc3)
	
	cs=cs%65536

    species=getbits(growth1,0,16)

    holditem=getbits(growth1,16,16)

    pokerus=getbits(misc1,0,8)

    ivs=misc2

    evs1=effort1
    evs2=effort2

    hpiv=getbits(ivs,0,5)
    atkiv=getbits(ivs,5,5)
    defiv=getbits(ivs,10,5)
    spdiv=getbits(ivs,15,5)
    spatkiv=getbits(ivs,20,5)
    spdefiv=getbits(ivs,25,5)

    hpev=getbits(evs1, 0, 8)
    atkev=getbits(evs1, 8, 8)
    defev=getbits(evs1, 16, 8)
    spdev=getbits(evs1, 24, 8)
    spatkev=getbits(evs2, 0, 8)
    spdefev=getbits(evs2, 8, 8)

    nature=personality%25
    natinc=math.floor(nature/5)
    natdec=nature%5

    hidpowtype=math.floor(((hpiv%2 + 2*(atkiv%2) + 4*(defiv%2) + 8*(spdiv%2) + 16*(spatkiv%2) + 32*(spdefiv%2))*15)/63)
    hidpowbase=math.floor((( getbits(hpiv,1,1) + 2*getbits(atkiv,1,1) + 4*getbits(defiv,1,1) + 8*getbits(spdiv,1,1) + 16*getbits(spatkiv,1,1) + 32*getbits(spdefiv,1,1))*40)/63 + 30)

	move1=getbits(attack1,0,16)
	move2=getbits(attack1,16,16)
	move3=getbits(attack2,0,16)
	move4=getbits(attack2,16,16)
	pp1=getbits(attack3,0,8)
	pp2=getbits(attack3,8,8)
	pp3=getbits(attack3,16,8)
	pp4=getbits(attack3,24,8)

    movename1=movetbl[move1]
    if movename1==nil then movename1="none" end
    movename2=movetbl[move2]
    if movename2==nil then movename2="none" end
    movename3=movetbl[move3]
    if movename3==nil then movename3="none" end
    movename4=movetbl[move4]
    if movename4==nil then movename4="none" end

    speciesname=pokemontbl[species]
    if speciesname==nil then speciesname="none" end
    
    level=mbyte(start+84)

    if "none" ~= speciesname then
        party_member = {}
        party_member["id"] = speciesname
        --party_member["item"] = holditem
        party_member["item"] = "none"
        --party_member["ability"] = abilities[ability + 1] 
        party_member["ability"] = "--"
        party_member["nature"] = naturename[nature+1]
        party_member["level"] = level
        party_member["hiddenpower"] = typeorder[hidpowtype+1]
        party_member["ivs"] = hpiv .. "/" .. atkiv .. "/" .. defiv .. "/" .. spatkiv .. "/" .. spdefiv .. "/" .. spdiv
        party_member["evs"] = hpev .. "/" .. atkev .. "/" .. defev .. "/" .. spatkev .. "/" .. spdefev .. "/" .. spdev
        party_member["evsum"] = hpev + atkev + defev + spatkev + spdefev + spdev
        party_member["move1"] = movename1
        party_member["move2"] = movename2
        party_member["move3"] = movename3
        party_member["move4"] = movename4

        party[slot] = party_member
    end

    current_hp=mword(start+86)

    local last_state = {
        species = last_party[slot],
        nickname = last_nicknames[slot],
        level = last_levels[slot],
        is_living = last_living_states[slot]
    }

    local current_state = {
        species = species,
        nickname = nickname,
        level = level,
        is_living = current_hp ~= nil and current_hp > 0
    }

    local change = false
    local src

    if last_state.species ~= current_state.species then
        change = true
        print("Slot " .. slot .. " -> " .. speciesname)
        last_party[slot] = species

        if speciesname == "none" then
            src = -1
        else
            src = species
        end
    end

    if last_state.nickname ~= current_state.nickname then
        change = true
        if speciesname == "none" then
            last_nicknames[slot] = ""
            print("Removed nickname for slot " .. slot)
        else
            print("Slot " .. slot .. " nickname -> " .. nickname)
        end

        last_nicknames[slot] = nickname
    end

    if last_state.level ~= current_state.level then
        change = true
        if speciesname == "none" then
            level_text = ""
            print("Removed level for slot " .. slot)
        else
            level_text = "Lv. " .. level
            print("Slot " .. slot .. " is now " .. level_text)
        end

        last_levels[slot] = level
    end

    if last_state.is_living ~= current_state.is_living then
        change = true
        if speciesname == "none" then
            print("Removed living state from slot " .. slot)
        else
            living_text = "dead" 
            if current_state.is_living then
                living_text = "living"
            end
            print("Slot " .. slot .. " is now " .. living_text)
        end

        last_living_states[slot] = current_state.is_living
    end

    if speciesname == "none" then
        src = -1
    else
        if species >= 284 and species <= 411 then
            -- gen 3 pokemon... for some reason there are 25 blank pokemon between 251 and 276
            src = species - 25
        elseif species > 411 then
            -- unown variations
            src = '200-' .. string.char(string.byte('a') + species - 411)
        else
            src = species
        end
    end

    if change then
        update_slot_info({
            change_id = slot_changes[slot],
            species = tostring(src),
            nickname = nickname,
            level = level,
            slot = slot,
            dead = not current_state.is_living,
            shiny = false -- TODO: shiny detection
        })

        slot_changes[slot] = slot_changes[slot] + 1
    end

    if print_ivs == 1 then
        if speciesname ~= "none" then
            evsum = hpev + atkev + defev + spatkev + spdefev + spdev
            print("Pokemon: " .. speciesname .. " IV(" .. hpiv .. "/" .. atkiv .. "/" .. defiv .. "/" .. spatkiv .. "/" 
                .. spdefiv .. "/" .. spdiv .. ") EV(" .. hpev .. "/" .. atkev .. "/" .. defev .. "/" .. spatkev .. "/" 
                .. spdefev .. "/" .. spdev .. ") " .. evsum .. "/508")
        end
    end

    --print("slot " .. slot .. " " .. speciesname)
   end -- for loop slots

   last_check = current_time
   if print_ivs == 1 then
       print("")
   end
   print_ivs = 0
 end --status 1 or 2

 
end
end
    
--*********
gui.register(fn)

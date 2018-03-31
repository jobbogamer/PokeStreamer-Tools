local addrs = { 0x0227c374, 0x022a6e10, 0x022cad64, 0x0267c374, 0x026a6e10, 0x026cad64, 0x02a7c374, 0x02aa6e10, 0x02acad64, 0x02e7c374, 0x02ea6e10, 0x02ecad64 }
--addrs = { 0x0227c2ac, 0x022a1da4, 0x022a6d48, 0x022c1464, 0x022c1558, 0x022c15f4, 0x022c1610, 0x022c16e8, 0x022c1744, 0x022c1838, 0x022c1894, 0x022c1a38, 0x022c1a94, 0x022c1b88, 0x022c1d54, 0x022c1db0, 0x022c1ea4, 0x022c2070, 0x022c20cc, 0x022c21c0, 0x022c221c, 0x022c23c0, 0x022c6080, 0x022cac9c, 0x022cc6d4, 0x022fad9c, 0x022fc300, 0x02399a2c, 0x0267c2ac, 0x026a1da4, 0x026a6d48, 0x026c1464, 0x026c1558, 0x026c15f4, 0x026c1610, 0x026c16e8, 0x026c1744, 0x026c1838, 0x026c1894, 0x026c1a38, 0x026c1a94, 0x026c1b88, 0x026c1d54, 0x026c1db0, 0x026c1ea4, 0x026c2070, 0x026c20cc, 0x026c21c0, 0x026c221c, 0x026c23c0, 0x026c6080, 0x026cac9c, 0x026cc6d4, 0x026fad9c, 0x026fc300, 0x02799a2c, 0x02a7c2ac, 0x02aa1da4, 0x02aa6d48, 0x02ac1464, 0x02ac1558, 0x02ac15f4, 0x02ac1610, 0x02ac16e8, 0x02ac1744, 0x02ac1838, 0x02ac1894, 0x02ac1a38, 0x02ac1a94, 0x02ac1b88, 0x02ac1d54, 0x02ac1db0, 0x02ac1ea4, 0x02ac2070, 0x02ac20cc, 0x02ac21c0, 0x02ac221c, 0x02ac23c0, 0x02ac6080, 0x02acac9c, 0x02acc6d4, 0x02afad9c, 0x02afc300, 0x02b99a2c, 0x02e7c2ac, 0x02ea1da4, 0x02ea6d48, 0x02ec1464, 0x02ec1558, 0x02ec15f4, 0x02ec1610, 0x02ec16e8, 0x02ec1744, 0x02ec1838, 0x02ec1894, 0x02ec1a38, 0x02ec1a94, 0x02ec1b88, 0x02ec1d54, 0x02ec1db0, 0x02ec1ea4, 0x02ec2070, 0x02ec20cc, 0x02ec21c0, 0x02ec221c, 0x02ec23c0, 0x02ec6080, 0x02ecac9c, 0x02ecc6d4, 0x02efad9c, 0x02efc300, 0x02f99a2c, }
-- addrs = { 0x0227c330, 0x022a1e28, 0x022a6dcc, 0x022c1590, 0x022c6104, 0x022cad20, 0x022cc4f0, 0x0267c330, 0x026a1e28, 0x026a6dcc, 0x026c1590, 0x026c6104, 0x026cad20, 0x026cc4f0, 0x02a7c330, 0x02aa1e28, 0x02aa6dcc, 0x02ac1590, 0x02ac6104, 0x02acad20, 0x02acc4f0, 0x02e7c330, 0x02ea1e28, 0x02ea6dcc, 0x02ec1590, 0x02ec6104, 0x02ecad20, 0x02ecc4f0 }
addrs = { 0x22CAE0C }
local Pokemon = require("pokemon")

local bnd,br,bxr=bit.band,bit.bor,bit.bxor
local rshift, lshift=bit.rshift, bit.lshift
local mdword=memory.readdwordunsigned
local mword=memory.readwordunsigned
local mbyte=memory.readbyteunsigned
function getbits(a,b,d)
	return rshift(a,b)%lshift(1,d)
end

function read_pokemon_words(addr, num_words)
	local words = {}
	-- PID is taken as a whole, and we're in little endian hell, so reverse words
	local dword = memory.readdword(addr)
	words[1] = getbits(dword, 16, 16)
	words[2] = getbits(dword, 0, 16)

	-- -- unused variable and checksum are sparate words
	dword = memory.readdword(addr + 4)
	words[3] = getbits(dword, 0, 16)
	words[4] = getbits(dword, 16, 16)

	for i = 8, (num_words - 1) * 2, 4 do
		dword = memory.readdword(addr + i)
		words[#words + 1] = getbits(dword, 0, 16)
		words[#words + 1] = getbits(dword, 16, 16)
	end
	return words
end

for i, addr in ipairs(addrs) do
    local words = read_pokemon_words(addr, Pokemon.word_size_in_party)
    local p = Pokemon.parse_gen4_gen5(words, false, 4)
    if p ~= nil and p.valid and p.current_hp == 12 then print(string.format("0x%08x", addr)) end
end

-- Slot 1
---------

-- SS
-- BBB (Ratatta)
-- 0x0227c2ac
--
-- 0x022cac9c ... 4E9F0
-- 0x026cac9c
-- 0x02acac9c
-- 0x02ecac9c

-- Chikorita
-- 0x0227c374 ... 4E9F0
--
-- 0x022cad64
-- 0x026cad64
-- 0x02acad64
-- 0x02ecad64

-- HG
-- AAA (Totadile)
--
-- 0x0227C330
--
-- 0x022cad20

-- Slot 2
---------

-- HG
-- aaa (Pidgey)
--
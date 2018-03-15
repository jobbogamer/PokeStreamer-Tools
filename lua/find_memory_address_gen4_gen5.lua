local find_all_locations = false

rom_base = 0x02000000
needle = { 136, 81, 55, 226, 0, 0, 163, 222, 216, 217, 237, 216, 91, 100, 29, 156, 21, 112, 98, 220, 211, 131, 159, 43, 122, 6, 53, 194, 115, 35, 40, 167, 219, 147, 248, 76, 63, 247, 202 }
rbyte = memory.readbyteunsigned
for i=0,0xFFFFFF do
    byte = rbyte(rom_base + i)
    if byte == needle[1] then
        found_needle = true
        for j = 1, #needle do
            bbyte = rbyte(rom_base + i + j - 1)
            if bbyte ~= needle[j] then
                found_needle = false
                break
            end
        end
-- 
        if found_needle then
            print(string.format("0x%08x", i + rom_base))

            if find_all_locations then
                found_needle = false
            else
                return
            end
        end
    end
end

print("not found")

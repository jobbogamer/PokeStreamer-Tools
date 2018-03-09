rom_base = 0x08000000
bulbasaur_bytes = { 0x2D, 0x31, 0x31, 0x2D, 0x41, 0x41, 0x0C, 0x03, 0x2D, 0x40, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x1F, 0x14, 0x46, 0x03, 0x01, 0x07, 0x41, 0x00, 0x00, 0x03, 0x00, 0x00 }
rbyte = memory.readbyteunsigned
for i=0,0xFFFFFF do
    byte = rbyte(rom_base + i)
    if byte == bulbasaur_bytes[1] then
        found_bulbasaur = true
        for j = 1, 28 do
            bbyte = rbyte(rom_base + i + j - 1)
            if bbyte ~= bulbasaur_bytes[j] then
                found_bulbasaur = false
                break
            end
        end

        if found_bulbasaur then
            print(string.format("0x%08x", i + rom_base))
            return
        end
    end
end

print("not found")

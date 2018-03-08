-- IMPORTANT: if you edit this value, you must also edit it in /node/config.json
local server_port = 8081
local server_root = "http://localhost:" .. tostring(server_port)

local http = require "socket.http"
local ltn12 = require "ltn12"

local change_ids = { 0, 0, 0, 0, 0, 0 }

function reset_server()
    print("Resetting server")
    http.request(server_root .. "/reset");
end

function send_slot_info(slot_id, slot)
    print("Sending info for slot " .. tostring(slot_id))
    local change_id = change_ids[slot_id]
    change_ids[slot_id] = change_id + 1
    
    local request_body = [[species=]] .. slot.species .. [[&level=]] .. tostring(slot.level) .. [[&changeId=]] .. 
        tostring(change_id) .. [[&dead=]] .. tostring(not slot.living) .. [[&nickname=]] .. tostring(slot.nickname) ..
        [[&shiny=]] .. tostring(slot.shiny) .. [[&female=]] .. tostring(slot.female)
    http.request({
        method = "POST",
        url = server_root .. "/update/" .. tostring(slot_id),
        source = ltn12.source.string(request_body),
        headers = {
            ["Content-Type"] = "application/x-www-form-urlencoded",
            ["content-length"] = #request_body
        }
    })
end
-- IMPORTANT: if you edit this value, you must also edit it in /node/config.json
local server_port = 8081
local server_root = "http://localhost:" .. tostring(server_port)
local api_root = server_root .. "/api"

local http = require "socket.http"
local ltn12 = require "ltn12"

local change_ids = { 0, 0, 0, 0, 0, 0 }

function reset_server()
    print("Resetting server")
    http.request(api_root .. "/reset");
end

function bool_to_int(b)
    return b and 1 or 0
end

function send_slot_info(slot_id, slot)
    print("Sending info for slot " .. tostring(slot_id))
    local change_id = change_ids[slot_id]
    change_ids[slot_id] = change_id + 1
    nickname = string.gsub(slot.nickname, "&", "%26")
    
    local request_body = string.format(
        "species=%d&level=%d&changeId=%d&dead=%s&nickname=%s&shiny=%s&female=%s&levelMet=%d&locationMet=%d", 
        slot.species, slot.level, change_id, bool_to_int(not slot.living), slot.nickname, bool_to_int(slot.shiny), 
        bool_to_int(slot.female), slot.level_met, slot.location_met)
    http.request({
        method = "POST",
        url = api_root .. "/api/update/" .. tostring(slot_id),
        source = ltn12.source.string(request_body),
        headers = {
            ["Content-Type"] = "application/x-www-form-urlencoded",
            ["content-length"] = #request_body
        }
    })
end
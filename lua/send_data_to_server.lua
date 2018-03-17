-- IMPORTANT: if you edit this value, you must also edit it in /node/config.json
local server_port = 8081
local api_host = 'api.pokemon-soul.link'
local api_root = "http://" .. api_host .. ":" .. tostring(server_port) .. "/api"

local http = require "socket.http"
local ltn12 = require "ltn12"

local change_ids = { 0, 0, 0, 0, 0, 0 }
local box_change_ids = {}

for box = 1, 18 do
    box_change_ids[box] = {}
    for box_slot = 1, 30 do
        box_change_ids[box][box_slot] = 0
    end
end

function reset_server()
    print("Resetting server")
    http.request(api_root .. "/reset");
end

function send_slots(slots_info, generation)
    local slot_messages = {}
    for i, slot_info in ipairs(slots_info) do
        slot_messages[i] = get_slot_json(slot_info)
    end

    local request_body = string.format("[\n    %s\n]", table.concat(slot_messages, ",\n    "))
    
    print("Sending server request:")
    local pretty_print = string.gsub(request_body, "\n", "\r\n"); 
    print(pretty_print)

    local res, status, headers = http.request{
        method = "POST",
        url = api_root .. "/update",
        source = ltn12.source.string(request_body),
        headers = {
            ["Content-Type"] = "application/json",
            ["content-length"] = #request_body,
            ["Pokemon-Generation"] = generation
        }
    }

    if status ~= 200 then
        print(string.format("HTTP Request failed: %s", status))
    end
end

-- assumes info.slot is a flat table
function get_slot_json(info)
    setmetatable(info, { __index = { box_id = nil } })
    local slot = info.slot
    local slot_id = info.slot_id
    local box_id = info.box_id

    local change_id
    if box_id ~= nil then
        change_id = box_change_ids[box_id][slot_id]
        box_change_ids[box_id][slot_id] = box_change_ids[box_id][slot_id] + 1
    else
        change_id = change_ids[slot_id]
        change_ids[slot_id] = change_id + 1
    end

    local box_string = box_id ~= nil and string.format("        \"box\": %i,\n", box_id) or ""
    
    val_table = {}
    for key, val in pairs(slot) do
        if val ~= nil then
            key = string.gsub(string.gsub(key, "_(%l)", string.upper), [["]], [[\"]])

            if type(val) ~= "number" and type(val) ~= "boolean" then
                val = [["]] .. string.gsub(tostring(val), [["]], [[\"]]) .. [["]]
            end

            if val ~= nil then
                val_table[#val_table + 1] = string.format([["%s": %s]], key, tostring(val))
            end
        else
            print(key)
        end
    end

    return string.format([[{
        %s"slot": %d,
        "changeId": %d,
        "pokemon": {
            %s
        }
    }]], box_string, slot_id, change_id, table.concat(val_table, ",\n            "))
end
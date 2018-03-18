-- IMPORTANT: if you edit this value, you must also edit it in /node/config.advanced.json
local server_port = 8081
local api_host = 'api.pokemon-soul.link'
local api_root = "http://" .. api_host .. ":" .. tostring(server_port) .. "/api"

local print_debug_messages = false
local print_debug = require("print_debug")
print_debug = print_debug(print_debug_messages)

local json = require("dkjson")
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
    print_debug("Resetting server")
    http.request(api_root .. "/reset");
end

function send_request(request_body, generation)
    print_debug("Generation" .. tostring(generation))
    print_debug("Sending server request")
    local pretty_print = string.gsub(request_body, "\n", "\r\n"); 
    print_debug(pretty_print)

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

function send_slots(slots_info, generation)
    local tmp_info = {}
    for i, v in ipairs(slots_info) do
        tmp_info[#tmp_info + 1] = get_slot_data(v)
    end

    if #tmp_info <= 20 then
        local request_body = json.encode(tmp_info, { indent = print_debug_messages })
        send_request(request_body, generation)
    else
        local idx = 1
        while idx < #tmp_info do
            local batch = {}
            for i = 1, 20 do
                batch[i] = tmp_info[idx]
                idx = idx + 1
                if idx > #tmp_info then
                    break
                end
            end

            local request_body = json.encode(batch, { indent = print_debug_messages })
            send_request(request_body, generation)
        end
    end
end

function get_slot_data(info)
    local box_id = info.box_id
    local slot_id = info.slot_id
    local pokemon = info.pokemon

    if info.box_id ~= nil then
        local change_id = box_change_ids[box_id][slot_id]
        box_change_ids[box_id][slot_id] = box_change_ids[box_id][slot_id] + 1
        return {
            box = box_id,
            slot = slot_id,
            changeId = change_id,
            pokemon = pokemon:toJsonSerializableTable()
        }
    else
        local change_id = change_ids[slot_id]
        change_ids[slot_id] = change_ids[slot_id] + 1
        return {
            slot = slot_id,
            changeId = change_id,
            pokemon = pokemon:toJsonSerializableTable()
        }
    end
end
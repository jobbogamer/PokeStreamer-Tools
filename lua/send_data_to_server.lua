-- IMPORTANT: if you edit this value, you must also edit it in /node/config.advanced.json
local server_port = 8081
local server_host = 'stream.pokemon-soul.link'

local api_host = 'api.' .. server_host
local api_root = "http://" .. api_host .. ":" .. tostring(server_port) .. "/api"

local print_debug_messages = true
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

function get_game_version(gen, game, subgame)
    if gen < 3 or gen > 5 then
        print("[ERROR] Invalid game generation:", gen)
        return nil
    end

    if gen == 3 then
        if game > 6 then 
            print("[ERROR] Invalid game selected for gen 3:", game)
            return nil
        end
        
        game = game % 3
        return game == 0 and (subgame == 1 and "fr" or "lg")
            or game == 1 and (subgame == 1 and "r" or "s")
            or "e"
    elseif gen == 4 then
        if game > 3 then
            print("[ERROR] Invalid game selected for gen 4:", game)
            return nil
        end

        return game == 1 and (subgame == 1 and "d" or "p")
            or game == 2 and (subgame == 1 and "g" or "ss")
            or "pt"
    else -- gen 5
        if game < 4 or game > 7 then
            print("[ERROR] Invalid game selected for gen 5:", game)
            return nil
        end

        return game == 4 and "b" 
            or game == 5 and "w"
            or game == 6 and "b2"
            or game == 7 and "w2"
    end
end

function send_request(request_body, generation, game_version)
    print_debug("Generation" .. tostring(generation))
    print_debug("Sending server request to", api_host)
    local pretty_print = string.gsub(request_body, "\n", "\r\n"); 
    print_debug(pretty_print)

    local res, status, headers = http.request{
        method = "POST",
        url = api_root .. "/update",
        source = ltn12.source.string(request_body),
        headers = {
            ["Content-Type"] = "application/json",
            ["content-length"] = #request_body,
            ["Pokemon-Generation"] = generation,
            ["Pokemon-Game"] = game_version
        }
    }

    if status ~= 200 then
        print(string.format("HTTP Request failed: %s", status))

        if status == "connection refused" then
            -- don't try to send any more requests to prevent game from crashing
            return false
        end
    end

    return true
end

function send_slots(slots_info, generation, game, subgame)
    local game_version = get_game_version(generation, game, subgame)
    if game_version == nil then
        return true
    end

    local tmp_info = {}
    for i, v in ipairs(slots_info) do
        tmp_info[#tmp_info + 1] = get_slot_data(v)
    end

    if #tmp_info <= 20 then
        local request_body = json.encode(tmp_info, { indent = print_debug_messages })
        return send_request(request_body, generation, game_version)
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
            if not send_request(request_body, generation, game_version) then
                return false
            end
        end
    end

    return true
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
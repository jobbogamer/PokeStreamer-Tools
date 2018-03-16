About
=====

[Failstream](https://twitch.tv/failstream) (aka Fail) and [iIPK](https://twitch.tv/iipk) are beginning a [Pokémon Nuzlocke SoulLink](https://docs.google.com/spreadsheets/d/1I8DQiKmXv1VvwF-Y6wV7TeRQ1UER-Vytw4XyzELU6X0/edit#gid=1702173992) run of Pokémon HeartGold/SoulSilver next Monday (March 19th, 2018).

EverOddish wrote some [Pokémon streamming tools](https://github.com/EverOddish/PokeStreamer-Tools) that Fail used, but due to some synchronous file-write operations, any time pokémon switched positions, the game (and more importantly, the game audio) would lag/stutter.  As a favor to Fail (and for fun), I wrote a quick [NodeJS server](https://github.com/dfoverdx/PokeStreamer-Tools) that would serve the images to a webpage rather than saving them to disk, thus removing the game lag.

When Fail announced his upcoming SoulLink run, I decided to improve my tools to make that handling seamless and automatic.  

<details>
    <summary>Broad strokes technical details of what's complete and what's left</summary>
    
I've got the majority of the aesthetic/styling and configuration code complete, as well as most of the framework.  The major things I have left are handling communication between the two players' servers, and storing the Pokémon information locally in a logical/extensible/usable way.  The crux of the data store is that the Pokémon games don't assign Pokémon unique IDs, so identifying a specific Pokémon has moved can be tricky.
</details>


### Priority defintions ###

*   High priority: required for release (vCurrent)
*   Mid priority: nice-to-haves for vCurrent
*   Low prioirty: vNext (if ever)

### vCurrent release date ###

**3/19/2018** -- Major improvement: **SoulLink functionality**

General Features
================

Mid priority
------------

- [ ] Control Panel page
    - [ ] Specify links manually
    - [ ] Specify validity or invalidity of pokémon
        -   Special cases (see below)
    - [ ] Pokémon disambiguation when data from Lua looks suspect

Client
======

High priority
-------------

- [ ] Display Nuzlocke images/data on screen

Server
======

High priority
-------------

- [ ] Detect when starting a new game
    <details><summary>Possible solutions</summary>

    -   **Ideal case** <sup>mid-priority</sup>: Figure out where [trainer ID and secret trainer id](https://bulbapedia.bulbagarden.net/wiki/Trainer_ID_number) are stored in game memory (as opposed to the Trainer ID on specific Pokémon)
    -   Use case where all pokémon slots are empty; detect OTID/OTSID when the first pokémon is chosen
    -   Use Control Panel to manually specify a new game
</details>

- [x] Refactor pokémon data out of `Slot` class and into `Pokemon` class.  
    -   A `Slot` contains a `Pokemon` as well as slot information (slot id, box id)

Pokémon
=======

High priority
-------------

- [ ] Determine how to identify pokémon uniquely

    <details><summary>Current strategy</summary>
        
    Use a key {OTID/OTSID, Location Met, Level Met, Shininess} to determine a pokémon is unique  
    Create an internally used Pokemon id -- probably the same value we use for linking  
    Use this ID for communications  
    When the key is somehow ambiguous:
    -   Use nickname if possible (don't know how to parse it yet in Lua script, though I could just use the encrypted bytes.  Come to think of it, this might be best.  "Official" Nuzlocke rules require to you nickname every pokémon.  I could require every pokémon to have a unique nickname.)
    -   Attempt to check by species
    -   Use TBD disambiguation strategy (like Control Panel)
</details>

- [ ] Handle special cases
    -   Static pokémon
- [ ] Pokémon disambiguation (if I can't figure out perfect unique key)


Mid priority
------------

- [ ] Handle special cases (continued)
    - [ ] Shiny pokémon
    - [ ] HM slaves
        -   Treat like any other invalid/unlinked pokémon
        -   Assume they are invalid if they're the second pokémon caught in an area that is not shiny or static

Database
========

- [ ] MongoDB integration
- [ ] Refactor handling of server requests code out of server/index.js

Discord
=======

High priority
-------------

- [ ] Protocal schema

Mid (possibly high) prority
---------------------------

- [ ] Handle 2000-char limit
    - [ ] Use uglified JSON.stringify() (look at [jsonminify](https://www.npmjs.com/package/jsonminify))
    - [ ] Use shortened property names
    - [ ] When 2000-char limit is unavoidable (theoretically should only happen when blitting an entire pokémon set), send as .json file
- [ ] File reading


Lua
===

High priority
-------------

- [ ] Blit boxed pokémon to server  
    <details>
    Detect how many pokémon are in a box to ensure that we collect all the data before blitting(?)
    
    The issue is the script sometimes gets invalid data, and simply ignores that data.  If we're using this blit as an authority, we need to make sure none of these blips have occurred.
    </details>
- [ ] Retrieve encrypted nickname bytes

Mid priority
------------

- [ ] Gen 4/5 parse nickname

Mid-low priority
------------

- [ ] Debug invalid level issue (sometimes the level captured is greater than 100... non idea why)

Config
======

Low priority
------------

- [ ] Rework `js-to-sass-loader` to allow descendants of `%placeholders`.  
    <details><summary>Example</summary>

        "%imageWrapperStyle": {
            "background": "transparent",
            "img": {
                // some image styles
            },

            "&.debug": {
                "background": "red"
            },

            ".someClass": {
                // styles for .someClass descendants
            }
        }
</details>

Documentation
=============

High-ish priority
-----------------

- [ ] Config documentation

Mid prority
-----------

- [ ] README.md documentation

Automated Testing
=================

BAHAHAHAHAHAHA

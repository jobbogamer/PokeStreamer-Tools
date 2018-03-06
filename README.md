# PokeStreamer-Tools

A set of scripts and tools for Pokemon streamers

**README is a work in progress.  Most of the settings information can be found in `node/config.json`.**

**This is a modified version of [EverOddish's PokeStreamer-Tools](https://github.com/EverOddish/PokeStreamer-Tools).**
An issue with the original script is that every time a pokemon changes slots, it rewrites data to the hard drive several times.  This is a synchronous operation that causes the game (in particular, the audio) to lag significantly.

This code uses a [Node.JS](http://nodejs.org) webserver to host the images.  The Lua script, in turn, POSTs its updates to the server, and the server sends the updates to the webpage at `http://localhost:8081/`.  (Optionally, for more flexibility, you can disable all-on-one mode in the `node/config.json` file, and access six separate pages at `http://localhost:8081/?slot=slotNum` where `slotNum` is a number between 1 and 6.)

**This project is still a work in progress.  Currently this only works with the `auto_layout_gen3.lua` script.  Gen 4+ support is forthcoming.**

### Server Requirements

The following are required *in addition* to the [requirements](#requirements) listed below.

*   [Git for Windows](https://git-scm.com/download/win)
*   [Node.js](http://nodejs.org) - version 8.9.4 or newer
*   [Webpack](http://webpack.js.org) 4.1 or newer (this will be installed automatically later, but if you have an older version already installed, you may need to update)

### Server Setup

#### Download the GitHub repository

1.  Open command prompt by pressing <kbd>Windows</kbd> + <kbd>r</kbd> and running `cmd`.
2.  Navigate to the folder (using `cd`) you will want to install the server to.  (This is the *parent* directory; running the next command will create a folder named `PokemonStreamer-Tools` automatically.)
3.  Run `git clone https://github.com/dfoverdx/PokeStreamer-Tools.git`

#### Download Pokemon Images

I *highly* recommend you use the zip located [here](http://pkmn.net/?action=content&page=viewpage&id=8644) as it includes all the required images named the way my script expects them to be named (i.e. numbered by PokeDex number).

Download and extract this to your newly cloned directory's `/pokemon-images/` folder.  This is an optional location that you can change later in the config if you wish.  The edited versions of the lua scripts (currently just gen3) no longer require the images to be placed alongside them.  This directory may be anywhere you want.

**Note**: All images in the specified image directories are loaded into memory by the server.  This isn't a problem for the images in the suggested ZIP (~5MB depending on which generation), but if you use larger ones, you may run into some memory difficulties.

#### Configure settings

1.  Navigate to `/node/`.
2.  Open `/node/config.json` in your favorite text editor.  (If you don't have one, I suggest [VS Code](https://code.visualstudio.com).)
3.  Change settings to your desire.  The file is pretty well commented, so hopefully it won't give you too much trouble.  If it does, you can reach me on [Discord](https://discord.gg/FKDntWR).
4.  Save.  (Obviously.)

The default settings are what [Failstream](https://twitch.tv/failstream) uses, since I initially wrote this tool for him.  His upcoming stream needs are also what spur the [roadmap](#roadmap) below.

**Note**: Any time you update the `config.json` file, you will need to rebuild the project by running `build.cmd`.

#### Build

Run `build.cmd`.  This will generate a folder called `/node/public` with the files your streaming software will download.  Don't edit these, but if you want to tweak the settings and rebuild, this is where the output is for debugging purposes.

#### Start the server

You should start the server *before* running the Lua script within the emulator.  To do so, just run `startServer.cmd` within the `/node/` directory.

Now you can run your emulator and load the (modified) lua script as before.

## Roadmap

No guarantees I will ever get around to these, but here are the features I plan/hope to implement soon.

1.  Pokemon variation support (shiny, gender)
2.  Gen4-5 support
    *   Significant refactoring of Lua code
3.  Additional Nuzlocke features
    *   Fun-to-have animations and such
4.  SoulLink functionality
    *   Communication via IRC (e.g. Twitch Chat)
    *   Automatic soul-linked deaths
    *   Shared experience between soul-linked pokemon
5.  Stream chat interactivity (*wayyy* down the line)
    *   Use bits or stream currency to purchase in game effects
        *   Heal the current pokemon
        *   Heal the whole team
        *   Restore PP to the current pokemon
        *   Add item to inventory
        *   etc
    *   Vote to select next Pokemon encounter
        *   May not be possible, or way too complicated for me to figure out, but it would be fun

# EverOddish PokeStreamer-Tools README #

Most of this is still relevant.  Some is not.  I'm too lazy to update it.  Any contradictions in the above section 
supercede anything in this section.

## Automatic Layout Updating

If you're streaming a Pokemon game and like to display your current party on your layout, it can be tedious to modify which image files are displayed, while you are live. I've modified several existing tools to detect when in-game party slots change, which can then copy sprite image files on your computer automatically. Your streaming software can be configured to watch these files for modification, and update the layout accordingly. There is now also a "Soul Link" version that will update paired sprites at the same time.

### Requirements

 * Windows operating system
 * An emulator with Lua scripting support
     * VBA-RR (for Gen 3 games)

### VBA-RR Setup

 1. Download the latest release of VBA-RR: https://github.com/TASVideos/vba-rerecording/releases
 2. Edit the first line of `auto_layout_gen3.lua` file from this repository with your favourite text editor (you can right-click the file and Open With > Notepad): Set `game=1` to 1 for Ruby/Sapphire, 2 for Emerald, 3 for FireRed/LeafGreen
 3. Copy `auto_layout_gen3.lua` to the same directory that contains your sprite image files.
      * The script expects sprite files to be named as follows: `<pokemon_name>.png` (for example, `pikachu.png`)
      * The script expects party slot image files (that are monitored by OBS) to be named as follows: `p<slot_number>.png` (for example, `p1.png`)
      * The script expects a Pokeball image to be named `000.png`
 4. Copy `auto_layout_gen3_tables.lua` to the same directory
 5. Open VBA-RR and your Pokemon ROM, and load your save file
 6. In VBA-RR, open Tools > Lua Scripting > New Lua Script Window...
 7. Click Browse... and locate `auto_layout_gen3.lua` on your computer, open it, and click Run
 8. You should now be able to switch party slots, deposit/withdraw Pokemon from the PC, and catch Pokemon to see your party images update automatically!
 9. The Lua script output window should display all slot changes in text form. As a bonus, you can press "Q" to see Pokemon EV/IV values in your party

### Desmume Setup

 1. Download the latest release of Desmume: http://desmume.org/download/
 2. Make note of whether you downloaded 32-bit (x86) or 64-bit (x86-64) Desmume
 3. Download the Lua DLL that matches your Desmume: https://sourceforge.net/projects/luabinaries/files/5.1.5/Windows%20Libraries/Dynamic/
      * `lua-5.1.5_Win32_dll14_lib.zip` for x86 Desmume
      * `lua-5.1.5_Win64_dll14_lib.zip` for x86-64 Desmume
 4. Extract `lua5.1.dll` from the .zip file to the same folder where your `DeSmuME_0.9.11_x86.exe` or `DeSmuME_0.9.11_x64.exe` is
 5. Rename `lua5.1.dll` to `lua51.dll`
 6. Copy the correct script to the same directory that contains your sprite image files
      * `auto_layout_gen4_gen5_tables.lua` for regular automatic layout update
      * `auto_layout_gen4_gen5_tables_soul_link.lua` for Soul Link automatic layout update (paired sprites)
      * `auto_layout_gen4_gen5_tables_drfuji.lua` for sending data to the server for the Dr. Fuji Twitch Extension
      * The script expects sprite files to be named as follows: `<pokemon_name>.png` (for example, `pikachu.png`)
      * The script expects party slot image files (that are monitored by OBS) to be named as follows: `p<slot_number>.png` (for example, `p1.png`)
      * The script expects a Pokeball image to be named `000.png`
      * The Soul Link version of the script expects `soul_links.txt` containing which Pokemon are linked (see example file)
 7. Edit the first line of the chosen `.lua` file from this repository with your favourite text editor (you can right-click the file and Open With > Notepad) and set `game` to the appropriate value, as described in the file
      * If using the Dr. Fuji script, also set `username` to your Twitch username
 8. Open Desmume and your Pokemon ROM, and load your save file
 9. In Desmume, open Tools > Lua Scripting > New Lua Script Window...
 10. Click Browse... and locate `auto_layout_gen4_gen5.lua` (or other chosen version of the script) on your computer, open it, and click Run
 11. You should now be able to switch party slots, deposit/withdraw Pokemon from the PC, and catch Pokemon to see your party images update automatically!
 12. The Lua script output window should display all slot changes in text form.

### PKMN-NTR Setup

 1. Install custom firmware (CFW) on your 3DS: https://3ds.guide/
      * This process can take up to 2 hours, so be sure you have spare time
 2. Install BootNTR Selector on your 3DS: https://gbatemp.net/threads/release-bootntr-selector.432911/
 3. Install and run PKMN-NTR: https://github.com/drgoku282/PKMN-NTR/wiki
 4. Enter the IP address of your 3DS and click Connect
 5. Click on Tools > Event Handler
 6. Edit the event actions with a command specific to the directories on your computer, such as:
      * `del C:\Users\username\sprites\p###SLOT###.png & copy /Y C:\Users\username\sprites\###NAME###.png C:\Users\username\sprites\p###SLOT###.png & copy /b C:\Users\username\sprites\p###SLOT###.png+,, C:\Users\username\sprites\p###SLOT###.png`
 7. Click Apply and close the window
 8. Click Start Polling to start monitoring party data
 9. You should now be able to switch party slots, deposit/withdraw Pokemon from the PC, and catch Pokemon to see your party images update automatically!

### FAQ

 * Where can I find Pokemon sprite files?
     * https://veekun.com/dex/downloads
     * http://pkmn.net/?action=content&page=viewpage&id=8644
     * https://www.pkparaiso.com/xy/sprites_pokemon.php
 * What about Gen 1 and Gen 2 games?
     * These games are not supported yet
 * What about Pokemon in the PC boxes?
     * These are not supported yet
 * Why am I seeing strange behaviour? (missing Pokemon, fast switching, not updating properly)
     * Reading game memory directly is not always perfect. Try switching party members around, to see if the issue is corrected
 * What if I'm on an operating system whose emulator does not support Lua scripting? (for example, Desmume on Linux)
     * I'm sorry, you'll have to ask the maintainers of that emulator!
 * Do these scripts work with ROM hacks, such as Drayano's Storm Silver, etc.?
     * Yes!
 * What if my question isn't answered here?
     * Tweet [@EverOddish](https://twitter.com/everoddish)

### Credits

 * A huge thank you to FractalFusion and MKDasher of Pokemon Speed Runs for their initial Lua script work! http://forums.pokemonspeedruns.com/viewtopic.php?t=314
 * A huge thank you to the 3DS modding community for their work on CFW, BootNTR, PKMN-NTR and others!
 * A huge thank you to PokemonChallenges for helping me test all this! (Check him out at http://twitch.tv/PokemonChallenges)

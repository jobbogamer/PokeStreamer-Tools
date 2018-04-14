# PokeStreamer-Tools

A set of scripts and tools for Pokémon streamers

**README is a work in progress.  Most of the settings information can be found in `node/config.json`.**  Any comments in the config files that contradict the readme are more accurate than the readme.

<div style="color: #0c5460; background-color: #d1ecf1; border-color: #bee5eb; position: relative; padding: .75rem .75rem 0; 1.25rem; margin: 1rem 0; border: 1px solid; border-radius: .25rem;">

**Note**: You will have a ***much*** easier time if you download the repository via [Git](https://git-scm.com/download/win) than if you simply download and extract a zip.

</div>

**This is a modified version of [EverOddish's PokeStreamer-Tools](https://github.com/EverOddish/PokeStreamer-Tools).**
An issue with the original script is that every time a pokémon changes slots, it rewrites data to the hard drive several times.  This is a synchronous operation that causes the game (in particular, the audio) to lag significantly.  This modified version remedies this lag as well as provides extensive tools for Nuzlocke and SoulLink runs.

This code uses a [Node.js](http://nodejs.org) webserver to host the images.  The Lua script, in turn, POSTs its updates to the server, and the server sends the updates to the webpage at http://stream.pokemon-soul.link:8081/.

For SoulLink runs, the server also provides an SoulLink Manager--at [http://stream.pokemon-soul.link:8081/soullink](http://stream.pokemon-soul.link:8081/soullink)--for setting links between your pokémon and your partner's.  If you both have Discord, the majority of that linking can be done automatically.

### Server Requirements

The following are required *in addition* to the [requirements](#requirements) listed for the original tool.

*   [Git for Windows](https://git-scm.com/download/win)
*   [Python **v2.7**](http://https://www.python.org/downloads/) used for building some dependencies ([download link](https://www.python.org/ftp/python/2.7.14/python-2.7.14.msi))
*   [Node.js](http://nodejs.org) - version 8.9.4 or newer
*   [Webpack](http://webpack.js.org) 4.1 or newer (this will be installed automatically later, but if you have an older version already installed, you may need to update)

Optional:

*   [LuaSocket 2.0.2 32-bit](http://files.luaforge.net/releases/luasocket/luasocket/luasocket-2.0.2) - The included LuaSocket binaries in `/lua/` are [64-bit versions](https://download.zerobrane.com/luasocket-win64.zip) (as they're harder to come by).  If you are using a 32-bit emulator, you will need to download the 32-bit version and replace the 64-bit versions.
*   [Discord](https://discordapp.com/) - Required for SoulLink automatic linking functionality
*   Merging tool - when updating to the latest version of the PokeStreamer Tool, incoming changes may conflict with changes you've made to your config.  A merge tool can be helpful in resolving those conflicts.
    *   [Meld](http://meldmerge.org/) - A simple, clean tool for comparing files/folders with decent merge capability
    *   [VS Code](https://code.visualstudio.com/) - Overkill if you are only using it for merging, but on top of making merging very easy, it's the best text editor I've found

### Server Setup

#### Download the GitHub repository

1.  Open command prompt by pressing <kbd>Windows</kbd> + <kbd>r</kbd> and running `cmd`.
2.  Navigate to the folder (using `cd`) you will want to install the server to.  (This is the *parent* directory; running the next command will create a folder named `PokemonStreamer-Tools` automatically.)
3.  Run `git clone https://github.com/dfoverdx/PokeStreamer-Tools.git`

#### Download Pokémon Images

I *highly* recommend you use the zip located [here](http://pkmn.net/?action=content&page=viewpage&id=8644) as it includes all the required images named the way my script expects them to be named (i.e. numbered by PokeDex number).

Download and extract this to your newly cloned directory's `/pokemon-images/` folder.  If you're using the zip above, you'll need to move all the sub directories from `/pokemon-images/PKMN.NET Sprite Resource 4/Pokémon/` to `/pokemon-images` (such that the `BW` folder is at `/pokemon-images/BW`), or if you're a masochist, you can change the values in config.  The edited versions of the lua scripts no longer require the images to be placed alongside them.  The `/pokemon-images/` directory may be anywhere you want as long as you update the config.

Navigate to `/node` and run `setupPokemonImages.cmd`.  This script copies over the Arceus forms (haha, good luck getting him without cheating), and renames some misnamed Giritina images.  You should only have to do this once unless you reset/overwrite your images folder.

**Note**: All images in the specified image directories (`config.advanced.json` has a list of which directories these are) are loaded into memory by the server.  This isn't a problem for the images in the suggested ZIP (~5MB depending on which generation), but if you use larger ones, you may run into some memory difficulties.

#### Install requirements

1.  Navigate to `/node/`.
2.  Run `npm i`.  (This downloads and installs dependencies.)

##### Upgrading to the latest version

In the future, if you wish to upgrade from an older version of the tools, from the `/node` directory, run
```
git stash --include-untracked
git pull
npm i
git stash pop
```

**Note**: If the `git stash pop` command mentions something about conflicts, you will need to open each file that has conflicts (almost certainly the only file will be `config.json`) and resolve each section that conflicts so that the file is valid JSON again.  (See [this guide](https://help.github.com/articles/resolving-a-merge-conflict-using-the-command-line/#competing-line-change-merge-conflicts) for instructions.  You do not need to perform steps 7 and 8 unless you know what you're doing.)

Then configure and build as you would when first installing.

#### Configure settings

1.  Navigate to `/node/`.
    At this point you have two options (I recommend the second one if you have at least a rudamentary understanding of [JSON](https://www.w3schools.com/js/js_json_syntax.asp)): 
    -   Edit `/node/config.json` directly
    -   Create a custom config file in `/node/`, e.g. `/node/config.custom.json` and use that for editing.  
        In this case, you'll want to open up `/node/config.json` in a second window in order to read the comments when setting your own values in your custom config file.  See [Using custom config files](#using-custom-config=files) for more information.
2.  Open your chosen config file in your favorite text editor.  (If you don't have one, I suggest [VS Code](https://code.visualstudio.com).)
3.  Change settings to your desire.  The file is pretty well commented, so hopefully it won't give you too much trouble.  If it does, you can reach me on [Discord](https://discord.gg/FKDntWR).
4.  Save.  (Obviously.)

The default settings are what [Failstream](https://twitch.tv/failstream) used in his first gen 3 Pokémon Randomizer run, since I initially wrote this tool for him.  The config files `config.fail.json` and `config.iipk.json` are the values they used in their gen-4 SoulLink run, and may be useful as references.

For more information on advanced usage of the `style` configuration, see the [Styling](#styling) section.

To set up SoulLink, follow the instructions in the [SoulLink](#soullink) section.

##### Using custom config files 
If you want to have multiple setups (for example, one set up for solo-play and one for SoulLink), you can overwrite settings by creating additional `config.*.json` files, and specifying them in `config.json`.
```json
{
    "configOverride": [ 
        "./config.custom.json"
    ]
}
```

Files at the top of the list have higher priority than ones after them.

##### XSplit users

There seems to be a bug in XSplit where it does not send the proper headers when accessing the server.  If running in XSplit doesn't seem to be working/updating when pokémon change, add this setting to your config:
```json
{
    "server": {
        "useLessSecureAPI": true
    }
}
```

Note, while yes, it is technically less secure, unless you're doing something super advanced and/or are not behind a firewall, no one from outside your local network will be able to access your server anyway.

#### Build

Run `build.cmd`.  This will generate a folder called `/node/public` with the files your streaming software will open.  Don't edit these, but if you want to tweak the settings and rebuild, this is where the output is for debugging purposes.

**Note**:  For debugging/setup, you can run `autobuild.cmd` (do **not** use this during streams--things can go... poorly).  *Most* changes to config will automatically be updated both in your output `/node/public/` directory, and live updating of `stream.pokemon-soul.link:8081` if you have it loaded (in your browser or in your streaming software).  Some changes won't automatically update such as enabling the Nuzlocke death sound, so if something doesn't seem to be updating, try resetting `autobuild.cmd`.

#### Start the server

You should start the server *before* running the Lua script within the emulator.  To do so, just run `startServer.cmd` within the `/node/` directory.

Now you can run your emulator and load the (modified) lua script as before.

## SoulLink
If you are doing a SoulLink run with a partner, you can display your partner's pokémon alongside their linked counterparts in your party.  To enable this, in one your config files, enable both Nuzlocke and SoulLink (SoulLink doesn't handle non-Nuzlocke runs).
```json
{
    "nuzlocke": {
        "enabled": true
    },
    "soulLink": {
        "enabled": true
    }
}
```

You must set a `linking` method in config ([covered a little later](#setting-the-linking-method)), and then once you've built and started the server, you can open the SoulLink Manager at http://stream.pokemon-soul.link:8081/soullink to manage links between pokémon.

**Currently SoulLink is only supported for HeartGold and SoulSilver.**
<details><summary>Adding support for other versions</summary>

>   Theoretically it should be pretty easy to enable other versions (especially the gen 4/5 games--I haven't touched gen 3 in a while) with about a half hour of data entry per game.  If you want to do this work, contact me on my [Discord server](http://discord.pokemon-soul.link), and I'll walk you through what needs to be added (primarily location names and static encounter data).  No promises, but if I have time, I may do it for you, myself.

</details>

### Enable SoulLink in lua script

Open `/lua/auto_layout_gen4_gen5.lua` and set `run_soul_link` to `true`.

### Setting the Linking method

Currently, there are two ways to handle linking: [`manual`](#manual-linking) and [`discord`](#discord-linking).  Manual linking is, as the name implies, done manually via the SoulLink Manager (http://stream.pokemon-soul.link:8081/soullink).

Using the discord method, you and your partner can each set up a Discord bot, and those bots will send data back and forth to handle (mostly) automatic linking, updating of species (such as when the link evolves), and automatic detection of when your partner's pokémon die.  Discord linking also grants additional information to be displayed in the Slot Display, such as the Pokémon's nickname and level.

**NOTE**: The way SoulLink data is stored, changing the linking method requires resetting your links, so you will need re-apply those links via the SoulLink Manager.

#### Manual Linking

Manual linking has you specify which species each of your pokémon is currently linked to.  Selecting a species and clicking the *Link* button, will automatically update the pokémon displayed alongside its counterpart in the slot display page (the page your streaming software is using).  When manually linking, you must make the changes each time your partner's pokémon change (e.g. when they evolve, when they die, etc).

The only information displayed for the SoulLinked pokémon is its image (including whether it is shiny via checking if its counterpart is shiny) and its species name--that is, no nickname, no level, no alternate form, and no gender information is available.

To set up manual linking, in your config, set
```json
{
    "soulLink": {
        "enabled": true,
        "linking": {
            "method": "manual"
        }
    }
}
```

If `method` is set to `manual`, the `discord` section is ignored--no need to delete it.

#### Discord Linking

You can use [Discord](https://discordapp.com/) to transfer SoulLink data between you and your partner.  For the most part, the server can then handle linking pokémon automatically by looking at whether the pokémon is a known static encounter and the location in which it was caught.  However, there are a couple exceptions, so you will still need to have http://stream.pokemon-soul.link:8081/soullink open for linking/unlinking when an automatic link is not possible or incorrect.

<details><summary>Cases that automatic linking won't work</summary>

1.  **SoulLink to the Void**: There's no way to detect whether the pokémon your partner could have caught in an area was not caught.  Assuming you caught yours, you'll then need to mark it as *linked to the void*.
2.  **Static egg encounters**: The script may have troubles detecting if a gifted egg (such as the Mysterious Egg in HeartGold/SoulSilver) is a static encounter, especially if you are running a randomized ROM.
3.  **Multiple static encounters in one area**: They're uncommon but some areas do have more than one static encounter.  For example, HeartGold/SoulSilver has 8 Voltorb and 3 Electrode in Team Rocket HQ.
4.  **Static encounters that aren't detected as such**: Detecting a static encounter in the first place can be hit-and-miss.  As there are so many static encounters (and not enough time on my hands), I haven't been able to test that 
5.  **Shiny pokémon**: When the server resets, it loses data about your pokémon.  It only keeps track of the pokémon's IDs and relies on the Lua script to fill in the details.  Since shiny pokémon are linked in the order in which they're caught, there's no way to know which shiny pokémon should be linked with which of your partner's.  This, of course, assumes that you each will catch a shiny pokémon in the first place.  HAHAHAHAHAHA.

</details>

To set up Discord linking, in your config, set
```json
{
    "soulLink": {
        "enabled": true,
        "linking": {
            "method": "discord",
            "discord": {
                // see below
                "botToken": "your-bots-user-token",
                "channel": "your-discord-server#your-private-discord-channel",
                "partnerBotTag": "bots-username#code"
            }
        }
    }
}
```

##### Setting the `botToken` and `partnerBotTag`

If you do not already have a Discord bot, set one up.  Setting up a bot is free and takes about one minute.

<details><summary><span style="font-size: .8rem; font-weight: 600">Why is a bot required?</span></summary>

>   The reason a bot is required rather than just using your Discord user is due to Discord's usage policy.  Bots are allowed to send messages at a higher volume than regular users, and are expected to use the service atypically.  Discord specifically states that if they [catch you using a program that runs on your user account](https://discordapp.com/developers/docs/topics/oauth2#bot-vs-user-accounts), they will:
>   
>   1.  Put a small-ish bounty on your head
>   2.  Name a disease after you
>   3.  Tell your dog he's a bad boy
>   4.  Terminate your Discord account
>   5.  Nominate your mother for a Tony Award and then vote against her
>
>   *At least* one of those is true.
</details>
<p></p>

1.  Go to [https://discordapp.com/developers/applications/me](https://discordapp.com/developers/applications/me) and log in with your Discord credentials
2.  Click *New App*
3.  Set your app's name to whatever name you want your bot to have (e.g. `mydiscorduser-pokemon-soullink-bot`)
4.  Click *Create App*
5.  Scroll down to the **Bot** section, and click *Create a Bot User*
6.  In the **Bot** section, you'll see *Username* and *Token: click to reveal*
    -   Copy the bot's username (including the `#xxxx`) and give it to your partner so that they can add it to their `partnerBotTag` in the config
    -   Click the *click to reveal* link, and copy this value, and paste it in the `botToken` setting in your config file
    -   Check the *Public Bot* checkbox
7.  Scroll back up to the **App details** section, and copy the *Client ID* number.  You or your partner will use this ID to [add your bots to the private Discord channel](#add-your-and-your-partners-the-bots-to-the-server).

<div style="color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; position: relative; padding: 0 1.25rem; margin-top: 1rem; margin-bottom: 1rem; border: 1px solid; border-radius: .25rem;">

#### Important
Do **not** share your bot's token with *anyone*, including the person you are SoulLinking with!  This token grants anyone who has it the ability to act as your bot.  It's the equivalent of sharing your password.  Sharing it is a ***major*** security risk!
</div>

#### Setting the `channel`

After the channel has been set up (see below), set `channel` to `server-name#channel-name`.  Example:
```json
{
    "soulLink": {
        "enabled": true,
        "linking": {
            "discord": {
                "botToken": "your-bots-token-here",
                "partnerBotTag": "your-partners-bots-username#xxxx",
                "channel": "your-or-your-partners-server#soullink-private-channel",
            }
        }
    }
}
```

### Setting up the Discord channel

You only need one Discord channel between you and your partner.  That is, if they have a channel set up, you do not need to set one up as well.  In this case, they must add your bot to their server and give it the proper permissions in that channel.

If you are not the one creating the channel, all you will need to supply your partner with is your bot's Client ID.  <span style="color:red">This is _**not**_ your bot's token!</span>  (See step 7 of [Setting the `botToken` and `partnerBotTag`](#setting-the-bottoken-and-partnerbottag).)

#### Creating the channel

If you do not have a Discord server, create one.  (On the left side of the Discord app, click the (+) icon at the bottom of your channel list, click `Create`, and give it a name.)

Create a new Text Channel that you will use *only for communication between you and your partner*--that is, do not use the same text channel you use for soul linking with another person.  

<div style="color: #0c5460; background-color: #d1ecf1; border-color: #bee5eb; position: relative; padding: 0 1.25rem; margin-top: 1rem; margin-bottom: 1rem; border: 1px solid; border-radius: .25rem; padding-top: .75rem">

If you already have defined server roles, when you create the channel, there is a toggle to mark it as a private channel.  If you check this, you can skip the next step.

</div>

##### Make the channel private

1.  Open up the channel's settings by clicking the Edit Channel ⚙ icon next to its name
2.  Click the Permissions tab
3.  Click `@everyone` in the *Roles/Members* section
4.  Click the <kbd style="font-size: 1.2rem">&times;</kbd> button on *all* permissions
5.  Save the changes (for some reason they're not saved automatically)
6.  Press <kbd>esc</kbd> or click the &times; icon in the top right corner

##### Add your and your partner's the bots to the server

1.  Find/copy your bot's Client ID from your [bot/app's page](https://discordapp.com/developers/applications/me) (see step 7 of [Setting the `botToken` and `partnerBotTag`](#setting-the-bottoken-and-partnerbottag))
2.  Paste it at the end of the link below.  

    https://discordapp.com/oauth2/authorize?scope=bot&permissions=35840&client_id=

3.  Navigate to this URL in your browser, and authorize the bot to access your server.

Repeat the process using your partner's bot's Client ID.  Make sure the bots that will be accessing the channel appear on the right-hand side as members of the server before continuing.

If you cannot add your partner's bot, most likely they did not check the *Public Bot* checkbox on their Application Page.

For troubleshooting, take a look at [Adding Your Bot To Your Server](https://github.com/jagrosh/MusicBot/wiki/Adding-Your-Bot-To-Your-Server) or hit me on [Discord](http://discord.pokemon-soul.link).

You do not need to give your partner's Discord user access to see this channel.  Only their bot needs access.  That said, if you don't give their user access, they're liable to kick you in the shin, and I'd be inclined to look the other way.

##### Set permissions in the channel for your bots

Click the Edit Channel ️⚙ icon for your channel, and click *Permissions*.

For your each bot:

1.  Click the + button next to Roles/Members
2.  Type in/select its name
3.  Explicitly check the following permissions (they *may* already be set)
    *   Read Messages
    *   Send Messages
    *   Attach Files
4.  Save the changes

Now you're done!  SoulLink is set up.

## Styling

The `config.json` file is pretty well-commented on what each style element is used for.  This section of the README explains some of the more advanced things you can do with it by defining your own variables.

If you want to use reference a value defined in the style section in another value, add a $ in front of it.  Any values not prefixed with a `$`, `%`, `@`, or `.` are added as SASS variables and may be used in any later-defined values.  That is, you can define whatever new variables you'd like, though the ones already listed are required.

Example:
```json
{
    "style": {
        "foo": "red",

        "%body": {
            "background": "$foo",
        }
    }
}
```

A more complicated example:
```json
{
    "style": {
        "testing": true,

        "%imageWrapper": {
            "background": "if($testing, red, transparent)"
        },

        "%soulLinkWrapper": {
            "background": "if($testing, red, transparent)"
        }
    }
}
```

You can even define what are known as placeholders (sets of styles, denoted by prefixing the variable with a `%` 
character) and use the `@extend` property within another placeholder to apply the those styles.

Example:
```json
{
    "style": {
        "testing": true,

        "%commonImageWrapperStyle": {
            // if testing, set the background to red, otherwise make a semi-transparent, darkened background
            "background": "if($testing, red, rgba(0, 0, 0, .2))", 
            
            // ... some other shared custom styles ...
        },

        "%imageWrapper": {
            "@extend": "%commonImageWrapperStyle",

            // custom styles for main image wrapper
        },

        "%soulLinkWrapper": {
            "@extend": "%commonImageWrapperStyle",

            // custom styles for SoulLinked image wrapper
        }
    }
}
```

See https://sass-lang.com/ for more information on SASS variables and what you can do with them.

## Roadmap

No guarantees I will ever get around to these, but here are the features I plan/hope to implement soon.

- [x] Pokémon variation support (shiny, gender)
- [x] Gen4-5 support
    - [x] Significant refactoring of Lua code
- [ ] Additional Nuzlocke features
    - [ ] Fun-to-have animations and such
- [x] SoulLink functionality
    - [x] Communication via Discord
    - Low priority items
      - [ ] Automatic soul-linked deaths
      - [ ] Shared experience between soul-linked pokémon
- [ ] Stream chat interactivity (*wayyy* down the line--aka realistically, never)
    *   Use bits or stream currency to purchase in game effects (*Hunger Games Sponsor mode*)
        *   Heal the current pokémon
        *   Heal the whole team
        *   Restore PP to the current pokémon
        *   Add item to inventory
        *   etc
    *   Vote to select next Pokémon encounter
        *   May not be possible, or way too complicated for me to figure out, but it would be fun

(Personal note just so I remember where it is.  Look into https://github.com/wojons/lua-resty-sse for communicating from Node server to Lua.)

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

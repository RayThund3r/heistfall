HEISTFALL - local setup
1. Easiest: just double-click index.html (needs internet; it loads three.js from a CDN).
2. Fully offline: run  python get_libs.py  once in this folder. It downloads 8 files into libs/ (three.js r128 + bloom post-processing). Then index.html works with no internet.
   Manual download URLs are listed inside get_libs.py.
3. If the page shows an error message, send it to me.
Best in Chrome/Edge/Brave. Click the game once to capture the mouse (Esc to release).
Deploy: upload this whole folder (index.html + libs/) to any static host (Netlify, Vercel, GitHub Pages, itch.io).
Controls: WASD/Left stick move, mouse/Right stick look, Space/A jump, Shift/B dash, E/X grab or revive, F/click/RT pulse, Q/Y barricade, V emote. District: E interact, M map, Esc/Start pause. Commander mode: 1/2/3.

OPEN WORLD (The District): E interact/enter/exit vehicles, LMB punch, RMB or G shoot, R reload, C dive (hold), P phone (missions, fast travel, time/weather), M big map, H hold for controls.

WORLD 2 additions: Z crouch, N sit, B wave, T go limp (ragdoll), hold Shift sprint, 1-6 weapons (LMB fire, R reload), C dive / descend, Space up in helicopter, parachute: hold Space while falling. Trains: E near a carriage to ride. Weather and time are changeable from the phone (P).

UPDATE 3: Esc / pointer-lock loss opens the PAUSE MENU (controls list, key remapping, settings, save/load, main menu, quit). Progress autosaves in the district every minute (browser localStorage). First person: U. Phone: P (jobs, factions, fast travel, weather). Hold H for the in-game controls panel.

UPDATE 4: map is now ~1400x1400 with 8 regions (Downtown, Shibuya, Old Town, Vegas Strip, Alpine Village, Airport, Container Port, island resorts). Fly: planes at the Airport (W throttle, Space climb, C descend, takeoff above ~110 km/h), helicopters (altitude to 450 m), jetpack (buy at the Airport shop, hold jump in the air). New weapons 1-0 (katana, grenade, flamethrower, RPG). Survival: X eat/drink, F medkit. Arena modes have Wardens, security cameras and hackable terminals. If it runs slowly use Pause > Settings > Graphics: Low/Medium.

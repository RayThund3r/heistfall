HEISTFALL - local setup
FILES: index.html (page + loader), style.css (all styling), game.js (all game code), libs/ (three.js + bloom, optional), get_libs.py.
1. Easiest: double-click index.html (needs internet once; it loads three.js from a CDN).
2. Fully offline: run  python get_libs.py  once in this folder. It downloads 8 files into libs/. Then index.html works with no internet.
3. If the page shows an error, it now names the file and line (game.js:LINE). Send me that.
Deploy: upload this whole folder (index.html, style.css, game.js, libs/) to any static host.
Best in Chrome/Edge/Brave. Click the game once to capture the mouse (Esc to release).

Controls: WASD move, mouse look, Space jump, Shift sprint/dash, E interact, F/click pulse, Q barricade, V emote. District: E interact/enter/exit vehicles, LMB punch, RMB or G shoot, R reload, C dive/descend, P phone, M map, H hold for controls. Esc pauses (Key Bindings: every action has a second "+ alt" key).
Aircraft: planes and balloons at the Airport. Space climb / burner, C descend / vent, W/S throttle, E step out (the aircraft keeps flying; E anywhere teleports you back in).

WARDEN MODE (main menu): you are the vault AI. Stop five waves of thieves (and their leader) from stealing the 6 vault cores; lose 4 and the vault is robbed.
 Mouse or WASD moves the cursor. 1 Turret, 2 Shock Mine, 3 Drone, 4 Laser Gate (R rotates) cost credits; 5 Lockdown and 6 Surge cost energy.
 Click / Space / E to place or fire. X sells the structure under the cursor. G starts the next wave early. Between waves pick 1 of 3 upgrades (click or 1-3).
 Thief types: Runner (fast), Brute (tanky, smashes your gear), Hacker (disables turrets), Breacher (blows up defenses), Boss (final wave).
Performance: far cars and people automatically switch to simple single-mesh versions and tiny details are hidden at a distance; building interiors are hidden when you are far away. If it is still slow use Pause > Settings > Graphics.

NEW CONTROLS: RMB aim (zoom). Z block (tap just before a hit = parry). X shove. M atlas: click = waypoint, right-click = clear.
Train: stops at NORTH / EAST / WEST stations, press E on the platform. Ferris wheel (Old Town): E at the base.

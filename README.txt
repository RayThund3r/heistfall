HEISTFALL - works on desktop AND phones/tablets from the same files.

DEPLOY (GitHub Pages): upload ALL files in this folder (index.html, game.js, perf.js, mobile.js, style.css, mobile.css,
phone.js, phone.css, manifest.webmanifest, icon-*.png). Optionally run  python get_libs.py  and also upload the libs/ folder so the game does
not depend on the CDN; without it the game loads three.js from the CDN.

PLAY ON PHONE: open the page, tap to start, rotate to landscape. iPhone: Share -> Add to Home Screen for fullscreen.
DESKTOP: unchanged (WASD + mouse). A touch-screen laptop switches automatically.

URL options: ?debug (FPS + draw-call readout)  ?nobatch (turn off static batching)  ?touch (force touch controls)

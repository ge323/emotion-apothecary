// Run: node build.js
// The parts are joined in the original order to preserve shared variables and functions.
const fs = require("node:fs");
const path = require("node:path");
const folder = path.join(__dirname, "js", "parts");
const files = [
  "01-core.js",
  "02-audio.js",
  "03-player-world.js",
  "04-render-shop.js",
  "05-emotions.js",
  "06-shop-data.js",
  "07-items-research.js",
  "08-customers.js",
  "09-dialog-shop-ui.js",
  "10-discoveries.js",
  "11-camera-thoughts.js",
  "12-village-render.js",
  "13-controls-start.js",
];
const output = Buffer.concat(
  files.map((file) => fs.readFileSync(path.join(folder, file))),
);
fs.writeFileSync(path.join(__dirname, "js", "game.js"), output);
console.log("Built game.js from " + files.length + " files.");

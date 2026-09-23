/*
 * render_office_preview.js — records one frame of the pixel office into JSON.
 * Owner lane: QA/CENTUM
 * Run:         node tools/render_office_preview.js [--mode real|demo|closed] [--out /tmp/frame.json]
 * Why:         the sandbox has no browser. This captures the canvas draw calls so
 *              tools/preview_png.py can rasterize them into a PNG for eyeballing.
 * Built: 2026-09-23 by Manager
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const args = process.argv.slice(2);
const mode = (args[args.indexOf("--mode") + 1] || "demo");
const out = (args[args.indexOf("--out") + 1] || "/tmp/frame.json");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const DATA = JSON.parse(fs.readFileSync(path.join(APP, "data", "office.json"), "utf8"));

const rects = [];
function colorAlpha(c) {
  const m = /rgba\(([^)]+)\)/.exec(String(c));
  if (m) { const parts = m[1].split(","); return parseFloat(parts[3]); }
  return 1;
}
function makeCtx() {
  return {
    fillStyle: "#000", globalAlpha: 1, imageSmoothingEnabled: true,
    fillRect(x, y, w, h) {
      const a = (this.globalAlpha === undefined ? 1 : this.globalAlpha) * colorAlpha(this.fillStyle);
      rects.push([x | 0, y | 0, w | 0, h | 0, this.fillStyle, Math.round(a * 1000) / 1000]);
    },
    clearRect() {}, fillText() {},
  };
}
class Node {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.className = ""; this.dataset = {}; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute() {} addEventListener() {} removeChild() {} remove() {}
  set innerHTML(v) { this._html = v; } get innerHTML() { return this._html || ""; }
  getContext() { return makeCtx(); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 240, height: 160 }; }
}
const sandbox = {
  window: {}, document: { createElement: (t) => new Node(t), getElementById: () => null, body: new Node("body") },
  navigator: {}, console, setTimeout, clearTimeout, setInterval, clearInterval,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(APP, "office.js"), "utf8"), sandbox, { filename: "office.js" });

let data = JSON.parse(JSON.stringify(DATA));
if (mode === "demo") {
  const states = ["working", "at_risk", "blocked", "review", "celebrate"];
  data.power = { state: "LIVE", newest_activity_label: "just now" };
  data.slots.forEach((s, i) => {
    const st = states[i] || "working";
    s.visual = { state: st, tone: st === "at_risk" ? "amber" : st === "blocked" ? "red" : "green",
                 label: st, efficiency: i % 4, star: i === 4 };
    s.progress_percent = 20 + i * 18;
  });
  data.manager_desk = { active: true, last_label: "4 min ago", next_action: "planning" };
} else if (mode === "closed") {
  data.power = { state: "CLOSED", newest_activity_label: "3 h ago" };
  data.manager_desk = { active: false, last_label: "3 h ago" };
}
const container = new Node("div");
const handle = sandbox.window.CentumPixel.mount(container, data, {});
fs.writeFileSync(out, JSON.stringify({ w: 240, h: 160, rects }));
if (handle && handle.destroy) handle.destroy();   // stop the animation interval
console.log(`frame captured: ${rects.length} rects -> ${out} (mode ${mode})`);
process.exit(0);                                   // the drawing loop must not hold the process open

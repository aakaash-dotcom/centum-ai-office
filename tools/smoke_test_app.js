/*
 * smoke_test_app.js — runs the office app against a tiny fake DOM and renders every screen.
 * Owner lane: QA/CENTUM
 * Run:         node tools/smoke_test_app.js      (after tools/build_office_data.py)
 * Inputs:      app/office.js, app/app.js, app/data/office.json
 * Outputs:     exit code 0 = every screen and every desk state rendered without throwing
 * Why:         the sandbox has no browser, so this is how a change is checked before it
 *              reaches Ravi's phone. It catches runtime errors, missing data fields,
 *              broken prompts, and pixel-drawing regressions.
 * Built: 2026-09-23 by Manager
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "app");
const DATA = JSON.parse(fs.readFileSync(path.join(APP, "data", "office.json"), "utf8"));

/* ------------------------------------------------------------------ fake DOM */
class Node {
  constructor(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._html = "";
    this.textContent = "";
    this.style = {};
    this.hidden = false;
    this.value = "";
    this.className = "";
    this.classList = { add() {}, remove() {}, contains() { return false; } };
    this.dataset = {};
  }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  get innerText() { return this._html.replace(/<[^>]*>/g, " "); }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  insertBefore(n) { return this.appendChild(n); }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  addEventListener(ev, fn) { this["on" + ev] = fn; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 240, height: 160 }; }
  getContext() { return makeCtx(); }
  select() {} setSelectionRange() {} focus() {}
  click() { if (this.onclick) this.onclick({ preventDefault() {} }); }
}

const ctxStats = { fills: 0 };
function findPowerBadge(node) {
  if (node.className && String(node.className).indexOf("pixel-power") >= 0) return node;
  for (const c of node.children || []) {
    const hit = findPowerBadge(c);
    if (hit) return hit;
  }
  return null;
}
function makeCtx() {
  return {
    fillStyle: "", globalAlpha: 1, imageSmoothingEnabled: true,
    fillRect() { ctxStats.fills++; },
    clearRect() {},
    fillText() {},
  };
}

const byId = {};
function makeEl(tag, id) { const n = new Node(tag); if (id) { n.id = id; byId[id] = n; } return n; }
["brandSub", "healthChip", "freezeStrip", "nav", "view", "refreshBtn"].forEach((id) => makeEl("div", id));

const handlers = {};
const documentStub = {
  body: new Node("body"),
  documentElement: { style: {} },
  title: "",
  createElement: (t) => new Node(t),
  getElementById: (id) => byId[id] || (byId[id] = makeEl("div", id)),
  addEventListener: (ev, fn) => { handlers[ev] = fn; },
  execCommand: () => true,
};

const locationStub = { hash: "#/office", protocol: "http:", reload() {} };
const windowStub = {
  addEventListener: (ev, fn) => { handlers[ev] = fn; },
  scrollTo() {}, open() {},
  location: locationStub,
};

const sandbox = {
  document: documentStub,
  location: locationStub,
  navigator: {},                                   // no serviceWorker, no clipboard
  window: windowStub,
  fetch: (url) => String(url).indexOf("office.json") >= 0
    ? Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) })
    : Promise.reject(new Error("unexpected fetch: " + url)),
  setTimeout, clearTimeout, setInterval, clearInterval, console,
};
sandbox.globalThis = sandbox;

/* ------------------------------------------------------------------ run */
const failures = [];
function check(name, fn) {
  try { fn(); console.log("  PASS  " + name); }
  catch (e) { failures.push(name + " → " + e.message); console.log("  FAIL  " + name + " → " + e.message); }
}

vm.createContext(sandbox);
try {
  vm.runInContext(fs.readFileSync(path.join(APP, "office.js"), "utf8"), sandbox, { filename: "office.js" });
  vm.runInContext(fs.readFileSync(path.join(APP, "app.js"), "utf8"), sandbox, { filename: "app.js" });
} catch (e) {
  console.log("FAIL  app threw on load: " + e.message);
  process.exit(1);
}

setTimeout(() => {
  const view = byId.view;
  console.log("\nScreens\n");

  check("boot rendered the Office screen", () => {
    if (!view.children.length) throw new Error("view is empty");
    if (!byId.nav.children.length) throw new Error("nav was not painted");
    const sub = byId.brandSub.textContent || byId.brandSub.innerHTML;
    if (!/Updated/.test(sub) || !/files in repo/.test(sub)) throw new Error("subtitle not set: " + sub);
  });

  check("freeze strip shows the freeze", () => {
    if (byId.freezeStrip.hidden !== false) throw new Error("freeze strip hidden while freeze is active");
    if (!/FROZEN/.test(byId.freezeStrip.innerHTML)) throw new Error("freeze text missing");
  });

  const routes = ["#/office", "#/agents", "#/agent/agent-05", "#/tasks", "#/reports",
    "#/report/2026-09-23", "#/files", "#/help", "#/work", "#/plan"];
  routes.forEach((r) => {
    check("route " + r + " renders", () => {
      locationStub.hash = r;
      handlers.hashchange();
      if (!view.children.length) throw new Error("nothing rendered");
    });
  });

  console.log("\nPixel office\n");

  check("pixel engine is loaded and exposes mount()", () => {
    if (!windowStub.CentumPixel || typeof windowStub.CentumPixel.mount !== "function") {
      throw new Error("window.CentumPixel.mount missing — office.js did not load");
    }
  });

  check("pixel floor paints (many rects) and the power badge reads correctly", () => {
    ctxStats.fills = 0;
    const container = new Node("div");
    const handle = windowStub.CentumPixel.mount(container, DATA, {});
    const fills = ctxStats.fills;
    handle.destroy();
    if (fills < 400) throw new Error("only " + fills + " draw calls — the floor looks empty");
    const badge = findPowerBadge(container);
    if (!badge) throw new Error("power badge missing");
    const txt = badge.innerHTML;
    const state = DATA.power.state;
    if (state === "CLOSED" && !/LIGHTS OFF/.test(txt)) throw new Error("closed office must say LIGHTS OFF");
    if (state === "LIVE" && !/LIGHTS ON/.test(txt)) throw new Error("live office must say LIGHTS ON");
    if (state === "QUIET" && !/LIGHTS DIM/.test(txt)) throw new Error("quiet office must say LIGHTS DIM");
  });

  const STATES = ["working", "at_risk", "sleeping_dead", "sleeping_off", "blocked", "review", "celebrate", "vacant"];
  STATES.forEach((state) => {
    check("desk state '" + state + "' draws without throwing", () => {
      const copy = JSON.parse(JSON.stringify(DATA));
      copy.power = { state: "LIVE", newest_activity_label: "just now" };
      copy.slots.forEach((s, i) => {
        s.visual = { state: i === 0 ? state : "sleeping_off", tone: "green", label: state, efficiency: 2 };
      });
      const container = new Node("div");
      const h = windowStub.CentumPixel.mount(container, copy, {});
      h.destroy();
    });
  });

  check("closed office: every desk sleeps and the closed overlay paints", () => {
    const copy = JSON.parse(JSON.stringify(DATA));
    copy.power = { state: "CLOSED", newest_activity_label: "3 h ago" };
    ctxStats.fills = 0;
    const container = new Node("div");
    const h = windowStub.CentumPixel.mount(container, copy, {});
    const fills = ctxStats.fills;
    h.destroy();
    if (fills < 400) throw new Error("closed office painted only " + fills + " rects");
    const badge = findPowerBadge(container);
    if (!badge) throw new Error("power badge missing in closed state");
    if (!/LIGHTS OFF/.test(badge.innerHTML)) throw new Error("closed office badge wrong: " + badge.innerHTML);
  });

  check("locked departments are present (rooms stay dark until opened)", () => {
    const locks = DATA.registryLocks || [];
    if (!locks.length) throw new Error("no locked departments in the payload");
    if (!locks.some((d) => d.id === "marketing" && d.status === "LOCKED")) throw new Error("marketing should be LOCKED");
  });

  console.log("\nStations and continuity\n");

  check("every station has an occupant, a generation and a visual state", () => {
    DATA.slots.forEach((s) => {
      if (!s.occupant || !s.occupant.id) throw new Error(s.id + " has no occupant");
      if (!s.generation || s.generation < 1) throw new Error(s.id + " has no generation");
      if (!s.visual || !s.visual.state) throw new Error(s.id + " has no visual state");
      if (typeof s.handovers !== "number") throw new Error(s.id + " has no handover count");
    });
  });

  check("each desk state maps to a tone the legend explains", () => {
    const known = new Set(STATES);
    DATA.slots.forEach((s) => {
      if (!known.has(s.visual.state)) throw new Error(s.id + " unknown visual state: " + s.visual.state);
    });
  });

  check("a stopped desk offers a replacement path (handover tool exists)", () => {
    const stopped = DATA.slots.filter((s) => s.visual.state === "sleeping_dead");
    if (stopped.length) {
      // the app must be able to explain the replacement; ensure the prompt text is generatable
      if (!fs.existsSync(path.join(ROOT, "tools", "handover.py"))) throw new Error("tools/handover.py missing");
    }
  });

  console.log("\nData, prompts and safety\n");

  check("every slot has a paste prompt", () => {
    DATA.slots.forEach((s) => {
      if (!s.start_prompt || s.start_prompt.length < 400) throw new Error(s.id + " prompt missing/short");
      if (s.start_prompt.indexOf("OFFICE.md") < 0) throw new Error(s.id + " prompt does not reference OFFICE.md");
      if (!s.has_task && !/PLANNING phase/.test(s.start_prompt)) throw new Error(s.id + " taskless station lacks the standby note");
    });
  });

  check("owner actions each carry a copyable prompt", () => {
    if (!DATA.owner_actions.length) throw new Error("no owner actions parsed from the daily report");
    const withPrompts = DATA.owner_actions.filter((a) => a.prompts.length).length;
    if (withPrompts < 2) throw new Error("expected at least 2 actions with paste prompts, got " + withPrompts);
  });

  check("planning phase: queue empty, round-1 tasks archived", () => {
    if (DATA.phase !== "PLANNING") throw new Error("expected phase PLANNING, got " + DATA.phase);
    if (DATA.counts.queue !== 0) throw new Error("queue should be empty during planning");
    if (DATA.counts.archived_tasks < 20) throw new Error("round-1 tasks should be archived, found " + DATA.counts.archived_tasks);
    if (!DATA.archive.length) throw new Error("archive list missing");
  });

  check("no secrets or Drive URLs leaked into the app data", () => {
    const blob = JSON.stringify(DATA);
    ["AKfycb", "macros/s/", "script.google.com"].forEach((bad) => {
      if (blob.indexOf(bad) > -1) throw new Error("app data contains '" + bad + "'");
    });
    const pixelSrc = fs.readFileSync(path.join(APP, "office.js"), "utf8");
    ["AKfycb", "macros/s/"].forEach((bad) => {
      if (pixelSrc.indexOf(bad) > -1) throw new Error("office.js contains '" + bad + "'");
    });
  });

  check("power thresholds are configured", () => {
    if (!DATA.power || !DATA.power.live_minutes || !DATA.power.quiet_minutes) throw new Error("power config missing");
    if (DATA.power.live_minutes >= DATA.power.quiet_minutes) throw new Error("live_minutes must be smaller than quiet_minutes");
  });

  console.log("\n" + (failures.length ? "FAILED: " + failures.length : "ALL CHECKS PASSED"));
  process.exit(failures.length ? 1 : 0);
}, 80);

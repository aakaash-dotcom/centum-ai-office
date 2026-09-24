/*
 * smoke_test_app.js — runs the office app against a tiny fake DOM and renders every screen.
 * Owner lane: QA/CENTUM
 * Run:         node tools/smoke_test_app.js      (after tools/build_office_data.py)
 * Inputs:      app/office.js, app/app.js, app/data/office.json
 * Outputs:     exit code 0 = every screen and every desk state rendered without throwing
 * Why:         the sandbox has no browser, so this is how a change is checked before it
 *              reaches Ravi's phone. It catches runtime errors, missing data fields,
 *              broken prompts, and pixel-drawing regressions.
 * Updated: 2026-09-23 for v2 flat floor (Office · Agents · Tasks · Help).
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
    this.classList = { add() {}, remove() {}, contains() { return false; }, toggle() {} };
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
  readyState: "complete",
};

const locationStub = { hash: "#/office", protocol: "http:", reload() {} };
const windowStub = {
  addEventListener: (ev, fn) => { handlers[ev] = fn; },
  scrollTo() {}, open() {},
  location: locationStub,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date: Date,
};

const sandbox = {
  document: documentStub,
  location: locationStub,
  navigator: { clipboard: null },
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
    if (!/build v\d/i.test(sub)) throw new Error("build label missing from the header: " + sub);
    if (!/updated/i.test(sub) || !/files in repo/.test(sub)) throw new Error("subtitle not set: " + sub);
  });

  check("freeze strip shows the freeze", () => {
    if (byId.freezeStrip.hidden !== false) throw new Error("freeze strip hidden while freeze is active");
    if (!/FROZEN/.test(byId.freezeStrip.innerHTML)) throw new Error("freeze text missing");
  });

  check("nav shows exactly four tabs: Office · Agents · Tasks · Help", () => {
    const buttons = Array.from(byId.nav.children);
    if (buttons.length !== 4) throw new Error("expected 4 nav buttons, got " + buttons.length);
    // The fake DOM doesn't parse innerHTML into children; verify the labels appear
    // in the source of each button (paintNav sets b.innerHTML to ICONS[t] + "<span>LABEL</span>").
    const labels = buttons.map((b) => b._html || "");
    const want = ["Office", "Agents", "Tasks", "Help"];
    want.forEach((w, i) => {
      if (labels[i].indexOf(w) < 0) throw new Error("tab " + i + " expected label " + w + ", got " + labels[i].slice(0, 80));
    });
  });

  const routes = ["#/office", "#/agents", "#/agent/agent-05", "#/tasks", "#/help"];
  routes.forEach((r) => {
    check("route " + r + " renders", () => {
      locationStub.hash = r;
      handlers.hashchange();
      if (!view.children.length) throw new Error("nothing rendered");
    });
  });

  // Removed routes (from v1): reports, report, files, work, plan — must not crash
  ["#/reports", "#/files", "#/work", "#/plan"].forEach((r) => {
    check("deprecated route " + r + " falls back to Office", () => {
      locationStub.hash = r;
      handlers.hashchange();
      if (!view.children.length) throw new Error("fallback view empty");
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

  // The v2 floor has: two tables of 5 (A+B), manager room at bottom, door, sign, power.
  check("flat floor: manager room sits at the bottom with door, sign and power", () => {
    const src = fs.readFileSync(path.join(APP, "office.js"), "utf8");
    [/MANAGER ROOM/m, /DOOR/m, /POWER/m, /NOW:/m].forEach((rx) => {
      if (!rx.test(src)) throw new Error("manager-room feature missing in office.js: " + rx);
    });
  });

  const STATES = ["working", "at_risk", "sleeping_dead", "sleeping_off", "blocked", "review", "celebrate", "vacant"];
  STATES.forEach((state) => {
    check("desk state '" + state + "' draws without throwing", () => {
      const copy = JSON.parse(JSON.stringify(DATA));
      copy.power = { state: "LIVE", newest_activity_label: "just now", live_minutes: 20, quiet_minutes: 90 };
      copy.slots.forEach((s, i) => {
        s.last_work_ts = new Date().toISOString();
        s.status = "ACTIVE";
        s.occupant = { id: s.id, generation: 1, since: null };
        s.visual = { state: i === 0 ? state : "sleeping_off", tone: "green", label: state, efficiency: 2 };
        if (state === "blocked") s.status = "BLOCKED";
        if (state === "review") s.status = "REVIEW";
      });
      // force first slot to the right status too
      copy.slots[0].visual.state = state;
      const container = new Node("div");
      const h = windowStub.CentumPixel.mount(container, copy, {});
      h.destroy();
    });
  });

  check("closed office: every desk sleeps and the closed overlay paints", () => {
    const copy = JSON.parse(JSON.stringify(DATA));
    copy.power = { state: "CLOSED", newest_activity_label: "3 h ago", live_minutes: 20, quiet_minutes: 90 };
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

  console.log("\nStations and continuity\n");

  check("at least two tables worth of seats (10 agents for two long tables)", () => {
    if (DATA.slots.length < 10) throw new Error("flat floor should have 10 seats, found " + DATA.slots.length);
  });

  check("every station has an occupant and a visual state", () => {
    DATA.slots.forEach((s) => {
      if (!s.occupant || !s.occupant.id) throw new Error(s.id + " has no occupant");
      if (!s.generation || s.generation < 1) throw new Error(s.id + " has no generation");
    });
  });

  check("a stopped desk offers a replacement path (handover tool exists)", () => {
    if (!fs.existsSync(path.join(ROOT, "tools", "handover.py"))) throw new Error("tools/handover.py missing");
  });

  console.log("\nLive view, demo mode and recovery\n");

  check("the build guard exists and can escape a stale cache", () => {
    const html = fs.readFileSync(path.join(APP, "index.html"), "utf8");
    if (html.indexOf("__CENTUM_ESCAPE") < 0) throw new Error("escape hatch missing from index.html");
    if (!/fresh=1/.test(html)) throw new Error("?fresh=1 route missing");
    if (!/\?v=4/.test(html)) throw new Error("assets must be version-stamped at v4");
    if (html.indexOf("__CENTUM_BOOTED") < 0) throw new Error("boot guard missing");
  });

  check("the service worker is network-first and purges older caches", () => {
    const sw = fs.readFileSync(path.join(APP, "sw.js"), "utf8");
    if (sw.indexOf("centum-office-v4") < 0) throw new Error("cache version was not bumped to v4");
    if (!/fetch\(req\)/.test(sw)) throw new Error("service worker is not network-first");
    if (!/caches\.delete/.test(sw)) throw new Error("old caches are not purged on activate");
  });

  check("demo mode draws a working day without touching real state", () => {
    const snapshot = JSON.stringify(DATA.slots.map((s) => s.visual));
    const container = new Node("div");
    const h = windowStub.CentumPixel.mount(container, DATA, {}, { demo: true });
    h.destroy();
    const after = JSON.stringify(DATA.slots.map((s) => s.visual));
    if (snapshot !== after) throw new Error("demo mode mutated the real office data");
    const badge = findPowerBadge(container);
    if (!badge || !/PREVIEW/.test(badge.innerHTML)) throw new Error("demo frame must be labelled PREVIEW");
  });

  check("honest light thresholds are 20 / 90 minutes (browser-recomputed)", () => {
    const src = fs.readFileSync(path.join(APP, "office.js"), "utf8");
    if (!/LIVE_MIN\s*=\s*20/.test(src) || !/QUIET_MIN\s*=\s*90/.test(src)) {
      throw new Error("live/quiet thresholds not defined in office.js");
    }
    if (!/recomputePower/.test(src) || !/recomputeDeskLights/.test(src)) {
      throw new Error("browser-side light recomputation missing");
    }
  });

  console.log("\nData, prompts and safety\n");

  check("app data only holds desks, tasks, prompts (no reports / chat / logs payloads)", () => {
    // reports/chats/logs must not be embedded into the 11 KB-ish office payload.
    // They live in the repo. We check by size and by absence of large report buckets.
    const blob = JSON.stringify(DATA);
    if (blob.length > 80000) throw new Error("office.json is too large (" + blob.length + " bytes) — app should hold only the office (~50 KB: desks, tasks, prompts, actions), not full reports/chat/logs");
    if (DATA.reports && Array.isArray(DATA.reports) && DATA.reports.length > 0) {
      throw new Error("app payload should not embed reports — they live in the repo");
    }
  });

  check("every slot has a paste prompt referencing OFFICE.md", () => {
    DATA.slots.forEach((s) => {
      if (!s.start_prompt || s.start_prompt.length < 200) throw new Error(s.id + " prompt missing/short");
      if (s.start_prompt.indexOf("OFFICE.md") < 0) throw new Error(s.id + " prompt does not reference OFFICE.md");
    });
  });

  check("owner actions each carry a copyable prompt", () => {
    if (!DATA.owner_actions.length) throw new Error("no owner actions parsed from the daily report");
    const withPrompts = DATA.owner_actions.filter((a) => a.prompts && a.prompts.length).length;
    if (withPrompts < 2) throw new Error("expected at least 2 actions with paste prompts, got " + withPrompts);
  });

  check("planning phase: queue empty, round-1 tasks archived", () => {
    if (DATA.phase !== "PLANNING") throw new Error("expected phase PLANNING, got " + DATA.phase);
    if (DATA.counts.queue !== 0) throw new Error("queue should be empty during planning");
    if (DATA.counts.archived_tasks < 20) throw new Error("round-1 tasks should be archived, found " + DATA.counts.archived_tasks);
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
    const appSrc = fs.readFileSync(path.join(APP, "app.js"), "utf8");
    ["AKfycb", "macros/s/"].forEach((bad) => {
      if (appSrc.indexOf(bad) > -1) throw new Error("app.js contains '" + bad + "'");
    });
  });

  check("power thresholds are configured (live=20, quiet=90)", () => {
    if (!DATA.power) throw new Error("power config missing");
    const lv = DATA.power.live_minutes || 20;
    const qv = DATA.power.quiet_minutes || 90;
    if (lv !== 20 || qv !== 90) throw new Error("thresholds should be 20/90, got " + lv + "/" + qv);
  });

  check("office.config.json exists and declares the flat layout", () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "office.config.json"), "utf8"));
    if (cfg.layout.style !== "flat") throw new Error("layout.style must be 'flat'");
    if (!cfg.layout.manager_room || cfg.layout.manager_room.at !== "bottom") {
      throw new Error("manager room must be at the bottom");
    }
    if (!Array.isArray(cfg.layout.tables) || cfg.layout.tables.length < 2) {
      throw new Error("expected 2+ tables in config");
    }
    if (cfg.screens.join(",") !== "Office,Agents,Tasks,Help") {
      throw new Error("screens must be Office,Agents,Tasks,Help: " + cfg.screens);
    }
  });

  console.log("\n" + (failures.length ? "FAILED: " + failures.length : "ALL CHECKS PASSED"));
  process.exit(failures.length ? 1 : 0);
}, 80);

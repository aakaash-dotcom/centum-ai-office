/*
 * smoke_test_app.js — runs app/app.js against a tiny fake DOM and renders every screen.
 * Owner lane: QA/CENTUM
 * Run:         node tools/smoke_test_app.js      (after tools/build_office_data.py)
 * Inputs:      app/app.js, app/data/office.json
 * Outputs:     exit code 0 = every route rendered without throwing
 * Why:         the sandbox has no browser, so this is how a change to the app is checked
 *              before it reaches Ravi's phone. It catches runtime errors, missing data
 *              fields, and prompts that fail to generate.
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
  addEventListener() {}
  select() {}
  setSelectionRange() {}
  focus() {}
  click() { if (this.onclick) this.onclick({ preventDefault() {} }); }
}

const byId = {};
function makeEl(tag, id) {
  const n = new Node(tag);
  if (id) { n.id = id; byId[id] = n; }
  return n;
}
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
const navigatorStub = {};                                    // no serviceWorker, no clipboard
const windowStub = {
  addEventListener: (ev, fn) => { handlers[ev] = fn; },
  scrollTo() {},
  open() {},
  location: locationStub,
};

const sandbox = {
  document: documentStub,
  location: locationStub,
  navigator: navigatorStub,
  window: windowStub,
  fetch: (url) => {
    if (String(url).indexOf("office.json") >= 0) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) });
    }
    return Promise.reject(new Error("unexpected fetch: " + url));
  },
  setTimeout, clearTimeout, console,
};
sandbox.globalThis = sandbox;

/* ------------------------------------------------------------------ run */
const src = fs.readFileSync(path.join(APP, "app.js"), "utf8");
let failures = [];
function check(name, fn) {
  try { fn(); console.log("  PASS  " + name); }
  catch (e) { failures.push(name + " → " + e.message); console.log("  FAIL  " + name + " → " + e.message); }
}

vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox, { filename: "app.js" });
} catch (e) {
  console.log("FAIL  app.js threw on load: " + e.message);
  process.exit(1);
}

setTimeout(() => {
  const view = byId.view;
  console.log("\nRendering every route\n");

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

  const routes = [
    "#/office", "#/agents", "#/agent/agent-05", "#/agent/agent-01", "#/tasks",
    "#/task/TASK-001-page1-subject-gate", "#/reports", "#/report/2026-09-23",
    "#/files", "#/help", "#/work",
  ];
  routes.forEach((r) => {
    check("route " + r + " renders", () => {
      locationStub.hash = r;
      handlers.hashchange();
      if (!view.children.length) throw new Error("nothing rendered");
    });
  });

  check("every slot has a paste prompt", () => {
    DATA.slots.forEach((s) => {
      if (!s.start_prompt || s.start_prompt.length < 400) throw new Error(s.id + " prompt missing/short");
      if (s.start_prompt.indexOf("OFFICE.md") < 0) throw new Error(s.id + " prompt does not reference OFFICE.md");
      // the prompt must WARN about the secret but must never contain one
      if (!/secret/i.test(s.start_prompt)) throw new Error(s.id + " prompt lost the secret warning");
      if (/AKfycb|macros\/s\/|AIza|ghp_/.test(s.start_prompt)) throw new Error(s.id + " prompt leaks a credential");
    });
  });

  check("every queued task has a stop condition and a prompt", () => {
    DATA.tasks.queue.forEach((t) => {
      if (!t.stop_condition) throw new Error(t.id + " has no stop condition");
      if (!t.start_prompt || t.start_prompt.length < 400) throw new Error(t.id + " has no prompt");
    });
  });

  check("owner actions each carry a copyable prompt", () => {
    if (!DATA.owner_actions.length) throw new Error("no owner actions parsed from the daily report");
    DATA.owner_actions.forEach((a) => {
      if (!a.title) throw new Error("action " + a.number + " has no title");
    });
    const withPrompts = DATA.owner_actions.filter((a) => a.prompts.length).length;
    if (withPrompts < 2) throw new Error("expected at least 2 actions with paste prompts, got " + withPrompts);
  });

  check("no secrets or Drive URLs leaked into the app data", () => {
    const blob = JSON.stringify(DATA);
    ["AKfycb", "macros/s/", "script.google.com"].forEach((bad) => {
      if (blob.indexOf(bad) > -1) throw new Error("app data contains '" + bad + "'");
    });
  });

  check("manifest + counts are consistent", () => {
    const t = DATA.tasks;
    if (DATA.counts.queue !== t.queue.length) throw new Error("queue count mismatch");
    if (DATA.counts.agents !== DATA.slots.length) throw new Error("agent count mismatch");
    if (DATA.slots.length !== 5) throw new Error("expected 5 staged slots");
    if (t.queue.length < 10) throw new Error("queue dropped below the 10-task floor");
  });

  console.log("\n" + (failures.length ? "FAILED: " + failures.length : "ALL CHECKS PASSED"));
  process.exit(failures.length ? 1 : 0);
}, 60);

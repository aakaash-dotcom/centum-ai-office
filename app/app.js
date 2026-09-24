/* CENTUM AI Office — phone control room (v2 flat floor).
   Renders entirely from app/data/office.json (or the office.data.js fallback).
   No secrets, no writes: this app can only read. All Drive work stays in the agents.

   Screens: Office · Agents · Tasks · Help.
   - Office: pixel floor + legend + ranked desks.
   - Agents: small boxes (number, lane, state) — no "rooms", no departments.
   - Tasks: four-number bar (queue / active / review / done) plus list.
   - Help: owner actions (paste prompts) and app instructions.

   The app holds ONLY the office: desks, tasks, start prompts. No reports,
   no chat, no logs (those live in the repo).
*/
(function () {
  "use strict";

  var REPO = "https://github.com/aakaash-dotcom/centum-ai-office";
  var DATA = null;
  var BUILD = window.__CENTUM_BUILD || "v4";
  var state = { tab: "office", q: "", demo: false };

  /* ---------- utils */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg) {
    var t = el("div", "toast", esc(msg));
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1900);
  }
  function copy(text, label) {
    var done = function () { toast(label || "Copied — paste it in Arena"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = el("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed — select manually"); }
      ta.remove();
    }
  }

  var ICONS = {
    office: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.4 12 3l9 7.4"/><path d="M5 9.6V20h14V9.6"/><path d="M9.5 20v-6h5v6"/></svg>',
    agents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.2"/><rect x="14" y="2" width="8" height="8" rx="1.2"/><rect x="2" y="14" width="8" height="8" rx="1.2"/><rect x="14" y="14" width="8" height="8" rx="1.2"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.6v.3"/><path d="M12 17.2h.01"/></svg>'
  };

  /* ---------- data */
  function loadData() {
    var url = "data/office.json?v=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("no json"); return r.json(); })
      .catch(function () {
        if (window.CENTUM_OFFICE_DATA) return window.CENTUM_OFFICE_DATA;
        throw new Error("Office data not found. Run: python3 tools/build_office_data.py");
      });
  }

  /* ---------- header */
  function paintHeader() {
    var o = DATA.office;
    document.getElementById("brandSub").textContent =
      "build " + BUILD + " · updated " + DATA.generated_label + " · " + DATA.repo_file_count + " files in repo";
    var chip = document.getElementById("healthChip");
    var key = o.health_key === "GOOD" ? "GOOD" : (o.health_key === "CRITICAL" ? "CRITICAL" : "ATTENTION");
    chip.className = "health-chip health-" + key;
    chip.textContent = o.health;
    var strip = document.getElementById("freezeStrip");
    if (o.freeze_active) {
      strip.hidden = false;
      strip.innerHTML = "<span>🧊</span><span><strong>HARVEST FROZEN.</strong> " +
        esc(o.freeze_text || "No uploads, no Drive restructure, no deletes.") +
        " <span class='tiny'>Lifts when you say <strong>GO</strong>.</span></span>";
    } else { strip.hidden = true; }
  }

  function paintNav() {
    var c = DATA.counts;
    var tabs = [
      ["office", "Office", null],
      ["agents", "Agents", c.agents],
      ["tasks",  "Tasks",  c.queue + c.active + c.review],
      ["help",   "Help",   DATA.owner_actions ? DATA.owner_actions.length : null]
    ];
    var nav = document.getElementById("nav");
    nav.innerHTML = "";
    tabs.forEach(function (t) {
      var b = el("button", state.tab === t[0] ? "on" : "");
      b.innerHTML = ICONS[t[0]] + "<span>" + t[1] + "</span>" +
        (t[2] ? "<span class='badge'>" + t[2] + "</span>" : "");
      b.onclick = function () { location.hash = "#/" + t[0]; };
      nav.appendChild(b);
    });
  }

  /* ---------- lane / emoji helpers */
  function shortLane(slot) {
    var r = (slot.role || "").toUpperCase();
    if (r.indexOf("PYQ") === 0) return "PYQ";
    if (r.indexOf("MODEL") === 0) return "MODEL";
    if (r.indexOf("ONEWORD") === 0 || r.indexOf("QBANK") === 0) return "QBANK";
    if (r.indexOf("FACTORY") === 0) return "FCTY";
    if (r.indexOf("QA") === 0 || r.indexOf("DRIVE") === 0) return "QA";
    if (r.indexOf("AUDIT") === 0) return "AUD";
    if (r.indexOf("NOTES") === 0) return "NOTE";
    return (slot.id || "").replace("agent-", "AG");
  }
  var VIS_EMOJI = {
    working: "🟢", at_risk: "🟡", sleeping_dead: "🔴", sleeping_off: "⚪",
    blocked: "⛔", review: "📄", celebrate: "✨", vacant: "▫", empty: "▫"
  };
  function visEmoji(v) { return VIS_EMOJI[v && v.state] || "▫"; }

  /* ---------- Office screen */
  var pixelHandle = null;

  function closeSheet() {
    var ex = document.getElementById("sheet");
    if (ex) ex.remove();
  }
  function openDeskSheet(id) {
    closeSheet();
    var slot = DATA.slots.filter(function (s) { return s.id === id; })[0];
    if (!slot) return;
    var sheet = el("div", "sheet", "");
    sheet.id = "sheet";
    var inner = el("div", "sheet-inner");
    inner.innerHTML =
      "<div class='sheet-head'>" +
        "<div class='row'><b>" + esc(slot.id) + "</b> <span class='pill'>" + visEmoji(slot.visual) + " " +
        esc((slot.visual && slot.visual.label) || slot.status) + "</span></div>" +
        "<div class='muted'>" + esc(slot.role || "") + "</div>" +
      "</div>";
    if (slot.current_html) inner.appendChild(el("div", "md", slot.current_html));
    var logCard = el("div", "card");
    logCard.appendChild(el("div", "section-title", "Recent log"));
    (slot.log || []).slice(-5).reverse().forEach(function (e) {
      var row = el("div", "log-row");
      row.innerHTML = "<span class='tiny muted'>" + esc(e.age_label) + "</span> " +
        "<span class='mono'>" + esc(e.raw || "") + "</span>";
      logCard.appendChild(row);
    });
    inner.appendChild(logCard);

    if (slot.start_prompt) {
      var btn = el("button", "btn primary", "📋 Copy start prompt");
      btn.onclick = function () { copy(slot.start_prompt, "Start prompt copied — paste into a new Arena chat."); };
      inner.appendChild(btn);
    }
    var close = el("button", "btn sm", "Close");
    close.onclick = closeSheet;
    inner.appendChild(close);

    sheet.appendChild(inner);
    sheet.onclick = function (ev) { if (ev.target === sheet) closeSheet(); };
    document.body.appendChild(sheet);
  }

  function screenOffice() {
    var o = DATA.office, c = DATA.counts;
    var s = el("div", "screen");

    if (pixelHandle) { try { pixelHandle.destroy(); } catch (e) {} pixelHandle = null; }

    var pixCard = el("div", "card pixel-card");
    var host = el("div");
    pixCard.appendChild(host);
    s.appendChild(pixCard);

    var pixBtns = el("div", "btn-row");
    pixBtns.style.margin = "0 0 12px";
    var demoBtn = el("button", "btn " + (state.demo ? "" : "primary") + " sm",
      state.demo ? "■ Back to the live view" : "▶ See a working day (preview)");
    demoBtn.onclick = function () { state.demo = !state.demo; render(); };
    pixBtns.appendChild(demoBtn);
    var wakeBtn = el("button", "btn sm", "☕ Wake an agent");
    wakeBtn.onclick = function () {
      var next = DATA.slots.filter(function (a) { return a.visual && a.visual.state.indexOf("sleeping") === 0; })[0] || DATA.slots[0];
      if (next) openDeskSheet(next.id);
    };
    pixBtns.appendChild(wakeBtn);
    s.appendChild(pixBtns);

    var legend = el("div", "legend");
    [
      ["🟢", "working"], ["🟡", "at the desk / at risk"], ["🔴", "stopped — replace"],
      ["⚪", "off duty"], ["⛔", "blocked"], ["📄", "in review"]
    ].forEach(function (l) {
      legend.appendChild(el("span", "legend-item", "<i>" + l[0] + "</i>" + l[1]));
    });
    s.appendChild(legend);

    if (c.sleeping) {
      s.appendChild(el("div", "banner gold",
        "<div class='t'>" + c.sleeping + " agent" + (c.sleeping > 1 ? "s" : "") + " asleep</div>" +
        "<div class='muted'>" +
        (c.needs_replacement ? c.needs_replacement + " stopped mid-work (red Zzz) — tap a desk to replace them. " : "") +
        "The others are off duty; they start the moment you paste their prompt. Tap a desk to wake one.</div>"));
    }

    s.appendChild(el("div", "section-title",
      "This run <span class='count'>" + (c.working ? c.working + " working" : "nobody working") + "</span>"));
    var lb = el("div", "card");
    var ranked = DATA.slots.slice().sort(function (a, b) {
      return (b.files_produced - a.files_produced) || (b.recent_log_count - a.recent_log_count);
    });
    ranked.forEach(function (a) {
      var row = el("div", "lb-row");
      row.innerHTML =
        "<span class='lb-emoji'>" + visEmoji(a.visual) + "</span>" +
        "<span class='grow truncate'><b>" + esc(shortLane(a)) + "</b> <span class='tiny'>" + esc(a.id) +
        (a.generation > 1 ? " · gen " + a.generation : "") + "</span></span>" +
        "<span class='tiny'>" + (a.files_produced || 0) + " files · " + (a.recent_log_count || 0) + " logs/h</span>" +
        "<span class='meter'><i style='width:" + Math.round(((a.visual && a.visual.efficiency) || 0) / 3 * 100) +
        "%;background:" +
        ((a.visual && a.visual.tone === "red") ? "var(--red)" : (a.visual && a.visual.tone === "amber") ? "var(--amber)" : "var(--green)") +
        "'></i></span>";
      row.onclick = function () { openDeskSheet(a.id); };
      lb.appendChild(row);
    });
    s.appendChild(lb);

    pixelHandle = window.CentumPixel.mount(host, DATA, {
      onDesk: openDeskSheet,
      onManager: function () { location.hash = "#/help"; },
      onPower: function () {
        toast("Power is computed from timestamps in your browser. Lights dim automatically.");
      }
    }, { demo: state.demo });
    return s;
  }

  /* ---------- Agents screen — small boxes (number, lane, state) */
  function screenAgents() {
    var s = el("div", "screen");
    s.appendChild(el("div", "section-title", "Agents <span class='count'>" + DATA.slots.length + " seats</span>"));
    var grid = el("div", "agent-grid");
    DATA.slots.forEach(function (a) {
      var num = (a.id || "").replace("agent-", "");
      var box = el("button", "agent-box state-" + ((a.visual && a.visual.state) || "vacant"));
      box.innerHTML =
        "<div class='ab-top'><span class='ab-num'>" + esc(num) + "</span>" +
        "<span class='ab-state'>" + visEmoji(a.visual) + "</span></div>" +
        "<div class='ab-lane'>" + esc(shortLane(a)) + "</div>" +
        "<div class='ab-role tiny muted'>" + esc((a.role || "").split(" — ")[0]) + "</div>";
      box.onclick = function () { openDeskSheet(a.id); };
      grid.appendChild(box);
    });
    s.appendChild(grid);
    s.appendChild(el("p", "tiny muted",
      "Seats are filled top to bottom, left to right. An 11th agent adds a third table row automatically."));
    return s;
  }

  /* ---------- Tasks screen — four-number bar + list */
  function screenTasks() {
    var s = el("div", "screen");
    s.appendChild(el("div", "section-title", "Tasks"));
    var c = DATA.counts;
    var bar = el("div", "task-bar");
    [
      ["Queue",  c.queue,  "#5b8def"],
      ["Active", c.active, "#2fd07a"],
      ["Review", c.review, "#f5b942"],
      ["Done",   c.done + c.tasks_done_today, "#31c8c8"]
    ].forEach(function (seg) {
      var cell = el("div", "task-cell");
      cell.innerHTML = "<div class='tc-num' style='color:" + seg[2] + "'>" + (seg[1] || 0) + "</div>" +
                       "<div class='tc-lbl'>" + seg[0] + "</div>";
      bar.appendChild(cell);
    });
    s.appendChild(bar);

    s.appendChild(el("div", "section-title", "Queue"));
    var qc = el("div", "card");
    (DATA.tasks || []).filter(function (t) { return t.bucket === "queue"; }).forEach(function (t) {
      qc.appendChild(taskRow(t));
    });
    if (!qc.children.length) qc.appendChild(el("p", "muted", "Queue empty — planning phase."));
    s.appendChild(qc);

    s.appendChild(el("div", "section-title", "Active / Review"));
    var ac = el("div", "card");
    (DATA.tasks || []).filter(function (t) { return t.bucket === "active" || t.bucket === "review"; }).forEach(function (t) {
      ac.appendChild(taskRow(t));
    });
    if (!ac.children.length) ac.appendChild(el("p", "muted", "No active tasks — the freeze is on."));
    s.appendChild(ac);
    return s;
  }
  function taskRow(t) {
    var row = el("div", "task-row");
    row.innerHTML =
      "<div class='grow'><b>" + esc(t.id) + "</b> <span class='muted'>" + esc(t.title || "") + "</span></div>" +
      "<span class='pill pill-" + t.bucket + "'>" + esc(t.bucket) + "</span>";
    if (t.html) {
      var more = el("div", "task-body");
      more.innerHTML = t.html;
      row.appendChild(more);
    }
    return row;
  }

  /* ---------- Help screen (owner actions with copy prompts) */
  function screenHelp() {
    var s = el("div", "screen");
    s.appendChild(el("div", "section-title", "What you can do"));
    var card = el("div", "card");
    (DATA.owner_actions || []).forEach(function (a) {
      var block = el("div", "action-block");
      block.innerHTML = "<b>" + esc(a.title || "(action)") + "</b> " +
        "<div class='muted'>" + esc(a.desc || "") + "</div>";
      if (a.prompts && a.prompts.length) {
        a.prompts.forEach(function (p, i) {
          var btn = el("button", "btn sm primary", "📋 Copy prompt" + (a.prompts.length > 1 ? " " + (i + 1) : ""));
          btn.onclick = function () { copy(p, "Prompt copied — paste into a new Arena chat."); };
          block.appendChild(btn);
        });
      }
      card.appendChild(block);
    });
    if (!DATA.owner_actions || !DATA.owner_actions.length) {
      card.appendChild(el("p", "muted", "No actions right now. The office is in the planning phase."));
    }
    s.appendChild(card);

    s.appendChild(el("div", "section-title", "How the office works"));
    var help = el("div", "card");
    help.innerHTML =
      "<p>The app is read-only. It shows desks, tasks and paste-prompts. " +
      "<b>Reports, chat and logs live in the repo,</b> not in this app.</p>" +
      "<p>Lights are honest: a desk shows <b>working</b> only when there is a recent log line or file produced. " +
      "Heartbeats show <b>at the desk</b>. Thresholds are recomputed in your browser: " +
      "LIVE ≤ 20 min, QUIET ≤ 90 min, CLOSED beyond.</p>" +
      "<p>Tap any desk to see the agent's current state, recent log, and a Copy button for their start prompt. " +
      "Tap the power panel in the manager room to see the live/quiet/closed state.</p>";
    s.appendChild(help);

    s.appendChild(el("div", "section-title", "Put it on your phone home screen"));
    var install = el("div", "card install");
    install.innerHTML =
      "<div class='kv'><b>Android</b><span>Chrome → ⋮ → <b>Add to Home screen</b></span></div>" +
      "<div class='kv'><b>iPhone</b><span>Safari → Share → <b>Add to Home Screen</b></span></div>" +
      "<div class='kv'><b>Build on screen</b><span>" + BUILD + " (this line proves which app version you are looking at)</span></div>";
    s.appendChild(install);
    return s;
  }

  /* ---------- router */
  var ROUTES = { office: screenOffice, agents: screenAgents, tasks: screenTasks, help: screenHelp };

  function render() {
    paintHeader();
    paintNav();
    var view = document.getElementById("view");
    view.innerHTML = "";
    closeSheet();
    var parts = (location.hash || "#/office").replace(/^#\/?/, "").split("/");
    var route = parts[0] || "office";
    var node;
    if (route === "agent") {
      node = screenOffice();
      state.tab = "agents";
      view.appendChild(node);
      setTimeout(function () { openDeskSheet(parts[1]); }, 40);
      return;
    }
    node = (ROUTES[route] || screenOffice)();
    state.tab = ROUTES[route] ? route : "office";
    view.appendChild(node);
    paintNav();
  }

  /* ---------- boot */
  function flattenTasks(t) {
    if (Array.isArray(t)) return t;
    var out = [];
    if (t && typeof t === "object") {
      Object.keys(t).forEach(function (bucket) {
        (t[bucket] || []).forEach(function (x) {
          var copy = Object.assign({}, x);
          copy.bucket = copy.bucket || bucket;
          out.push(copy);
        });
      });
    }
    return out;
  }

  function boot() {
    return loadData().then(function (data) {
      DATA = data;
      DATA.tasks = flattenTasks(data.tasks);
      // initial paint
      render();
      window.addEventListener("hashchange", render);
      // periodic re-render so the honest-lights recomputation ticks
      setInterval(function () {
        if (state.tab === "office" && pixelHandle) {
          // the pixel engine is already animating and recomputes in tick(); nothing to do.
        }
      }, 15000);
    }).catch(function (e) {
      document.getElementById("view").innerHTML =
        "<div class='card'><h2>Could not load office data</h2><pre>" + esc(e.message) + "</pre></div>";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

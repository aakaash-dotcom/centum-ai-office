/* CENTUM AI Office — phone control room
   Renders entirely from app/data/office.json (or the office.data.js fallback).
   No secrets, no writes: this app can only read. All Drive work stays in the agents. */
(function () {
  "use strict";

  var REPO = "https://github.com/aakaash-dotcom/centum-ai-office";
  var DATA = null;
  var BUILD = window.__CENTUM_BUILD || "v3";
  var state = { tab: "office", bucket: "queue", lane: "all", q: "", demo: false };

  /* ------------------------------------------------------------------ utils */
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
  function md(html) { return el("div", "md", html); }

  var ICONS = {
    office: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.4 12 3l9 7.4"/><path d="M5 9.6V20h14V9.6"/><path d="M9.5 20v-6h5v6"/></svg>',
    agents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3.2"/><path d="M3.2 20c.6-3.4 3-5.2 5.8-5.2S14.2 16.6 14.8 20"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M15.5 20c.4-2.4 1.9-3.9 4-3.9"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v12z"/><path d="M8 12h8M8 16h5"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.6v.3"/><path d="M12 17.2h.01"/></svg>'
  };

  /* ------------------------------------------------------------------ data */
  function loadData() {
    var url = "data/office.json?v=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("no json"); return r.json(); })
      .catch(function () {
        if (window.CENTUM_OFFICE_DATA) return window.CENTUM_OFFICE_DATA;
        throw new Error("Office data not found. Run: python3 tools/build_office_data.py");
      });
  }

  /* ------------------------------------------------------------------ header */
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
      ["office", "Office", c.sleeping || null],
      ["agents", "Agents", c.agents],
      ["tasks", "Tasks", c.queue + c.active + c.review || c.archived_tasks],
      ["reports", "Reports", null],
      ["help", "Help", c.owner_actions || null]
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

  /* ------------------------------------------------------------------ office */
  var pixelHandle = null;

  function shortLane(slot) {
    var r = (slot.role || "").toUpperCase();
    if (r.indexOf("PYQ") === 0) return "PYQ";
    if (r.indexOf("MODEL") === 0) return "MODEL";
    if (r.indexOf("ONEWORD") === 0) return "QBANK";
    if (r.indexOf("FACTORY") === 0) return "FACTORY";
    if (r.indexOf("QA") === 0) return "QA";
    return slot.id;
  }
  var VIS_EMOJI = {
    working: "🟢", at_risk: "🟡", sleeping_dead: "🔴", sleeping_off: "⚪",
    blocked: "⛔", review: "📄", celebrate: "✨", vacant: "▫", empty: "▫"
  };
  function visEmoji(v) { return VIS_EMOJI[v && v.state] || "▫"; }

  function screenOffice() {
    var o = DATA.office, c = DATA.counts;
    var s = el("div", "screen");

    if (pixelHandle) { try { pixelHandle.destroy(); } catch (e) {} pixelHandle = null; }

    // ---- the pixel floor
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

    // legend + who is where
    var legend = el("div", "legend");
    [
      ["🟢", "working"], ["🟡", "quiet / at risk"], ["🔴", "stopped — replace"],
      ["⚪", "off duty"], ["⛔", "blocked"], ["📄", "in review"]
    ].forEach(function (l) {
      legend.appendChild(el("span", "legend-item", "<i>" + l[0] + "</i>" + l[1]));
    });
    s.appendChild(legend);

    if (c.sleeping) {
      s.appendChild(el("div", "banner gold", "<div class='t'>" + c.sleeping + " agent" + (c.sleeping > 1 ? "s" : "") +
        " asleep</div><div class='muted'>" +
        (c.needs_replacement ? c.needs_replacement + " stopped mid-work (red Zzz) — those need a replacement. " : "") +
        "The rest are off duty: they start the moment you paste their prompt. Tap a desk to wake one.</div>"));
    }

    // ---- needs you
    if (c.owner_actions) {
      var act = el("div", "banner gold", "<div class='t'>" + c.owner_actions + " things need you</div>" +
        "<div class='muted'>" + (DATA.phase === "PLANNING" ? "Planning phase — decisions come before tasks." : "Copy a prompt and paste it into a fresh Arena chat.") + "</div>");
      var ab = el("div", "btn-row");
      var b1 = el("button", "btn primary sm", "What to do →");
      b1.onclick = function () { location.hash = "#/help"; };
      ab.appendChild(b1);
      var b2 = el("button", "btn sm", "Planning sheet →");
      b2.onclick = function () { location.hash = "#/plan"; };
      ab.appendChild(b2);
      act.appendChild(ab);
      s.appendChild(act);
    }

    // ---- run leaderboard (who is working effectively)
    var ranked = DATA.slots.slice().sort(function (a, b) {
      return (b.files_produced - a.files_produced) || (b.recent_log_count - a.recent_log_count);
    });
    s.appendChild(el("div", "section-title", "This run <span class='count'>" +
      (c.working ? c.working + " working" : "nobody working") + "</span>"));
    var lb = el("div", "card");
    ranked.forEach(function (a) {
      var row = el("div", "lb-row");
      row.innerHTML =
        "<span class='lb-emoji'>" + visEmoji(a.visual) + "</span>" +
        "<span class='grow truncate'><b>" + esc(shortLane(a)) + "</b> <span class='tiny'>" + esc(a.id) +
        (a.generation > 1 ? " · gen " + a.generation : "") + "</span></span>" +
        "<span class='tiny'>" + (a.files_produced || 0) + " files · " + (a.recent_log_count || 0) + " logs/h</span>" +
        "<span class='meter'><i style='width:" + Math.round(((a.visual && a.visual.efficiency) || 0) / 3 * 100) + "%;background:" +
        ((a.visual && a.visual.tone === "red") ? "var(--red)" : (a.visual && a.visual.tone === "amber") ? "var(--amber)" : "var(--green)") + "'></i></span>";
      row.onclick = function () { openDeskSheet(a.id); };
      lb.appendChild(row);
    });
    s.appendChild(lb);

    setTimeout(function () {
      if (window.CentumPixel && host.parentNode) {
        pixelHandle = window.CentumPixel.mount(host, DATA, {
          onDesk: function (id) { if (state.demo) { openDeskSheet(id); return; } openDeskSheet(id); },
          onDepartment: openDepartmentSheet,
          onManager: function () { location.hash = "#/help"; },
          onPower: function () { openPowerSheet(); }
        }, { demo: state.demo });
      }
    }, 0);
    return s;
  }

  /* ------------------------------------------------------------------ sheets */
  function closeSheet() {
    var old = document.getElementById("sheet");
    if (old) old.remove();
    var scrim = document.getElementById("scrim");
    if (scrim) scrim.remove();
  }
  function openSheet(title, subtitle, rows, buttons, extraHtml) {
    closeSheet();
    var scrim = el("div", "scrim");
    scrim.id = "scrim";
    scrim.onclick = closeSheet;
    document.body.appendChild(scrim);

    var sheet = el("div", "sheet");
    sheet.id = "sheet";
    var head = el("div", "sheet-head");
    head.innerHTML = "<div class='grow'><div class='sheet-title'>" + title + "</div>" +
      (subtitle ? "<div class='tiny'>" + subtitle + "</div>" : "") + "</div>";
    var x = el("button", "sheet-x", "✕");
    x.onclick = closeSheet;
    head.appendChild(x);
    sheet.appendChild(head);

    if (rows && rows.length) {
      var body = el("div", "sheet-body");
      rows.forEach(function (r) {
        var d = el("div", "kv");
        d.innerHTML = "<b>" + esc(r[0]) + "</b><span>" + (r[2] ? r[1] : esc(r[1])) + "</span>";
        body.appendChild(d);
      });
      sheet.appendChild(body);
    }
    if (extraHtml) sheet.appendChild(md(extraHtml));
    if (buttons && buttons.length) {
      var bwrap = el("div", "sheet-btns");
      buttons.forEach(function (btn) {
        var b = el("button", "btn " + (btn.kind || ""), btn.label);
        b.onclick = function () { btn.onClick(); };
        bwrap.appendChild(b);
      });
      sheet.appendChild(bwrap);
    }
    document.body.appendChild(sheet);
    setTimeout(function () { sheet.classList.add("on"); }, 10);
  }

  function openDeskSheet(id) {
    var a = null;
    DATA.slots.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return;
    var v = a.visual || {};
    var rows = [
      ["Station", a.id + " · generation " + a.generation],
      ["Occupant", (a.occupant && a.occupant.id) || a.id],
      ["State", v.label || a.status_label],
      ["Lane", shortLane(a)],
      ["Task", a.task_id ? a.task_id + " — " + a.task_name : (a.task_note || "no task assigned")],
      ["Progress", (a.progress_percent || 0) + "% · " + (a.files_produced || 0) + " files produced"],
      ["Last log", (a.last_log_line || "none") + " (" + a.last_log_age_label + ")"],
      ["Recent activity", (a.recent_log_count || 0) + " log entries in the last hour"],
      ["Next step", a.next_step || "—"],
      ["Stop condition", a.stop_condition || "—"]
    ];
    if (a.blocker) rows.push(["Blocker", a.blocker]);
    if (a.replacements && a.replacements.length) {
      rows.push(["Replacements", a.replacements.length + " (last: gen " + a.replacements[a.replacements.length - 1].gen + " — " + a.replacements[a.replacements.length - 1].reason + ")"]);
    }
    if (a.handovers) rows.push(["Handovers on file", String(a.handovers)]);

    var buttons = [];
    if (v.state === "sleeping_dead") {
      buttons.push({
        label: "🔁 Replace this agent (handover)", kind: "primary",
        onClick: function () {
          copy("You are the Manager Agent. Station " + a.id + " has stopped: " + (a.last_log_age_label || "silent") +
            ", status " + a.status + ", task " + (a.task_id || "none") + ".\n\n" +
            "Do the replacement exactly as OFFICE.md \u00a715 says:\n" +
            "1. Run: python3 tools/handover.py --slot " + a.id + " --reason \"" + (a.last_log_age_label || "silent") + " on " + (a.task_id || "its task") + "\"\n" +
            "2. Confirm the handover block captured the log tail, the resume point and the stop condition.\n" +
            "3. Give me the start prompt for the new occupant to paste into a fresh Arena chat.\n" +
            "4. Note the replacement in the daily report (old occupant -> new occupant, reason, time).",
"Replacement prompt copied — paste it into the manager chat");
        }
      });
    }
    if (a.start_prompt) {
      buttons.push({
        label: v.state === "sleeping_off" ? (a.has_task ? "☕ Wake this agent (copy prompt)" : "☕ Wake this agent (standby prompt)") : "Copy start prompt",
        kind: v.state === "sleeping_dead" ? "" : "primary",
        onClick: function () { copy(a.start_prompt, "Prompt copied — paste it into a fresh Arena chat for " + a.id); }
      });
    }
    buttons.push({
      label: "Open full profile →", kind: "ghost",
      onClick: function () { closeSheet(); location.hash = "#/agent/" + a.id; }
    });
    openSheet(visEmoji(v) + " " + shortLane(a) + " — " + a.id,
      "generation " + a.generation + " · " + (v.label || a.status_label), rows, buttons);
  }

  function openDepartmentSheet(id) {
    var d = null;
    (DATA.registry || []).forEach(function (x) { if (x.id === id) d = x; });
    if (!d && id === "power") return openPowerSheet();
    if (!d) return;
    var rows = [
      ["Status", d.status],
      ["Purpose", d.purpose || "—"],
      ["Unlock when", d.unlock_condition || "—"],
      ["Stations", (d.stations || []).length ? d.stations.join(", ") : "none yet"]
    ];
    var buttons = [];
    if (d.status === "LOCKED") {
      buttons.push({
        label: "🔓 Copy prompt to open this department", kind: "primary",
        onClick: function () {
          copy("You are the Manager Agent. The owner wants to open the \"" + d.name + "\" department (currently LOCKED in departments/registry.json).\n\n" +
            "Follow MANAGER-GUIDE.md (new department) and OFFICE.md \u00a717 in order:\n" +
            "1. Ask the owner the four questions: what does this team produce, how many agents, what tools/access, and what is the first batch of tasks.\n" +
            "2. Write departments/" + d.id + "/PLAN.md with the agreed plan.\n" +
            "3. Create the stations (agent-XX folders with current.md, log.md, roster.md, handover.md) and training/roles/<role>.md.\n" +
            "4. Flip status to OPEN in departments/registry.json and add the stations to board.json.\n" +
            "5. Write the first 10 self-contained task files with new ids, each with a stop condition the owner can open on his phone.\n" +
            "6. Rebuild the app so the new room lights up, then give me the paste prompt for each new agent.",
"Department prompt copied — paste it into the manager chat");
        }
      });
    } else {
      buttons.push({
        label: "Open plan →", kind: "primary",
        onClick: function () { window.open(REPO + "/blob/main/" + (d.overview || ""), "_blank"); }
      });
    }
    buttons.push({ label: "Close", kind: "ghost", onClick: closeSheet });
    openSheet((d.status === "LOCKED" ? "🔒 " : d.status === "EXTERNAL" ? "🔗 " : "🏢 ") + d.name,
      "department · " + d.status.toLowerCase(), rows, buttons);
  }

  function openPowerSheet() {
    var p = DATA.power || {};
    var mgr = DATA.manager_desk || {};
    var rows = [
      ["Lights", state.demo ? "PREVIEW — this is an example day, not the real office" :
        (p.state === "LIVE" ? "ON — something is working" : p.state === "QUIET" ? "DIM — recent activity, nothing now" : "OFF — the office is closed")],
      ["Newest activity", p.newest_activity_label || "—"],
      ["Why", p.why || "—"],
      ["Rule", "On when an agent logs, the manager runs, or the app heartbeat is fresh. Off after " + (p.quiet_minutes || 90) + " minutes of silence."],
      ["Manager desk", (mgr.active ? "awake — " : "asleep — ") + (mgr.last_label || "unknown")],
      ["Manager next action", mgr.next_action || "—"]
    ];
    var buttons = [{
      label: "▶︎ Copy manager prompt (open the office)", kind: "primary",
      onClick: function () { copy(managerPrompt(), "Manager prompt copied — paste it into the manager chat"); }
    }, { label: "Close", kind: "ghost", onClick: closeSheet }];
    openSheet(p.state === "CLOSED" ? "🌙 Office closed" : "💡 Office power", "the lights follow real activity", rows, buttons);
  }

  function managerPrompt() {
    return "You are the Manager Agent for the CENTUM AI Office. Repository: " + REPO + ".\n\n" +
      "Run your full workflow now (phases are in MANAGER-GUIDE.md):\n" +
      "PHASE 0 - read board.json, the newest report in reports/daily/, all agents/*/log.md, and OFFICE.md section 2 (is the freeze still on?) plus the phase field (PLANNING?). Say \"Manager online. Reading office state...\" then describe what you found in 3 lines.\n" +
      "PHASE 1 - audit all five stations. For any status ACTIVE with no log for over 30 minutes set is_at_risk, and over 60 minutes replace the occupant with: python3 tools/handover.py --slot agent-0X --reason \"...\". For REVIEW, verify on Drive with a list call and pass or fail each checklist item with evidence.\n" +
      "PHASE 2 - if the phase is PLANNING, do not assign tasks; spend the run on the plan, the audit and the app. If the phase is WORKING, assign the next unblocked task to every free station and put the paste prompt in OWNER ACTIONS.\n" +
      "PHASE 4 - write or update reports/daily/<today>.md, rebuild the app (build_office_data.py, build_standalone.py, then node tools/smoke_test_app.js - it must pass), and refresh reports/READY_MANIFEST.md.\n" +
      "PHASE 5 - post the summary: health, quick status, and numbered owner actions that are copy-paste ready.\n\n" +
      "Hard rules: never produce student content yourself; never paste the Apps Script secret anywhere; never delete Drive content; nothing reaches a student-facing folder without the page-1 subject gate; a station is never deleted, its occupant is replaced and the successor continues from the handover.";
  }

  /* ------------------------------------------------------------------ plan screen */
  function screenPlan() {
    var s = el("div", "screen");
    s.appendChild(el("div", "banner info", "<div class='t'>Planning phase</div><div class='muted'>" +
      esc(DATA.phase_note || "The owner asked to plan before adding tasks.") + "</div>"));
    var c = el("div", "card");
    c.innerHTML = "<div class='tiny'>WHERE WE ARE</div><ul class='md' style='margin-top:6px'>" +
      "<li>Round-1 tasks: <b>" + DATA.counts.archived_tasks + "</b> files parked in <code>tasks/archive/2026-09-23-round1/</code> — nothing was cancelled</li>" +
      "<li>Stations ready: <b>" + DATA.slots.length + "</b> in the Harvest room</li>" +
      "<li>Departments open: <b>" + DATA.counts.departments_open + "</b> · locked: <b>" + DATA.counts.departments_locked + "</b></li>" +
      "<li>Kept from the 4-day team: rules, techniques, the Drive tree, the gate requirement, this office app</li></ul>";
    s.appendChild(c);

    s.appendChild(el("div", "section-title", "The four questions to answer together"));
    var q = el("div", "card");
    q.innerHTML = "<ol class='md' style='margin:0;padding-left:18px'>" +
      "<li>What is the first thing a parent must be able to open — one subject, one class, one shelf?</li>" +
      "<li>Which lane produces it, and with how many stations?</li>" +
      "<li>What is the stop condition you can check on your phone in 30 seconds?</li>" +
      "<li>What is honestly out of scope for the first two weeks?</li></ol>";
    s.appendChild(q);

    s.appendChild(el("div", "section-title", "Archived round-1 tasks <span class='count'>" + DATA.counts.archived_tasks + "</span>"));
    (DATA.archive || []).forEach(function (round) {
      var card = el("div", "card");
      card.innerHTML = "<div class='row'><b class='grow'>" + esc(round.round) + "</b><span class='chip'>" + round.count + " tasks</span></div>" +
        "<div class='tiny' style='margin-top:5px'>Parked, not cancelled. Their useful knowledge is listed in the folder README.</div>";
      var b = el("button", "btn ghost sm", "Open the folder on GitHub");
      b.style.marginTop = "9px";
      b.onclick = function () { window.open(REPO + "/tree/main/" + round.path, "_blank"); };
      card.appendChild(b);
      s.appendChild(card);
    });

    s.appendChild(el("div", "section-title", "Talk to the manager"));
    var mp = el("div", "card");
    mp.innerHTML = "<div class='muted'>Copy this and paste it into the manager chat to plan the first round.</div>";
    var mb = el("button", "btn primary", "Copy planning prompt");
    mb.style.marginTop = "10px";
    mb.onclick = function () {
      copy("You are the Manager Agent. Phase: PLANNING. Repository: " + REPO + ".\n\n" +
        "The owner wants to plan the first real round of work before any tasks exist. Do not create tasks yet.\n\n" +
        "1. Read PLAN.md, OFFICE.md (all of it), the archived round-1 tasks in tasks/archive/2026-09-23-round1/README.md, departments/registry.json and reports/READY_MANIFEST.md.\n" +
        "2. Report what already exists and is usable: the SSLC Science STATE files, the DGE bundles, the Drive tree, the proven techniques, and the one thing the office still cannot do (the page-1 gate does not exist yet).\n" +
        "3. Propose ONE first round: one subject and class, one lane, at most three stations, one stop condition the owner can open on his phone in 30 seconds. State exactly what will be on Drive when the round is done, and what will NOT be attempted.\n" +
        "4. Ask the owner only the questions you genuinely cannot answer from the repository, as a numbered list of at most four, each with your recommended default.\n" +
        "5. Update PLAN.md with the agreed plan once the owner answers, then rebuild the app.",
        "Planning prompt copied — paste it into the manager chat");
    };
    mp.appendChild(mb);
    s.appendChild(mp);
    return s;
  }

  function agentRow(a) {
    var v = a.visual || {};
    var card = el("div", "card tap");
    card.innerHTML =
      "<div class='row'>" +
        "<div class='agent-avatar'>" + esc(a.number) + "</div>" +
        "<div class='grow col'>" +
          "<div class='row'><span class='grow truncate' style='font-weight:650'>" +
            esc(a.task_id || shortLane(a)) + (a.generation > 1 ? " <span class='tiny'>gen " + a.generation + "</span>" : "") +
          "</span><span class='chip' style='color:" + (v.tone === 'red' ? 'var(--red)' : v.tone === 'amber' ? 'var(--amber)' : 'var(--green)') + "'>" +
            esc(v.label || a.status_label) + "</span></div>" +
          "<div class='tiny truncate'>" + esc(a.task_name || a.task_note || a.role) + "</div>" +
        "</div>" +
        "<div class='dot " + (v.state === "working" ? "pulse" : "") + "' style='background:" +
          (v.tone === 'red' ? 'var(--red)' : v.tone === 'amber' ? 'var(--amber)' : v.tone === 'grey' ? 'var(--muted-2)' : 'var(--green)') + "'></div>" +
      "</div>" +
      "<div class='bar'><i style='width:" + (a.progress_percent || 0) + "%'></i></div>" +
      "<div class='row' style='margin-top:7px'><span class='tiny grow truncate'>" +
        esc(a.last_log_line || "no log yet") + "</span><span class='tiny'>" + esc(a.last_log_age_label) + "</span></div>";
    card.onclick = function () { openDeskSheet(a.id); };
    return card;
  }

  function linkCard(t, sub, hash) {
    var c = el("div", "card tap", "<div class='row'><div class='grow'><b>" + esc(t) +
      "</b><div class='tiny'>" + esc(sub) + "</div></div><span class='muted'>›</span></div>");
    c.onclick = function () { location.hash = hash; };
    return c;
  }

  /* ------------------------------------------------------------------ agents */
  function screenAgents() {
    var s = el("div", "screen");
    s.appendChild(el("div", "banner info", "<div class='t'>One agent, one lane</div>" +
      "<div class='muted'>PYQ · MODEL · ONEWORD/QBANK · FACTORY · QA/CENTUM. " +
      "Classes are file-sets inside a lane — not separate agents any more.</div>"));
    DATA.slots.forEach(function (a) { s.appendChild(agentRow(a)); });
    s.appendChild(el("div", "section-title", "More"));
    s.appendChild(linkCard("Tasks queue", DATA.counts.queue + " waiting to be assigned", "#/tasks"));
    s.appendChild(linkCard("Owner actions", DATA.counts.owner_actions + " in the latest report", "#/help"));
    return s;
  }

  function linkCard(t, sub, hash) {
    var c = el("div", "card tap", "<div class='row'><div class='grow'><b>" + esc(t) + "</b><div class='tiny'>" + esc(sub) + "</div></div><span class='muted'>›</span></div>");
    c.onclick = function () { location.hash = hash; };
    return c;
  }

  function screenAgent(id) {
    var a = null;
    DATA.slots.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return el("div", "empty", "Agent not found.");
    var s = el("div", "screen");

    var head = el("div", "card");
    head.innerHTML =
      "<div class='row'><div class='agent-avatar' style='width:46px;height:46px;font-size:17px'>" + esc(a.number) + "</div>" +
      "<div class='grow col'><b>" + esc(a.role) + "</b><div class='tiny'>" + esc(a.id) + " · " + esc(a.status_label) + " · last log " + esc(a.last_log_age_label) + "</div></div>" +
      "<span class='dot " + (a.status === "ACTIVE" ? "pulse" : "") + "' style='background:" + a.status_color + "'></span></div>" +
      (a.task_id ? "<div style='margin-top:11px'><span class='chip gold'>" + esc(a.task_id) + "</span> <span class='muted'>" + esc(a.task_name) + "</span></div>" : "") +
      "<div class='bar'><i style='width:" + (a.progress_percent || 0) + "%;background:" + a.status_color + "'></i></div>" +
      "<div class='row' style='margin-top:6px'><span class='tiny grow'>progress " + (a.progress_percent || 0) + "% · " + (a.files_produced || 0) + " files produced</span></div>";
    s.appendChild(head);

    if (a.blocker) {
      s.appendChild(el("div", "banner warn", "<div class='t'>Blocker</div>" + esc(a.blocker)));
    }
    if (a.stop_condition) {
      s.appendChild(el("div", "banner gold", "<div class='t'>Stop condition</div>" + esc(a.stop_condition)));
    }
    if (a.next_step) {
      s.appendChild(el("div", "card", "<div class='tiny'>NEXT STEP</div><div style='margin-top:4px'>" + esc(a.next_step) + "</div>"));
    }

    var btns = el("div", "btn-row");
    var bCopy = el("button", "btn primary", "Copy start prompt");
    bCopy.onclick = function () { copy(a.start_prompt || "", "Prompt copied — paste into a fresh Arena chat"); };
    btns.appendChild(bCopy);
    if (a.task_slug) {
      var bTask = el("button", "btn", "Open task file");
      bTask.onclick = function () { location.hash = "#/task/" + a.task_slug; };
      btns.appendChild(bTask);
    }
    s.appendChild(btns);

    s.appendChild(el("div", "section-title", "Log <span class='count'>" + (a.log || []).length + " entries</span>"));
    var list = el("div", "log-list");
    (a.log || []).forEach(function (L) {
      var it = el("div", "log-item" + (L.verb ? " verb-" + L.verb : ""));
      it.innerHTML = (L.verb ? "<span class='log-verb'>" + esc(L.verb) + "</span> " : "") +
        "<span class='log-meta'>" + esc(L.age_label || "") + "</span>" +
        "<div class='log-body'>" + esc(L.body) + "</div>";
      list.appendChild(it);
    });
    if (!(a.log || []).length) list.appendChild(el("div", "empty", "No log entries yet."));
    s.appendChild(list);

    s.appendChild(el("div", "section-title", "Assignment (current.md)"));
    s.appendChild(md(a.current_html));
    return s;
  }

  /* ------------------------------------------------------------------ tasks */
  function screenTasks() {
    var c = DATA.counts;
    var s = el("div", "screen");
    var seg = el("div", "segmented");
    [["queue", "Queue", c.queue], ["active", "Active", c.active], ["review", "Review", c.review], ["done", "Done", c.done]]
      .forEach(function (t) {
        var b = el("button", state.bucket === t[0] ? "on" : "", esc(t[1]) + "<span class='n'>" + t[2] + "</span>");
        b.onclick = function () { state.bucket = t[0]; render(); };
        seg.appendChild(b);
      });
    s.appendChild(seg);

    var list = DATA.tasks[state.bucket] || [];
    var lanes = ["all"];
    list.forEach(function (t) { if (t.lane && lanes.indexOf(t.lane) < 0) lanes.push(t.lane); });
    if (lanes.length > 2) {
      var f = el("div", "filters");
      lanes.forEach(function (l) {
        var b = el("button", state.lane === l ? "on" : "", esc(l === "all" ? "All lanes" : l));
        b.onclick = function () { state.lane = l; render(); };
        f.appendChild(b);
      });
      s.appendChild(f);
    }

    var search = el("input", "search");
    search.type = "search";
    search.placeholder = "Search tasks… (" + list.length + ")";
    search.value = state.q;
    search.oninput = function () { state.q = search.value; paintTaskList(box); };
    s.appendChild(search);

    var box = el("div");
    s.appendChild(box);
    paintTaskList(box, list);
    if (!list.length) box.appendChild(el("div", "empty", "Nothing in " + state.bucket + " yet."));
    return s;

    function paintTaskList(box, listArg) {
      var all = listArg || DATA.tasks[state.bucket] || [];
      var q = (state.q || "").toLowerCase();
      box.innerHTML = "";
      var shown = all.filter(function (t) {
        if (state.lane !== "all" && t.lane !== state.lane) return false;
        if (q && (t.id + " " + t.title + " " + t.lane + " " + t.stop_condition).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (!shown.length) { box.appendChild(el("div", "empty", "No task matches that filter.")); return; }
      shown.forEach(function (t) {
        var shelf = (t.shelf || "").toLowerCase();
        var card = el("div", "card tap");
        card.innerHTML =
          "<div class='row'><span class='chip gold'>" + esc(t.id) + "</span>" +
          (shelf && shelf !== "n/a (tooling)" && shelf !== "n/a (audit)" && shelf !== "n/a (production step)"
            ? "<span class='chip " + (shelf.indexOf("topper") === 0 ? "topper" : shelf.indexOf("centum") === 0 ? "centum" : "free") + "'>" + esc(t.shelf.split(" ")[0]) + "</span>" : "") +
          (t.owner_approval && t.owner_approval.toLowerCase().indexOf("yes") === 0 ? "<span class='chip warn'>needs you</span>" : "") +
          "<span class='spacer'></span><span class='tiny'>P" + esc((t.priority || "").match(/\d/) ? t.priority.match(/\d/)[0] : "–") + "</span></div>" +
          "<div style='font-weight:650;margin-top:9px;line-height:1.35'>" + esc(t.title) + "</div>" +
          "<div class='tiny' style='margin-top:5px'>" + esc(t.lane) + (t.blocked_by && t.blocked_by !== "none" ? " · blocked by " + esc(t.blocked_by) : "") + "</div>";
        card.onclick = function () { location.hash = "#/task/" + t.slug; };
        box.appendChild(card);
      });
    }
  }

  function screenTask(slug) {
    var t = null, bucket = "";
    Object.keys(DATA.tasks).forEach(function (k) {
      DATA.tasks[k].forEach(function (x) { if (x.slug === slug) { t = x; bucket = k; } });
    });
    if (!t) return el("div", "empty", "Task not found.");
    var s = el("div", "screen");
    s.appendChild(el("div", "card", "<div class='row'><span class='chip gold'>" + esc(t.id) + "</span>" +
      "<span class='chip'>" + esc(bucket) + "</span>" +
      (t.shelf ? "<span class='chip'>" + esc(t.shelf.split(" ")[0]) + "</span>" : "") + "</div>" +
      "<div style='font-weight:700;font-size:16px;margin-top:10px'>" + esc(t.title) + "</div>" +
      "<div class='muted' style='margin-top:8px'>" + esc(t.why) + "</div>"));
    s.appendChild(el("div", "card", "<div class='kv'><b>Lane</b><span>" + esc(t.lane) + "</span></div>" +
      "<div class='kv'><b>Priority</b><span>" + esc(t.priority) + "</span></div>" +
      "<div class='kv'><b>Shelf</b><span>" + esc(t.shelf) + "</span></div>" +
      "<div class='kv'><b>Blocked by</b><span>" + esc(t.blocked_by) + "</span></div>" +
      "<div class='kv'><b>Owner approval</b><span>" + esc(t.owner_approval) + "</span></div>" +
      "<div class='kv'><b>Estimate</b><span>" + esc(t.estimate) + "</span></div>"));
    if (t.stop_condition) s.appendChild(el("div", "banner gold", "<div class='t'>Stop condition</div>" + esc(t.stop_condition)));
    var btns = el("div", "btn-row");
    var b1 = el("button", "btn primary", "Copy prompt for an agent");
    b1.onclick = function () { copy(t.start_prompt || "", "Prompt copied — paste into a fresh Arena chat"); };
    btns.appendChild(b1);
    var b2 = el("button", "btn", "Copy GitHub link");
    b2.onclick = function () { copy(REPO + "/blob/main/" + t.path, "GitHub link copied"); };
    btns.appendChild(b2);
    s.appendChild(btns);
    s.appendChild(el("div", "section-title", "Full task file"));
    s.appendChild(md(t.html));
    return s;
  }

  /* ------------------------------------------------------------------ work */
  function screenWork() {
    var w = DATA.office.existing_work || {};
    var s = el("div", "screen");
    s.appendChild(el("div", "banner info", "<div class='t'>What the 4-day team left behind</div>" +
      "<div class='muted'>Trusted by level, as recorded in the debrief. This is the base the office builds on — nothing here is thrown away.</div>"));
    var c1 = el("div", "card");
    c1.innerHTML = "<div class='tiny'>HIGH-TRUST FILES</div><div style='margin-top:6px'>" + esc(w.files_completed) + "</div>";
    s.appendChild(c1);
    s.appendChild(el("div", "section-title", "Collected resources"));
    s.appendChild(el("div", "card", "<div class='md'>" + esc(w.resources_collected) + "</div>"));
    s.appendChild(el("div", "section-title", "Techniques we keep using"));
    var tech = el("div", "card");
    var ul = el("ul", "md");
    (w.techniques_established || []).forEach(function (t) { ul.appendChild(el("li", "", esc(t))); });
    tech.appendChild(ul);
    s.appendChild(tech);
    s.appendChild(el("div", "section-title", "Failures the standards now block"));
    var fail = el("div", "card");
    var ul2 = el("ul", "md");
    (w.known_failures || []).forEach(function (t) { ul2.appendChild(el("li", "", esc(t))); });
    fail.appendChild(ul2);
    s.appendChild(fail);
    s.appendChild(el("div", "section-title", "Parked by the owner"));
    var park = el("div", "card");
    var ul3 = el("ul", "md");
    (DATA.office.parked || []).forEach(function (t) { ul3.appendChild(el("li", "", esc(t))); });
    park.appendChild(ul3);
    s.appendChild(park);
    return s;
  }

  /* ------------------------------------------------------------------ files */
  function screenFiles() {
    var s = el("div", "screen");
    s.appendChild(el("div", "banner gold", "<div class='t'>The only truth is Drive</div>" +
      "<div class='muted'>This is the READY MANIFEST — what the office has published into StudyHub. " +
      "A file appears here only after the page-1 subject gate passed and the Drive path was verified.</div>"));
    if (!DATA.manifest.length) { s.appendChild(el("div", "empty", "Manifest is empty.")); return s; }
    DATA.manifest.forEach(function (tb) {
      if (!tb.rows || !tb.rows.length) return;
      var card = el("div", "card");
      var t = el("div", "tw"), tbl = el("table");
      var thead = el("thead"), trh = el("tr");
      tb.head.forEach(function (h) { trh.appendChild(el("th", "", esc(h))); });
      thead.appendChild(trh); tbl.appendChild(thead);
      var tb2 = el("tbody");
      tb.rows.forEach(function (r) {
        var tr = el("tr");
        r.forEach(function (cell) {
          var td = el("td");
          if (/^https?:\/\//.test(cell)) td.innerHTML = "<a href='" + esc(cell) + "' target='_blank' rel='noopener'>open</a>";
          else if (/^`/.test(cell)) td.innerHTML = "<code>" + esc(cell.replace(/`/g, "")) + "</code>";
          else td.textContent = cell;
          tr.appendChild(td);
        });
        tb2.appendChild(tr);
      });
      tbl.appendChild(tb2);
      t.appendChild(tbl);
      card.appendChild(t);
      card.style.padding = "4px";
      s.appendChild(card);
    });
    var b = el("button", "btn ghost", "Open READY_MANIFEST.md on GitHub");
    b.onclick = function () { window.open(REPO + "/blob/main/reports/READY_MANIFEST.md", "_blank"); };
    s.appendChild(b);
    return s;
  }

  /* ------------------------------------------------------------------ reports */
  function screenReports() {
    var s = el("div", "screen");
    if (!DATA.reports.length) { s.appendChild(el("div", "empty", "No reports yet.")); return s; }
    s.appendChild(el("div", "banner info", "<div class='t'>One report per manager run</div>" +
      "<div class='muted'>The newest is the truth. Health, what moved, and what needs you.</div>"));
    DATA.reports.forEach(function (r) {
      var hk = r.health.toUpperCase().indexOf("GOOD") === 0 ? "GOOD" : (r.health.toUpperCase().indexOf("CRITICAL") === 0 ? "CRITICAL" : "ATTENTION");
      var c = el("div", "card tap");
      c.innerHTML = "<div class='row'><div class='grow'><b>Daily report — " + esc(r.date) + "</b>" +
        "<div class='tiny'>" + ((r.actions || []).length) + " owner actions</div></div>" +
        "<span class='health-chip health-" + hk + "'>" + esc(r.health || "—") + "</span></div>";
      c.onclick = function () { location.hash = "#/report/" + r.date; };
      s.appendChild(c);
    });
    return s;
  }

  function screenReport(date) {
    var r = null;
    DATA.reports.forEach(function (x) { if (x.date === date) r = x; });
    if (!r) return el("div", "empty", "Report not found.");
    var s = el("div", "screen");
    if (r.actions && r.actions.length) {
      s.appendChild(el("div", "section-title", "Your actions <span class='count'>" + r.actions.length + "</span>"));
      r.actions.forEach(function (a, i) {
        var card = el("div", "action");
        var head = el("div", "action-head");
        head.innerHTML = "<div class='action-num'>" + esc(a.number || (i + 1)) + "</div><div class='grow'><h3>" + esc(a.title) + "</h3></div>";
        card.appendChild(head);
        card.appendChild(md(a.html));
        if (a.prompts && a.prompts.length) {
          a.prompts.forEach(function (p, pi) {
            var b = el("button", "btn primary", a.prompts.length > 1 ? "Copy prompt " + (pi + 1) : "Copy this prompt");
            b.onclick = function () { copy(p, "Prompt copied — paste into a fresh Arena chat"); };
            card.appendChild(b);
          });
        }
        var gb = el("button", "btn ghost sm", "Open in GitHub");
        gb.style.marginTop = "8px";
        gb.onclick = function () { window.open(REPO + "/blob/main/" + r.path, "_blank"); };
        card.appendChild(gb);
        s.appendChild(card);
      });
    }
    s.appendChild(el("div", "section-title", "Full report"));
    var full = md(r.html);
    s.appendChild(full);
    // copy buttons next to every code prompt inside the full report
    Array.prototype.forEach.call(full.querySelectorAll("pre"), function (pre) {
      var b = el("button", "btn sm", "Copy prompt");
      b.style.marginTop = "-6px";
      b.onclick = function () { copy(pre.innerText, "Prompt copied"); };
      pre.parentNode.insertBefore(b, pre.nextSibling);
    });
    return s;
  }

  /* ------------------------------------------------------------------ help */
  function managerPrompt() {
    return "You are the Manager Agent for the CENTUM AI Office. Repository: " + REPO + ".\n\n" +
      "Run your full workflow now:\n" +
      "PHASE 0 — Read board.json, the newest file in reports/daily/, every agents/agent-XX/log.md, and OFFICE.md Section 2 (is the freeze still on?). Say \"Manager online. Reading office state...\" then describe what you found in 3 lines.\n" +
      "PHASE 1 — Audit all five slots (ACTIVE / BLOCKED / REVIEW / STAGED). For REVIEW, verify on Drive with a list call (never from the agent's summary) and pass or fail each item of the matching checklist in training/quality-checklist.md, showing PASS/FAIL per item with evidence. On any fail, write surgical feedback into that agent's current.md and set the slot back to ACTIVE.\n" +
      "PHASE 2 — Assign the next highest-priority unblocked task from tasks/queue/ to every EMPTY or newly-DONE slot; move the file to tasks/active/ and write the full assignment into current.md including the stop condition and the owner's paste prompt.\n" +
      "PHASE 3 — If tasks/queue/ has fewer than 10 tasks, author the next batch (check tasks/done/ first so nothing is repeated).\n" +
      "PHASE 4 — Write or update reports/daily/<today>.md using the template in reports/daily/README.md, then refresh reports/READY_MANIFEST.md for anything newly verified.\n" +
      "PHASE 5 — Post the summary block: office health, quick status counts, and the numbered owner actions, each copy-paste ready.\n\n" +
      "Hard rules: never produce student content yourself; never paste the Apps Script secret anywhere; never delete Drive content; nothing reaches a student-facing folder without the page-1 subject gate; keep the freeze unless the owner says GO; keep the queue at 10 or more tasks.";
  }

  function screenHelp() {
    var s = el("div", "screen");
    s.appendChild(el("div", "banner gold", "<div class='t'>Your 30-second routine</div>" +
      "<div class='muted'>Read the health chip at the top. If it is yellow or red, the office needs you — the rest is the agents' job.</div>"));
    var steps = el("ol", "steps");
    [
      "Open this app. Health chip + the red freeze strip tell you the state.",
      "Tap the badge on <b>Help</b> (or the gold card on Office) — that is exactly what needs you.",
      "Tap <b>Copy prompt</b> on each action and paste it into a fresh Arena chat. One chat per agent slot.",
      "Say <b>GO</b> in the manager chat when a decision is asked for. Nothing publishes without it.",
      "Come back here: the agent you started will appear as Working, then move to Review, then Done."
    ].forEach(function (t) { steps.appendChild(el("li", "", t)); });
    s.appendChild(steps);

    var mp = managerPrompt();
    s.appendChild(el("div", "section-title", "Run the manager"));
    var mc = el("div", "card");
    mc.innerHTML = "<div class='muted'>Paste this into the manager chat (this session or a new one) whenever you want a manager run.</div>";
    var mb = el("button", "btn primary", "Copy manager prompt");
    mb.style.marginTop = "10px";
    mb.onclick = function () { copy(mp, "Manager prompt copied"); };
    mc.appendChild(mb);
    s.appendChild(mc);

    if (DATA.owner_actions && DATA.owner_actions.length) {
      s.appendChild(el("div", "section-title", "Waiting on you now <span class='count'>" + DATA.owner_actions.length + "</span>"));
      DATA.owner_actions.forEach(function (a, i) {
        var card = el("div", "action");
        var head = el("div", "action-head");
        head.innerHTML = "<div class='action-num'>" + esc(a.number || (i + 1)) + "</div><div class='grow'><h3>" + esc(a.title) + "</h3></div>";
        card.appendChild(head);
        card.appendChild(md(a.html));
        (a.prompts || []).forEach(function (p, pi) {
          var b = el("button", "btn primary", a.prompts.length > 1 ? "Copy prompt " + (pi + 1) : "Copy this prompt");
          b.onclick = function () { copy(p, "Prompt copied — paste into a fresh Arena chat"); };
          card.appendChild(b);
        });
        s.appendChild(card);
      });
    }

    s.appendChild(el("div", "section-title", "Put it on your phone home screen"));
    var inst = el("div", "card");
    inst.innerHTML =
      "<div class='kv'><b>iPhone</b><span>Safari → Share → <b>Add to Home Screen</b></span></div>" +
      "<div class='kv'><b>Android</b><span>Chrome → ⋮ → <b>Add to Home screen</b></span></div>" +
      "<div class='kv'><b>GitHub Pages</b><span>the permanent link (Settings → Pages → branch main → /app)</span></div>" +
      "<div class='kv'><b>Refresh</b><span>tap ⟳ in the header — re-reads office.json</span></div>" +
      "<div class='kv'><b>Build on screen</b><span>" + BUILD + " (this line proves which app version you are looking at)</span></div>" +
      "<div class='kv'><b>Looking stale?</b><span>open the app with <code>?fresh=1</code> on the end of the link — it clears the offline cache and reloads the new build</span></div>";
    s.appendChild(inst);

    s.appendChild(el("div", "section-title", "Links"));
    var links = el("div", "card");
    [["Repository", REPO], ["Read OFFICE.md", REPO + "/blob/main/OFFICE.md"],
     ["Daily reports", REPO + "/tree/main/reports/daily"], ["Task queue", REPO + "/tree/main/tasks/queue"],
     ["Single-file version (works anywhere)", REPO + "/blob/main/app/index.standalone.html"]].forEach(function (l) {
      var row = el("div", "kv");
      row.innerHTML = "<b>" + esc(l[0]) + "</b><span><a href='" + esc(l[1]) + "' target='_blank' rel='noopener'>open ↗</a></span>";
      links.appendChild(row);
    });
    s.appendChild(links);
    return s;
  }

  /* ------------------------------------------------------------------ router */
  var ROUTES = {
    office: screenOffice, agents: screenAgents, tasks: screenTasks, reports: screenReports,
    help: screenHelp, files: screenFiles, work: screenWork, plan: screenPlan
  };

  function render() {
    var view = document.getElementById("view");
    var parts = (location.hash || "#/office").replace(/^#\/?/, "").split("/");
    var route = parts[0] || "office";
    var arg = parts.slice(1).join("/");
    var node;
    if (route === "agent") { node = screenAgent(arg); state.tab = "agents"; }
    else if (route === "task") { node = screenTask(arg); state.tab = "tasks"; }
    else if (route === "report") { node = screenReport(arg); state.tab = "reports"; }
    else { node = (ROUTES[route] || screenOffice)(); state.tab = (route === "plan" || route === "work" || route === "files") ? "help" : (ROUTES[route] ? route : "office"); }
    view.innerHTML = "";
    view.appendChild(node);
    paintNav();
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }

  /* ------------------------------------------------------------------ boot */
  function boot(data) {
    DATA = data;
    window.__CENTUM_BOOTED = true;          // tells the boot guard in index.html we are alive
    document.title = "CENTUM AI Office — " + data.office.health;
    paintHeader();
    render();
    if (!boot.wired) {
      boot.wired = true;
      window.addEventListener("hashchange", render);
      var rb = document.getElementById("refreshBtn");
      if (rb) rb.onclick = refresh;
      if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
        navigator.serviceWorker.register("sw.js").catch(function () { /* offline extras are optional */ });
      }
    }
  }

  function refresh() {
    toast("Refreshing…");
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) { keys.forEach(function (k) { caches.delete(k); }); }).catch(function () {});
    }
    fetch("data/office.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("no json"); return r.json(); })
      .then(function (d) { boot(d); toast("Refreshed " + d.generated_label); })
      .catch(function () { location.reload(); });
  }
  window.centumRefresh = refresh;

  function failed(msg) {
    document.getElementById("view").innerHTML =
      "<div class='banner warn'><div class='t'>Could not load office data</div>" + esc(msg) + "</div>" +
      "<div class='card'><div class='tiny'>Fix</div><div style='margin-top:6px'>Run <code>python3 tools/build_office_data.py</code> and refresh.</div></div>";
  }

  loadData().then(boot, function (e) { failed(e.message || String(e)); });
})();

/* CENTUM AI Office — phone control room
   Renders entirely from app/data/office.json (or the office.data.js fallback).
   No secrets, no writes: this app can only read. All Drive work stays in the agents. */
(function () {
  "use strict";

  var REPO = "https://github.com/aakaash-dotcom/centum-ai-office";
  var DATA = null;
  var state = { tab: "office", bucket: "queue", lane: "all", q: "" };

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
      "Updated " + DATA.generated_label + " · " + DATA.repo_file_count + " files in repo";
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
      ["tasks", "Tasks", c.queue + c.active + c.review],
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
  function screenOffice() {
    var o = DATA.office, c = DATA.counts;
    var s = el("div", "screen");

    var hero = el("div", "hero");
    hero.innerHTML =
      "<h1>" + esc(o.name) + "</h1>" +
      "<div class='sub'>Manager " + esc((o.manager_status || "").toLowerCase()) +
      " · last run " + esc(o.manager_last_run_label) + "</div>" +
      "<div class='hero-grid'>" +
      stat(c.queue, "Queued") + stat(c.active, "Active") + stat(c.review, "Review") + stat(c.done, "Done") +
      "</div>";
    s.appendChild(hero);

    if (c.owner_actions) {
      s.appendChild(el("div", "banner gold", "<div class='t'>" + c.owner_actions +
        " things need you</div><div class='muted'>Copy a prompt, paste it into a fresh Arena chat. " +
        "Full detail in Help and Reports.</div>" +
        "<div class='btn-row'><button class='btn primary sm' id='goHelp'>See what to do →</button></div>"));
      setTimeout(function () {
        var b = document.getElementById("goHelp");
        if (b) b.onclick = function () { location.hash = "#/help"; };
      }, 0);
    }

    s.appendChild(el("div", "section-title", "Agents <span class='count'>" + c.working + " working</span>"));
    DATA.slots.forEach(function (a) { s.appendChild(agentRow(a)); });

    s.appendChild(el("div", "section-title", "Jump to"));
    var tiles = el("div", "tile-grid");
    tiles.appendChild(tile("📋", "Tasks", c.queue + " waiting · " + c.active + " active", "#/tasks"));
    tiles.appendChild(tile("📁", "Files shelf", "What is published", "#/files"));
    tiles.appendChild(tile("📰", "Reports", "Daily manager runs", "#/reports"));
    tiles.appendChild(tile("❓", "How to work this", "4 taps, 30 seconds", "#/help"));
    s.appendChild(tiles);

    var work = DATA.office.existing_work;
    if (work) {
      var card = el("div", "card");
      card.innerHTML = "<div class='row'><div class='grow'><b>Carried over from the 4-day team</b>" +
        "<div class='tiny'>The office did not start from zero</div></div><span class='chip gold'>recovered</span></div>";
      var body = el("div", "muted");
      body.style.marginTop = "10px";
      body.innerHTML = "<div class='kv'><b>High-trust files</b><span>" + esc(work.files_completed) + "</span></div>" +
        "<div class='kv'><b>Collected</b><span>" + esc((work.resources_collected || "").split(";")[0]) + "</span></div>" +
        "<div class='kv'><b>Techniques</b><span>" + ((work.techniques_established || []).length) + " documented in OFFICE.md §5</span></div>";
      card.appendChild(body);
      var det = el("div", "", "<div style='margin-top:10px'><div class='tiny'><b>Known failures now blocked by the standards:</b></div><ul class='md' style='font-size:13px;color:var(--muted);margin-top:6px'>" +
        (work.known_failures || []).slice(0, 6).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") +
        "</ul></div>");
      card.appendChild(det);
      card.classList.add("tap");
      card.onclick = function () { location.hash = "#/work"; };
      s.appendChild(el("div", "section-title", "Existing work"));
      s.appendChild(card);
    }
    return s;
  }
  function stat(n, label) { return "<div class='stat'><b>" + n + "</b><span>" + label + "</span></div>"; }
  function tile(ic, lb, sb, hash) {
    var t = el("div", "tile", "<div class='ic'>" + ic + "</div><div class='lb'>" + esc(lb) + "</div><div class='sb'>" + esc(sb) + "</div>");
    t.onclick = function () { location.hash = hash; };
    return t;
  }

  function agentRow(a) {
    var card = el("div", "card tap");
    card.innerHTML =
      "<div class='row'>" +
        "<div class='agent-avatar'>" + esc(a.number) + "</div>" +
        "<div class='grow col'>" +
          "<div class='row'><span class='grow truncate' style='font-weight:650'>" + esc(a.task_id || a.role) + "</span>" +
          "<span class='chip' style='color:" + a.status_color + "'>" + esc(a.status_label) + "</span></div>" +
          "<div class='tiny truncate'>" + esc(a.task_name || a.role) + "</div>" +
        "</div>" +
        "<div class='dot " + (a.status === "ACTIVE" ? "pulse" : "") + "' style='background:" + a.status_color + "'></div>" +
      "</div>" +
      "<div class='bar'><i style='width:" + (a.progress_percent || 0) + "%;background:" + a.status_color + "'></i></div>" +
      "<div class='row' style='margin-top:7px'><span class='tiny grow truncate'>" +
        esc(a.last_log_line || "no log yet") + "</span><span class='tiny'>" + esc(a.last_log_age_label) + "</span></div>";
    card.onclick = function () { location.hash = "#/agent/" + a.id; };
    return card;
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
      "<div class='kv'><b>Refresh</b><span>pull down or tap ⟳ in the header — the app re-reads office.json</span></div>";
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
    help: screenHelp, files: screenFiles, work: screenWork
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
    else { node = (ROUTES[route] || screenOffice)(); state.tab = ROUTES[route] ? route : "office"; }
    view.innerHTML = "";
    view.appendChild(node);
    paintNav();
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }

  /* ------------------------------------------------------------------ boot */
  function boot(data) {
    DATA = data;
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

/* CENTUM AI Office — pixel office engine (top view), v2 flat floor.
   - Open floor with long tables of 5 seats (A, B, C … as agents are added).
   - Manager room at the bottom: desk, "what the manager is doing" sign,
     power panel, door.
   - Honest lights: LIVE ≤ 20 min, QUIET ≤ 90 min, CLOSED beyond.
     Thresholds are recomputed in the browser from raw timestamps so a
     quiet desk dims without a rebuild.
   - No departments, no rooms, no locked corridor in this version.
   Everything is drawn from app/data/office.json. No images, no secrets, no writes. */
(function () {
  "use strict";

  var W = 240, H = 160;
  var STEP = 110;
  var LIVE_MIN = 20, QUIET_MIN = 90;

  var FONT = {
    "A": "010/101/111/101/101", "B": "110/101/110/101/110", "C": "011/100/100/100/011",
    "D": "110/101/101/101/110", "E": "111/100/110/100/111", "F": "111/100/110/100/100",
    "G": "011/100/101/101/011", "H": "101/101/111/101/101", "I": "111/010/010/010/111",
    "J": "001/001/001/101/010", "K": "101/101/110/101/101", "L": "100/100/100/100/111",
    "M": "101/111/111/101/101", "N": "101/111/111/111/101", "O": "010/101/101/101/010",
    "P": "110/101/110/100/100", "Q": "010/101/101/111/011", "R": "110/101/110/101/101",
    "S": "011/100/010/001/110", "T": "111/010/010/010/010", "U": "101/101/101/101/011",
    "V": "101/101/101/101/010", "W": "101/101/111/111/101", "X": "101/101/010/101/101",
    "Y": "101/101/010/010/010", "Z": "111/001/010/100/111",
    "0": "111/101/101/101/111", "1": "010/110/010/010/111", "2": "110/001/010/100/111",
    "3": "110/001/010/001/110", "4": "101/101/111/001/001", "5": "111/100/110/001/110",
    "6": "011/100/110/101/010", "7": "111/001/010/010/010", "8": "010/101/010/101/010",
    "9": "010/101/011/001/110",
    "-": "000/000/111/000/000", ".": "000/000/000/000/010", ":": "000/010/000/010/000",
    "!": "010/010/010/000/010", "?": "110/001/010/000/010", "/": "001/001/010/100/100",
    "%": "101/001/010/100/101", " ": "000/000/000/000/000", "+": "000/010/111/010/000",
    "*": "101/010/111/010/101", "(": "010/100/100/100/010", ")": "010/001/001/001/010"
  };

  var C = {
    floorA: "#2b3a4d", floorB: "#263447",
    mgrFloorA: "#2d3d52", mgrFloorB: "#273649",
    wall: "#17212e", wallEdge: "#121a25",
    desk: "#8a6a43", deskTop: "#a2804f", deskEdge: "#6d5233",
    chair: "#3a4a60", metal: "#5d6b7c",
    screenOn: "#2fd07a", screenDim: "#1d4a52", screenOff: "#141b24",
    skin: ["#f0c396", "#c98a5b", "#8d5a34", "#5f3a20"],
    hair: ["#2b2b33", "#5a3b22", "#120f13", "#6b6b78"],
    shirt: ["#5b8def", "#e0574f", "#f5b942", "#31c8c8", "#9b6bd6"],
    pant: "#2f3a4c",
    green: "#2fd07a", amber: "#f5b942", red: "#ff5c5c", grey: "#8a94a6", cyan: "#31c8c8",
    night: "#0a1220", star: "#dfe9ff", moon: "#f2f0d8",
    leaf: "#3f9c58", pot: "#8a5a3b",
    paper: "#f2f2ec", paperInk: "#9aa4ae"
  };

  /* ---------- helpers */
  function px(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function text(ctx, str, x, y, col, scale) {
    scale = scale || 1;
    str = String(str).toUpperCase().replace(/&/g, "+").replace(/[^A-Z0-9\-.:!?/%+*() ]/g, "");
    ctx.fillStyle = col;
    for (var i = 0; i < str.length; i++) {
      var glyph = FONT[str[i]] || FONT["?"];
      var rows = glyph.split("/");
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < 3; c++) {
          if (rows[r][c] === "1") ctx.fillRect(x + (i * 4 + c) * scale, y + r * scale, scale, scale);
        }
      }
    }
  }
  function textCenter(ctx, str, cx, y, col, scale) {
    var w = String(str).length * 4 * (scale || 1);
    text(ctx, str, cx - w / 2, y, col, scale);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sleepZ(ctx, x, y, frame, col) {
    for (var i = 0; i < 3; i++) {
      var t = ((frame * 0.5 + i * 0.34) % 1.15);
      var a = (1 - t / 1.15) * 0.95;
      if (a <= 0.05) continue;
      ctx.globalAlpha = a;
      var zx = x + i * 5 + t * 3, zy = y - t * 12;
      var s = i === 0 ? 3 : (i === 1 ? 4 : 5);
      ctx.fillStyle = col;
      ctx.fillRect(zx | 0, zy | 0, s, 1);
      ctx.fillRect((zx + s - 1) | 0, zy | 0, 1, s);
      ctx.fillRect(zx | 0, (zy + s - 1) | 0, s, 1);
    }
    ctx.globalAlpha = 1;
  }
  function bubble(ctx, x, y, ch, col, frame) {
    var bob = Math.sin(frame * 0.7) * 1.2;
    px(ctx, x - 1, (y + bob) | 0, 8, 8, "#0d131c");
    px(ctx, x, (y + bob) | 0, 6, 6, col);
    text(ctx, ch, x + 2, (y + bob + 1) | 0, "#0d131c", 1);
  }
  function plant(ctx, x, y) {
    px(ctx, x + 2, y + 6, 4, 4, C.pot);
    px(ctx, x + 1, y + 3, 6, 3, C.leaf);
    px(ctx, x + 3, y, 2, 3, C.leaf);
    px(ctx, x, y + 4, 3, 2, C.leaf);
    px(ctx, x + 5, y + 4, 3, 2, C.leaf);
  }
  function coffee(ctx, x, y, frame, live) {
    px(ctx, x, y, 9, 11, C.metal);
    px(ctx, x + 1, y + 1, 7, 4, "#25303d");
    px(ctx, x + 3, y + 6, 3, 3, "#f2f2ec");
    if (live && frame % 3 === 0) px(ctx, x + 3, y - 2, 1, 2, "rgba(255,255,255,0.5)");
    if (live && frame % 3 === 1) px(ctx, x + 5, y - 3, 1, 2, "rgba(255,255,255,0.4)");
  }

  /* ---------- 6x10 person sprite (smaller than original to fit 48-pixel desks) */
  function personSmall(ctx, x, y, pose, frame, o) {
    var skin = C.skin[o % C.skin.length], hair = C.hair[(o + 1) % C.hair.length], shirt = C.shirt[o % C.shirt.length];
    if (pose === "sleep") {
      px(ctx, x + 1, y + 7, 6, 3, shirt);
      px(ctx, x + 2, y + 9, 3, 2, C.pant);
      px(ctx, x + 3, y + 3, 3, 4, skin);
      px(ctx, x + 3, y + 2, 3, 1, hair);
      px(ctx, x + 1, y + 8, 1, 1, skin); px(ctx, x + 6, y + 8, 1, 1, skin);
      return;
    }
    if (pose === "stand" || pose === "walk1" || pose === "walk2") {
      px(ctx, x + 2, y + 2, 3, 2, skin);
      px(ctx, x + 2, y + 1, 3, 1, hair);
      px(ctx, x + 2, y + 4, 3, 4, shirt);
      px(ctx, x + 1, y + 4, 1, 3, shirt); px(ctx, x + 5, y + 4, 1, 3, shirt);
      var la = pose === "walk1" ? 2 : 3;
      px(ctx, x + 2, y + 8, 1, la, C.pant);
      px(ctx, x + 4, y + 8, 1, 3, C.pant);
      return;
    }
    /* seated */
    px(ctx, x + 2, y + 1, 3, 2, skin);
    px(ctx, x + 1, y, 4, 2, hair);
    px(ctx, x + 2, y + 3, 3, 4, shirt);
    var ay = frame % 2 === 0 ? 3 : 4;
    px(ctx, x + 1, y + ay, 1, 2, skin);
    px(ctx, x + 5, y + ay, 1, 2, skin);
    px(ctx, x + 2, y + 7, 3, 2, C.pant);
  }

  /* ---------- layout */
  function layout(slotCount) {
    var floor = { x: 1, y: 1, w: 238, h: 112 };
    var mgrRoom = { x: 1, y: 115, w: 238, h: 44 };
    var stations = [];
    var deskW = 44, gap = 2, x0 = 7;
    var tablesNeeded = Math.max(2, Math.ceil(Math.max(5, slotCount) / 5));
    for (var i = 0; i < slotCount; i++) {
      var table = (i / 5) | 0;
      var col = i % 5;
      stations.push({
        x: x0 + col * (deskW + gap), w: deskW,
        y: floor.y + 4 + table * 52, h: 46,
        table: String.fromCharCode(65 + table),
        seat: col + 1
      });
    }
    return { floor: floor, mgrRoom: mgrRoom, stations: stations, tables: tablesNeeded };
  }

  function room(ctx, r, floorA, floorB) {
    px(ctx, r.x, r.y, r.w, r.h, C.wall);
    for (var yy = r.y + 3; yy < r.y + r.h - 3; yy += 6) {
      for (var xx = r.x + 3; xx < r.x + r.w - 3; xx += 6) {
        var odd = (((xx - r.x) / 6) | 0) % 2 === (((yy - r.y) / 6) | 0) % 2;
        px(ctx, xx, yy, 6, 6, odd ? floorA : floorB);
      }
    }
    px(ctx, r.x, r.y + r.h - 3, r.w, 3, C.wallEdge);
  }

  function windows(ctx, lit) {
    for (var i = 0; i < 2; i++) {
      var wx = (i === 0 ? 14 : 206), wy = 2;
      px(ctx, wx - 1, wy, 20, 8, "#3b4a5e");
      px(ctx, wx, wy + 1, 18, 6, C.night);
      px(ctx, wx + 3, wy + 2, 1, 1, C.star); px(ctx, wx + 12, wy + 4, 1, 1, C.star);
      px(ctx, wx + 15, wy + 2, 3, 3, C.moon);
      if (lit) px(ctx, wx, wy + 1, 18, 1, "rgba(255,220,150,0.35)");
    }
  }

  /* ---------- recompute honest light state from raw timestamps (in the browser) */
  function recomputePower(data) {
    var p = data.power || { state: "CLOSED", live_minutes: LIVE_MIN, quiet_minutes: QUIET_MIN };
    var liveMin = p.live_minutes || LIVE_MIN;
    var quietMin = p.quiet_minutes || QUIET_MIN;
    var newest = 0;
    (data.slots || []).forEach(function (s) {
      var ts = s.last_work_ts || s.last_log_time;
      if (!ts) return;
      var ms = Date.parse(ts);
      if (!isNaN(ms) && ms > newest) newest = ms;
    });
    var mgrTs = data.manager_desk && data.manager_desk.last_run ? Date.parse(data.manager_desk.last_run) : 0;
    if (mgrTs > newest) newest = mgrTs;
    if (!newest) {
      p.state = "CLOSED";
      p.newest_activity_label = "never";
      p.minutes = 9999;
      return p;
    }
    var mins = Math.floor((Date.now() - newest) / 60000);
    p.minutes = mins;
    if (mins <= liveMin) p.state = "LIVE";
    else if (mins <= quietMin) p.state = "QUIET";
    else p.state = "CLOSED";
    p.newest_activity_label = mins < 1 ? "just now" : mins < 60 ? mins + " min ago" : Math.floor(mins / 60) + " h ago";
    return p;
  }

  function recomputeDeskLights(slot, power) {
    // "working" requires work evidence: files produced recently OR progress > 0
    // with recent log; "at the desk" (QUIET/lamp on dim) is only heartbeats.
    var minutes = 9999;
    var ts = slot.last_work_ts || slot.last_log_time;
    if (ts) {
      var ms = Date.parse(ts);
      if (!isNaN(ms)) minutes = Math.floor((Date.now() - ms) / 60000);
    }
    var hasEvidence = !!(slot.has_work_evidence || slot.files_produced > 0 || slot.progress_percent > 0);
    var v = slot.visual || (slot.visual = { state: "sleeping_off", tone: "grey", label: "Off duty", efficiency: 0 });
    if (power.state === "CLOSED") {
      v.state = "sleeping_off"; v.tone = "grey"; v.label = "Off duty"; return;
    }
    if (slot.status === "STAGED" || slot.status === "EMPTY" || !slot.occupant) {
      v.state = "sleeping_off"; v.tone = "grey"; v.label = "Asleep"; return;
    }
    if (slot.status === "BLOCKED") {
      v.state = "blocked"; v.tone = "red"; v.label = "Blocked"; return;
    }
    if (slot.status === "REVIEW") {
      v.state = "review"; v.tone = "amber"; v.label = "In review"; return;
    }
    if (minutes <= LIVE_MIN && hasEvidence && slot.status === "ACTIVE") {
      v.state = "working"; v.tone = "green"; v.label = "Working"; return;
    }
    if (minutes <= QUIET_MIN) {
      v.state = "at_risk"; v.tone = "amber"; v.label = "At the desk"; return;
    }
    v.state = minutes > 60 * 6 ? "sleeping_dead" : "sleeping_off";
    v.tone = v.state === "sleeping_dead" ? "red" : "grey";
    v.label = v.state === "sleeping_dead" ? "Stopped - replace" : "Off duty";
  }

  /* ---------- desks */
  function drawStation(ctx, st, slot, frame, power) {
    var x = st.x, y = st.y;
    var visual = slot.visual || {};
    var state = visual.state;
    var closed = power.state === "CLOSED";
    if (closed) state = "sleeping_off";
    var lane = shortLane(slot);
    var lit = !closed && (state === "working" || state === "review" || state === "blocked" || state === "celebrate");
    var lampOff = closed || state === "sleeping_off" || state === "sleeping_dead" || state === "vacant";

    // table letter + seat tag
    px(ctx, x, y + 1, 6, 7, "#1b2532");
    text(ctx, st.table, x + 1, y + 2, "#8a94a6", 1);
    // nameplate
    px(ctx, x + 7, y, 36, 7, "#1b2532");
    textCenter(ctx, lane, x + 25, y + 1, lit ? "#eaf1f8" : "#8a94a6", 1);
    // monitor
    px(ctx, x + 12, y + 9, 18, 11, "#2a3646");
    px(ctx, x + 13, y + 10, 16, 8, lit ? C.screenOn : (closed ? C.screenOff : C.screenDim));
    if (lit) {
      for (var r = 0; r < 3; r++) {
        var lw = 3 + ((r * 5 + frame) % 10);
        px(ctx, x + 14, y + 11 + r * 2 + 1, Math.min(lw, 14), 1, "rgba(6,20,14,0.55)");
      }
    }
    px(ctx, x + 20, y + 20, 2, 2, "#2a3646");
    px(ctx, x + 16, y + 22, 10, 2, "#22303f");
    // desk
    px(ctx, x + 3, y + 25, 38, 6, C.desk);
    px(ctx, x + 3, y + 25, 38, 1, C.deskTop);
    px(ctx, x + 3, y + 30, 38, 1, C.deskEdge);
    if (!lampOff) px(ctx, x + 36, y + 23, 4, 2, "rgba(255,225,170,0.85)");
    var eff = visual.efficiency || 0;
    for (var i = 0; i < 3; i++) {
      var col = visual.tone === "red" ? C.red : visual.tone === "amber" ? C.amber : C.green;
      px(ctx, x + 5 + i * 2, y + 27, 1, 1 + i, i < eff ? col : "#2a3646");
    }
    // occupant
    var cx = x + 12;
    if (closed || state === "sleeping_off" || state === "sleeping_dead") {
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, x + 8, y + 27, "sleep", frame, stationIndex(slot));
      var zCol = state === "sleeping_dead" ? C.red : (closed ? "#5a6678" : C.grey);
      sleepZ(ctx, x + 26, y + 33, frame, zCol);
    } else if (state === "blocked") {
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, x + 1, y + 20, frame % 2 ? "walk1" : "walk2", frame, stationIndex(slot));
      bubble(ctx, x + 27, y + 19, "!", C.red, frame);
    } else if (state === "review") {
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, cx + 1, y + 23, "stand", frame, stationIndex(slot));
      px(ctx, x + 20, y + 29, 5, 5, C.paper);
      px(ctx, x + 21, y + 30, 3, 1, C.paperInk); px(ctx, x + 21, y + 32, 3, 1, C.paperInk);
      bubble(ctx, x + 28, y + 19, "?", C.amber, frame);
    } else if (state === "celebrate") {
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, cx + 1, y + 23, "stand", frame, stationIndex(slot));
      for (var sp = 0; sp < 4; sp++) {
        var sx = x + 6 + ((sp * 9 + frame * 3) % 30), sy = y + 20 - ((frame + sp * 3) % 8);
        px(ctx, sx, sy, 2, 2, sp % 2 ? C.amber : C.cyan);
      }
    } else if (state === "at_risk") {
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, cx + 1, y + 25, frame % 2 ? "sit" : "type1", frame, stationIndex(slot));
      bubble(ctx, x + 28, y + 19, "!", C.amber, frame);
    } else if (state === "vacant") {
      textCenter(ctx, "VACANT", x + 21, y + 35, "#4a5568", 1);
    } else { // working
      px(ctx, x + 9, y + 32, 14, 8, C.chair);
      personSmall(ctx, cx + 1, y + 25, frame % 2 === 0 ? "type1" : "type2", frame, stationIndex(slot));
      if (frame % 3 === 0) px(ctx, x + 30, y + 17, 1, 1, "rgba(255,255,255,0.5)");
    }
    // walk-in
    var since = slot.occupant && slot.occupant.since ? Date.parse(slot.occupant.since) : 0;
    var ageS = (Date.now() - since) / 1000;
    if (!closed && since && ageS < 4 && ageS > 0) {
      var p = Math.min(1, ageS / 3.2);
      var px0 = lerp(120, x + 12, p * p), py0 = lerp(140, y + 25, p < 0.7 ? p * 0.9 : 0.63 + (p - 0.7));
      personSmall(ctx, px0, py0, frame % 2 ? "walk1" : "walk2", frame, stationIndex(slot));
      if (p < 0.98) text(ctx, "NEW", px0 + 1, py0 - 6, C.amber, 1);
    }
  }

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
  function stationIndex(slot) {
    var n = parseInt((slot.id || "agent-01").replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n - 1;
  }

  /* ---------- manager desk (in manager room at bottom) */
  function drawManagerRoom(ctx, L, data, frame, hits, closed) {
    room(ctx, L.mgrRoom, C.mgrFloorA, C.mgrFloorB);
    // "MANAGER ROOM" sign
    px(ctx, 74, L.mgrRoom.y, 92, 10, "#1b2532");
    textCenter(ctx, "MANAGER", 120, L.mgrRoom.y + 2, closed ? "#3c4a5c" : "#cfd9e6", 1);
    // door (right side)
    var dx = 210, dy = L.mgrRoom.y + 10;
    px(ctx, dx, dy, 22, 28, "#0d131c");
    px(ctx, dx + 2, dy + 1, 18, 26, closed ? "#1a2128" : "#2b3a4d");
    px(ctx, dx + 16, dy + 14, 2, 3, C.amber);
    textCenter(ctx, "DOOR", dx + 11, dy + 5, "#5a6678", 1);

    // power panel (left)
    var ppX = 8, ppY = L.mgrRoom.y + 6;
    px(ctx, ppX, ppY, 34, 30, "#1b2532");
    px(ctx, ppX + 2, ppY + 2, 30, 10, "#0d131c");
    var power = data.power || { state: "CLOSED" };
    var led = power.state === "LIVE" ? C.green : (power.state === "QUIET" ? C.amber : C.red);
    if (power.state === "LIVE" || frame % 2 === 0) px(ctx, ppX + 14, ppY + 5, 6, 4, led);
    textCenter(ctx, "POWER", ppX + 17, ppY + 14, "#8a94a6", 1);
    textCenter(ctx, power.state || "CLOSED", ppX + 17, ppY + 22, led, 1);
    hits.rooms.push({ id: "power", x: ppX - 2, y: ppY - 2, w: 38, h: 34 });

    // manager desk + person (middle)
    var mgr = data.manager_desk || {};
    var mX = 70, mY = L.mgrRoom.y + 8;
    px(ctx, mX + 6, mY + 2, 40, 7, "#1b2532");
    textCenter(ctx, "MANAGER", mX + 26, mY + 3, mgr.active && !closed ? "#eaf1f8" : "#8a94a6", 1);
    px(ctx, mX + 14, mY + 11, 18, 11, "#2a3646");
    px(ctx, mX + 15, mY + 12, 16, 8, mgr.active && !closed ? C.screenOn : (closed ? C.screenOff : C.screenDim));
    px(ctx, mX + 22, mY + 22, 2, 2, "#2a3646");
    px(ctx, mX + 6, mY + 25, 34, 7, C.desk);
    px(ctx, mX + 6, mY + 25, 34, 1, C.deskTop);
    px(ctx, mX + 6, mY + 31, 34, 1, C.deskEdge);
    coffee(ctx, mX + 32, mY + 16, frame, mgr.active && !closed);
    if (closed || !mgr.active) {
      px(ctx, mX + 11, mY + 33, 14, 8, C.chair);
      personSmall(ctx, mX + 8, mY + 28, "sleep", frame, 3);
      sleepZ(ctx, mX + 28, mY + 34, frame, C.grey);
    } else {
      personSmall(ctx, mX + 12, mY + 20, frame % 2 ? "type1" : "type2", frame, 3);
    }
    hits.rooms.push({ id: "manager", x: mX, y: mY, w: 48, h: 40 });

    // "what the manager is doing" sign (right of desk, left of door)
    var sx = 126, sy = L.mgrRoom.y + 8;
    px(ctx, sx, sy, 78, 30, "#d9d9d2");
    px(ctx, sx, sy, 78, 1, "#b9b9b0");
    text(ctx, "NOW:", sx + 2, sy + 3, "#2b3a4d", 1);
    var doing = (mgr.next_action || "planning") + "";
    // wrap into ~24 chars
    var words = doing.split(/\s+/);
    var line = "", ly = sy + 10;
    words.forEach(function (w) {
      if ((line + " " + w).trim().length > 18) {
        text(ctx, line.slice(0, 18), sx + 2, ly, "#2b3a4d", 1);
        ly += 6;
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
      if (ly > sy + 24) return;
    });
    if (line && ly <= sy + 24) text(ctx, line.slice(0, 18), sx + 2, ly, "#2b3a4d", 1);
    plant(ctx, 202, L.mgrRoom.y + 28);
  }

  /* ---------- main draw */
  function draw(ctx, data, frame, hits) {
    // Honest-lights recomputation happens on every tick using Date.now() so a
    // quiet desk dims in the browser without a rebuild.
    data.power = recomputePower(data);
    (data.slots || []).forEach(function (s) { recomputeDeskLights(s, data.power); });
    var closed = data.power.state === "CLOSED";

    var slots = data.slots || [];
    var L = layout(slots.length);
    hits.stations = []; hits.rooms = [];

    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, 0, W, H, "#0b121b");

    // --- open floor
    room(ctx, L.floor, C.floorA, C.floorB);
    windows(ctx, !closed);
    // OFFICE sign
    px(ctx, 74, 1, 92, 10, "#1b2532");
    textCenter(ctx, "CENTUM AI", 120, 3, closed ? "#3c4a5c" : "#cfd9e6", 1);

    // Table labels (A, B, C …) at the left edge of each table row
    for (var t = 0; t < L.tables; t++) {
      var ty = L.floor.y + 16 + t * 52;
      px(ctx, 2, ty, 5, 24, "#1b2532");
      textCenter(ctx, String.fromCharCode(65 + t), 4, ty + 15, "#8a94a6", 2);
    }
    plant(ctx, 226, 6);
    plant(ctx, 6, 96);

    // stations
    slots.forEach(function (slot, i) {
      var st = L.stations[i];
      if (!st) return;
      drawStation(ctx, st, slot, frame, data.power);
      hits.stations.push({ id: slot.id, x: st.x, y: st.y, w: st.w, h: st.h });
    });

    // --- manager room
    drawManagerRoom(ctx, L, data, frame, hits, closed);

    // --- closed / quiet overlay
    if (closed) {
      ctx.fillStyle = "rgba(6,10,18,0.55)";
      ctx.fillRect(0, 0, W, H);
      px(ctx, 80, 50, 80, 15, "rgba(9,14,22,0.94)");
      textCenter(ctx, "OFFICE CLOSED", 120, 54, "#9aa7b8", 2);
      if (frame % 4 < 2) textCenter(ctx, "TAP POWER PANEL", 120, 67, C.amber, 1);
      hits.rooms.push({ id: "power", x: 0, y: 0, w: W, h: H });
    } else if (data.power.state === "QUIET") {
      ctx.fillStyle = "rgba(6,10,18,0.22)";
      ctx.fillRect(0, 0, W, H);
    }
    if (!closed) {
      ctx.fillStyle = data.power.state === "LIVE" ? "rgba(255,214,150,0.07)" : "rgba(255,214,150,0.04)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- demo preview */
  var DEMO_TABLE = [
    ["working", "working", "at_risk", "working", "review",
     "working", "celebrate", "working", "blocked", "working"],
    ["working", "working", "working", "working", "at_risk",
     "review", "working", "celebrate", "working", "working"]
  ];
  var DEMO_TONE = { working: "green", at_risk: "amber", blocked: "red", review: "amber", celebrate: "green" };
  var DEMO_LABEL = {
    working: "Working", at_risk: "Quiet - at risk", blocked: "Blocked",
    review: "In review", celebrate: "Approved"
  };
  function demoData(data, frame) {
    var out = JSON.parse(JSON.stringify(data));
    // pad to 10 for demo
    while (out.slots.length < 10) {
      var n = out.slots.length + 1;
      out.slots.push({
        id: "agent-" + (n < 10 ? "0" + n : n), role: "LANE", status: "ACTIVE",
        visual: { state: "working", tone: "green", label: "Working", efficiency: 2 },
        occupant: { id: "demo", generation: 1, since: null },
        last_work_ts: new Date().toISOString(),
        files_produced: 0, progress_percent: 0
      });
    }
    var row = DEMO_TABLE[Math.floor(frame / 55) % DEMO_TABLE.length];
    out.power = { state: "LIVE", newest_activity_label: "just now (preview)", live_minutes: LIVE_MIN, quiet_minutes: QUIET_MIN };
    out.demo = true;
    out.manager_desk = { active: true, last_run: new Date().toISOString(), last_label: "3 min ago", next_action: "reviewing the day's ledgers" };
    out.slots.forEach(function (slot, i) {
      var st = row[i % row.length];
      slot.visual = {
        state: st, tone: DEMO_TONE[st], label: DEMO_LABEL[st],
        efficiency: st === "working" ? (1 + ((frame + i) % 3)) : (st === "celebrate" ? 3 : 1),
        star: i === (Math.floor(frame / 220) % out.slots.length)
      };
      slot.progress_percent = (frame * 2 + i * 23) % 101;
      slot.files_produced = 1 + ((frame / 55 + i) | 0) % 4;
      slot.status = st === "blocked" ? "BLOCKED" : (st === "review" ? "REVIEW" : "ACTIVE");
      slot.has_work_evidence = st !== "sleeping_off";
      slot.last_work_ts = new Date(Date.now() - ((st === "at_risk" ? 30 : 2) * 60000)).toISOString();
      slot.occupant = { id: slot.id, generation: 1, since: null };
    });
    return out;
  }

  function mount(container, data, handlers, options) {
    handlers = handlers || {};
    options = options || {};
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "pixel-canvas";
    canvas.setAttribute("aria-label", "Pixel office view");
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    var wrap = document.createElement("div");
    wrap.className = "pixel-wrap" + (data.power && data.power.state === "CLOSED" ? " is-closed" : "");
    wrap.appendChild(canvas);

    var badge = document.createElement("div");
    badge.className = "pixel-power pixel-power-" + (options.demo ? "DEMO" : (data.power ? data.power.state : "CLOSED"));
    badge.innerHTML = options.demo ? powerBadge({ demo: true }) : powerBadge(data.power);
    wrap.appendChild(badge);
    container.appendChild(wrap);

    var hits = { stations: [], rooms: [] };
    var frame = 0, stopped = false;

    function tick() {
      if (stopped) return;
      frame++;
      var frameData = options.demo ? demoData(data, frame) : data;
      if (options.demo && frame % 4 === 0 && handlers.onDemoTick) handlers.onDemoTick(frameData);
      draw(ctx, frameData, frame, hits);
      // keep badge current as power recomputes
      if (!options.demo) {
        badge.className = "pixel-power pixel-power-" + (frameData.power ? frameData.power.state : "CLOSED");
        badge.innerHTML = powerBadge(frameData.power);
      }
    }
    var timer = setInterval(tick, STEP);
    tick();

    function logical(ev) {
      var r = canvas.getBoundingClientRect();
      var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
      return { x: (cx * W) / r.width, y: (cy * H) / r.height };
    }
    function onClick(ev) {
      var p = logical(ev);
      var hit = null;
      hits.stations.forEach(function (s) {
        if (!hit && p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) hit = { kind: "station", id: s.id };
      });
      if (!hit) {
        for (var i = hits.rooms.length - 1; i >= 0; i--) {
          var r = hits.rooms[i];
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { hit = { kind: "room", id: r.id }; break; }
        }
      }
      if (!hit) return;
      if (hit.kind === "station" && handlers.onDesk) handlers.onDesk(hit.id);
      else if (hit.kind === "room") {
        if (hit.id === "manager" && handlers.onManager) handlers.onManager();
        else if (hit.id === "power" && handlers.onPower) handlers.onPower();
        else if (handlers.onDepartment) handlers.onDepartment(hit.id);
      }
    }
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", function (ev) { ev.preventDefault(); onClick(ev); }, { passive: false });

    return { destroy: function () { stopped = true; clearInterval(timer); } };
  }

  function powerBadge(power) {
    if (!power) return "";
    if (power.demo) return "<b>PREVIEW</b> · example day — not live";
    var s = power.state;
    if (s === "LIVE") return "<b>LIGHTS ON</b> · working now";
    if (s === "QUIET") return "<b>LIGHTS DIM</b> · last activity " + power.newest_activity_label;
    return "<b>LIGHTS OFF</b> · office closed · last activity " + power.newest_activity_label;
  }

  window.CentumPixel = { mount: mount, WIDTH: W, HEIGHT: H };
})();

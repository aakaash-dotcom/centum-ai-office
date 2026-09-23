/* CENTUM AI Office — pixel office engine (top view)
   Draws the office floor as low-res pixel art: rooms, desks, monitors, lights.
   - lights ON when something is alive (power LIVE/QUIET), OFF when the office is closed
   - a working agent types at the desk; a silent agent sleeps (Zzz) so you can see who to restart
   - a stopped agent sleeps in red and its desk offers a replacement (handover)
   - locked departments are dark rooms with padlocked doors
   Everything is drawn from app/data/office.json. No images, no assets, no writes. */
(function () {
  "use strict";

  var W = 240, H = 160;          // logical pixels (canvas internal resolution)
  var STEP = 110;                // frame step in ms (pixel-art cadence)
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
    floorA: "#2b3a4d", floorB: "#263447", wall: "#17212e", wallEdge: "#121a25",
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

  /* ------------------------------------------------------------------ tiny helpers */
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
  function textWidth(str, scale) { return String(str).length * 4 * (scale || 1); }
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
  function padlock(ctx, x, y) {
    px(ctx, x + 1, y, 4, 1, C.metal);
    px(ctx, x, y + 1, 1, 3, C.metal);
    px(ctx, x + 5, y + 1, 1, 3, C.metal);
    px(ctx, x, y + 4, 7, 6, "#c9a227");
    px(ctx, x + 3, y + 6, 1, 3, "#6d5209");
  }
  function person(ctx, x, y, pose, frame, o) {
    // x,y = top-left of the 8x12 sprite box. pose: sit | type1 | type2 | sleep | stand | walk1 | walk2
    var skin = C.skin[o % C.skin.length], hair = C.hair[(o + 1) % C.hair.length], shirt = C.shirt[o % C.shirt.length];
    if (pose === "sleep") {
      // slumped in the chair: head resting on folded arms, fully visible below the desk
      px(ctx, x + 1, y + 8, 8, 4, shirt);          // body
      px(ctx, x + 3, y + 11, 4, 2, C.pant);        // legs
      px(ctx, x + 3, y + 4, 4, 4, skin);           // head on the desk edge
      px(ctx, x + 3, y + 3, 4, 1, hair);
      px(ctx, x + 1, y + 9, 1, 2, skin); px(ctx, x + 8, y + 9, 1, 2, skin);  // arms
      return;
    }
    if (pose === "stand" || pose === "walk1" || pose === "walk2") {
      px(ctx, x + 2, y + 2, 4, 3, skin);
      px(ctx, x + 2, y + 1, 4, 1, hair);
      px(ctx, x + 2, y + 5, 4, 5, shirt);
      px(ctx, x + 1, y + 5, 1, 4, shirt); px(ctx, x + 6, y + 5, 1, 4, shirt);
      var legA = pose === "walk1" ? 2 : (pose === "walk2" ? 3 : 3);
      px(ctx, x + 2, y + 10, 1, legA, C.pant);
      px(ctx, x + 5, y + 10, 1, 4, C.pant);
      return;
    }
    // seated
    px(ctx, x + 2, y + 1, 4, 3, skin);
    px(ctx, x + 1, y, 6, 2, hair);
    px(ctx, x + 2, y + 4, 4, 5, shirt);
    var armY = frame % 2 === 0 ? 4 : 5;
    px(ctx, x + 1, y + armY, 1, 3, skin);          // arms reach the keyboard
    px(ctx, x + 6, y + armY, 1, 3, skin);
    px(ctx, x + 2, y + 9, 4, 2, C.pant);
  }

  /* ------------------------------------------------------------------ layout */
  function layout() {
    var harvest = { x: 1, y: 1, w: 238, h: 100 };
    var lobby = { x: 1, y: 103, w: 148, h: 55 };
    var corridor = { x: 151, y: 103, w: 88, h: 55 };
    var stations = [];
    var deskW = 42, gap = 3, x0 = 9, y = 0;
    for (var i = 0; i < 5; i++) {
      stations.push({ x: x0 + i * (deskW + gap), w: deskW, y: harvest.y + 2, h: 92 });
    }
    return { harvest: harvest, lobby: lobby, corridor: corridor, stations: stations };
  }

  function room(ctx, r, floorA, floorB) {
    px(ctx, r.x, r.y, r.w, r.h, C.wall);
    // checker floor
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
      if (lit) { px(ctx, wx, wy + 1, 18, 1, "rgba(255,220,150,0.35)"); }
    }
  }

  function plant(ctx, x, y) {
    px(ctx, x + 2, y + 6, 4, 4, C.pot);
    px(ctx, x + 1, y + 3, 6, 3, C.leaf);
    px(ctx, x + 3, y, 2, 3, C.leaf);
    px(ctx, x, y + 4, 3, 2, C.leaf);
    px(ctx, x + 5, y + 4, 3, 2, C.leaf);
  }

  function whiteboard(ctx, x, y) {
    px(ctx, x, y, 30, 16, "#d9d9d2");
    px(ctx, x, y, 30, 1, "#b9b9b0");
    text(ctx, "PLAN", x + 3, y + 4, "#2b3a4d", 1);
    px(ctx, x + 2, y + 10, 16, 1, "#8a94a6");
    px(ctx, x + 2, y + 12, 10, 1, "#8a94a6");
  }

  function coffee(ctx, x, y, frame, live) {
    px(ctx, x, y, 9, 11, C.metal);
    px(ctx, x + 1, y + 1, 7, 4, "#25303d");
    px(ctx, x + 3, y + 6, 3, 3, "#f2f2ec");
    if (live && frame % 3 === 0) { px(ctx, x + 3, y - 2, 1, 2, "rgba(255,255,255,0.5)"); }
    if (live && frame % 3 === 1) { px(ctx, x + 5, y - 3, 1, 2, "rgba(255,255,255,0.4)"); }
  }

  function exitSign(ctx, open) {
    px(ctx, 205, 4, 28, 9, open ? "#123a24" : "#3a1212");
    textCenter(ctx, open ? "OPEN" : "CLOSED", 219, 6, open ? C.green : C.red, 1);
  }

  /* ------------------------------------------------------------------ desks */
  function drawStation(ctx, st, slot, frame, power, t) {
    var x = st.x;
    var visual = slot.visual || { state: "vacant", tone: "grey", label: "Vacant", efficiency: 0 };
    var state = visual.state;
    var closed = power.state === "CLOSED";
    if (closed) state = "sleeping_off";
    var name = (slot.role || slot.id || "").split(" ")[0] || slot.id;
    var lane = shortLane(slot);
    var lit = !closed && (state === "working" || state === "review" || state === "blocked" || state === "celebrate");
    var lampOff = closed || state === "sleeping_off" || state === "sleeping_dead" || state === "vacant";

    // nameplate (lane) ---------------------------------------------------
    px(ctx, x + 6, 15, 30, 8, "#1b2532");
    if (visual.star && !closed) text(ctx, "*", x + 7, 16, C.amber, 1);
    textCenter(ctx, lane, x + 21 + (visual.star && !closed ? 2 : 0), 17, lit ? "#eaf1f8" : "#8a94a6", 1);

    // progress bar (only while working) ---------------------------------
    if (state === "working" && !closed) {
      var pct = Math.max(0, Math.min(100, slot.progress_percent || 0));
      px(ctx, x + 8, 25, 26, 3, "#0d131c");
      px(ctx, x + 9, 26, Math.max(1, Math.round(26 * pct / 100) - 1), 1, C.green);
    }

    // monitor -------------------------------------------------------------
    px(ctx, x + 12, 29, 18, 13, "#2a3646");
    px(ctx, x + 13, 30, 16, 10, lit ? C.screenOn : (closed ? C.screenOff : C.screenDim));
    if (lit) {
      for (var r = 0; r < 4; r++) {
        var w = 3 + ((r * 5 + frame) % 11);
        px(ctx, x + 14, 31 + r * 2 + 1, Math.min(w, 14), 1, "rgba(6,20,14,0.55)");
      }
    }
    px(ctx, x + 20, 42, 2, 3, "#2a3646");
    px(ctx, x + 16, 45, 10, 2, "#22303f");

    // desk ----------------------------------------------------------------
    px(ctx, x + 4, 48, 34, 8, C.desk);
    px(ctx, x + 4, 48, 34, 2, C.deskTop);
    px(ctx, x + 4, 54, 34, 2, C.deskEdge);
    px(ctx, x + 14, 50, 14, 3, "#d9d9d2");
    px(ctx, x + 38, 49, 2, 6, "#2a3646");
    if (!lampOff) px(ctx, x + 37, 47, 4, 2, "rgba(255,225,170,0.85)");
    var eff = visual.efficiency || 0;
    for (var i = 0; i < 3; i++) {
      var col = (visual.tone === "red" ? C.red : visual.tone === "amber" ? C.amber : C.green);
      px(ctx, x + 35 + i * 2, 52 - (i * 2), 1, 1 + i * 2, i < eff ? col : "#2a3646");
    }

    // occupant ------------------------------------------------------------
    var cx = x + 12;
    if (closed || state === "sleeping_off" || state === "sleeping_dead") {
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, x + 6, 54, "sleep", frame, stationIndex(slot));
      var zCol = state === "sleeping_dead" ? C.red : (closed ? "#5a6678" : C.grey);
      sleepZ(ctx, x + 25, 57, frame, zCol);
    } else if (state === "blocked") {
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, x + 1, 41, frame % 2 ? "walk1" : "walk2", frame, stationIndex(slot));
      bubble(ctx, x + 27, 38, "!", C.red, frame);
    } else if (state === "review") {
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, cx + 1, 42, "stand", frame, stationIndex(slot));
      px(ctx, x + 20, 52, 5, 7, C.paper);
      px(ctx, x + 21, 54, 3, 1, C.paperInk); px(ctx, x + 21, 56, 3, 1, C.paperInk);
      bubble(ctx, x + 28, 38, "?", C.amber, frame);
    } else if (state === "celebrate") {
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, cx + 1, 42, "stand", frame, stationIndex(slot));
      for (var sp = 0; sp < 4; sp++) {
        var sx = x + 6 + ((sp * 9 + frame * 3) % 30), sy = 44 - ((frame + sp * 3) % 9);
        px(ctx, sx, sy, 2, 2, sp % 2 ? C.amber : C.cyan);
      }
    } else if (state === "at_risk") {
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, cx + 1, 44, frame % 2 ? "sit" : "type1", frame, stationIndex(slot));
      bubble(ctx, x + 28, 38, "!", C.amber, frame);
    } else if (state === "vacant") {
      textCenter(ctx, "VACANT", x + 21, 65, "#4a5568", 1);
    } else {  // working
      px(ctx, x + 9, 57, 14, 9, C.chair);
      person(ctx, cx + 1, 44, frame % 2 === 0 ? "type1" : "type2", frame, stationIndex(slot));
      if (frame % 3 === 0) px(ctx, x + 30, 36, 1, 1, "rgba(255,255,255,0.5)");
    }

    // walk-in animation for a freshly replaced occupant
    var since = slot.occupant && slot.occupant.since ? Date.parse(slot.occupant.since) : 0;
    var ageS = (Date.now() - since) / 1000;
    if (!closed && since && ageS < 4 && ageS > 0) {
      var p = Math.min(1, ageS / 3.2);
      var fromX = 96, fromY = 144, toX = x + 12, toY = 44;
      var px0 = lerp(fromX, toX, p * p), py0 = lerp(fromY, toY, p < 0.7 ? p * 0.9 : 0.63 + (p - 0.7));
      // clear a halo then draw the walker
      px(ctx, px0 - 2, py0 - 2, 12, 16, "rgba(20,28,38,0.0)");
      person(ctx, px0, py0, frame % 2 ? "walk1" : "walk2", frame, stationIndex(slot));
      if (p < 0.98) text(ctx, "NEW", px0 + 1, py0 - 6, C.amber, 1);
    }
  }

  function shortLane(slot) {
    var r = (slot.role || "").toUpperCase();
    if (r.indexOf("PYQ") === 0) return "PYQ";
    if (r.indexOf("MODEL") === 0) return "MODEL";
    if (r.indexOf("ONEWORD") === 0) return "QBANK";
    if (r.indexOf("FACTORY") === 0) return "FACTORY";
    if (r.indexOf("QA") === 0) return "QA";
    return (slot.id || "").replace("agent-", "AG").toUpperCase();
  }
  function stationIndex(slot) {
    var n = parseInt((slot.id || "agent-01").replace(/\D/g, ""), 10);
    return isNaN(n) ? 0 : n - 1;
  }

  /* ------------------------------------------------------------------ main draw */
  function draw(ctx, data, frame, hits) {
    var L = layout();
    var power = data.power || { state: "CLOSED" };
    var closed = power.state === "CLOSED";
    hits.stations = []; hits.rooms = [];

    ctx.clearRect(0, 0, W, H);
    px(ctx, 0, 0, W, H, "#0b121b");

    // --- harvest room
    room(ctx, L.harvest, C.floorA, C.floorB);
    windows(ctx, !closed);
    // room sign, centred on the top wall (windows sit either side)
    px(ctx, 74, 1, 92, 13, "#1b2532");
    px(ctx, 74, 1, 92, 2, "#2a3646");
    textCenter(ctx, "HARVEST", 120, 4, closed ? "#3c4a5c" : "#cfd9e6", 2);
    whiteboard(ctx, 4, 80);
    plant(ctx, 222, 78);

    // --- lobby
    room(ctx, L.lobby, "#293749", "#243141");
    exitSign(ctx, !closed);
    var doorX = 66, doorY = 149;
    px(ctx, doorX, doorY, 26, 8, "#0d131c");
    px(ctx, doorX + 2, doorY + 1, 22, 6, closed ? "#1a2128" : "#2b3a4d");
    px(ctx, doorX + 20, doorY + 2, 3, 5, C.amber);
    textCenter(ctx, closed ? "ENTRANCE SHUT" : "WELCOME", doorX + 13, 139, closed ? "#5a6678" : "#8a94a6", 1);
    text(ctx, "LOBBY", 8, 106, "#4a5568", 1);
    plant(ctx, 132, 148);

    // power panel (the office's heart)
    var ppX = 108, ppY = 112;
    px(ctx, ppX, ppY, 22, 26, "#1b2532");
    px(ctx, ppX + 2, ppY + 2, 18, 10, "#0d131c");
    var led = power.state === "LIVE" ? C.green : (power.state === "QUIET" ? C.amber : C.red);
    if (power.state === "LIVE" || frame % 2 === 0) px(ctx, ppX + 8, ppY + 5, 6, 4, led);
    textCenter(ctx, "POWER", ppX + 11, ppY + 14, "#8a94a6", 1);
    textCenter(ctx, power.state, ppX + 11, ppY + 21, led, 1);
    hits.rooms.push({ id: "power", x: ppX - 2, y: ppY - 2, w: 26, h: 30 });

    // manager desk (manager run freshness)
    var mgr = data.manager_desk || {};
    var mX = 12, mY = 105;
    px(ctx, mX + 6, mY + 2, 40, 8, "#1b2532");
    textCenter(ctx, "MANAGER", mX + 26, mY + 4, mgr.active && !closed ? "#eaf1f8" : "#8a94a6", 1);
    px(ctx, mX + 14, mY + 13, 18, 12, "#2a3646");
    px(ctx, mX + 15, mY + 14, 16, 9, mgr.active && !closed ? C.screenOn : (closed ? C.screenOff : C.screenDim));
    px(ctx, mX + 22, mY + 25, 2, 2, "#2a3646");
    px(ctx, mX + 6, mY + 29, 34, 8, C.desk);
    px(ctx, mX + 6, mY + 29, 34, 2, C.deskTop);
    px(ctx, mX + 6, mY + 35, 34, 2, C.deskEdge);
    if (closed || !mgr.active) {
      px(ctx, mX + 11, mY + 39, 14, 9, C.chair);
      person(ctx, mX + 8, mY + 36, "sleep", frame, 3);
      sleepZ(ctx, mX + 28, mY + 42, frame, C.grey);
    } else {
      person(ctx, mX + 12, mY + 22, frame % 2 ? "type1" : "type2", frame, 3);
    }
    hits.rooms.push({ id: "manager", x: mX, y: mY, w: 48, h: 54 });

    // --- locked corridor (departments waiting to open)
    room(ctx, L.corridor, "#1d2734", "#1a2330");
    text(ctx, "NEXT ROOMS", 160, 108, "#3c4a5c", 1);
    data.registryLocks.forEach(function (d, i) {
      var dx = 158, dy = 120 + i * 20;
      px(ctx, dx, dy, 74, 18, d.status === "EXTERNAL" ? "#1b2b3a" : "#101823");
      px(ctx, dx, dy, 74, 2, "#2a3646");
      text(ctx, d.name.toUpperCase().slice(0, 12), dx + 3, dy + 6, d.status === "EXTERNAL" ? "#9dbcff" : "#5a6678", 1);
      padlock(ctx, dx + 64, dy + 4);
      hits.rooms.push({ id: d.id, x: dx - 2, y: dy - 2, w: 78, h: 22 });
    });

    // --- stations
    data.slots.forEach(function (slot, i) {
      var st = L.stations[i];
      if (!st) return;
      drawStation(ctx, st, slot, frame, power, null);
      hits.stations.push({ id: slot.id, x: st.x, y: st.y, w: st.w, h: st.h });
    });

    // --- closed-office night pass
    if (closed) {
      ctx.fillStyle = "rgba(6,10,18,0.55)";      // dark, but the sleeping agents stay readable
      ctx.fillRect(0, 0, W, H);
      px(ctx, 92, 70, 56, 15, "rgba(9,14,22,0.94)");
      textCenter(ctx, "OFFICE CLOSED", 120, 74, "#9aa7b8", 2);
      if (frame % 4 < 2) textCenter(ctx, "TAP THE POWER PANEL", 120, 89, C.amber, 1);
      hits.rooms.push({ id: "power", x: 0, y: 0, w: W, h: H });
    } else if (power.state === "QUIET") {
      ctx.fillStyle = "rgba(6,10,18,0.22)";
      ctx.fillRect(0, 0, W, H);
    }

    // --- warm room light
    if (!closed) {
      ctx.fillStyle = power.state === "LIVE" ? "rgba(255,214,150,0.07)" : "rgba(255,214,150,0.04)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------------ mount */
  function mount(container, data, handlers) {
    handlers = handlers || {};
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
    badge.className = "pixel-power pixel-power-" + (data.power ? data.power.state : "CLOSED");
    badge.innerHTML = powerBadge(data.power);
    wrap.appendChild(badge);
    container.appendChild(wrap);

    var hits = { stations: [], rooms: [] };
    var frame = 0, stopped = false;

    function tick() {
      if (stopped) return;
      frame++;
      draw(ctx, data, frame, hits);
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
        // rooms are tested last-on-top: iterate in reverse
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
    var s = power.state;
    if (s === "LIVE") return "<b>LIGHTS ON</b> · working now";
    if (s === "QUIET") return "<b>LIGHTS DIM</b> · last activity " + power.newest_activity_label;
    return "<b>LIGHTS OFF</b> · office closed · last activity " + power.newest_activity_label;
  }

  window.CentumPixel = { mount: mount, WIDTH: W, HEIGHT: H };
})();

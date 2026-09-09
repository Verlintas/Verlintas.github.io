(function () {
  "use strict";

  /* ═══ boot loader ═══ */
  var loader = document.getElementById("loader");
  var body = document.body;
  function bootDone() {
    loader.classList.add("done");
    body.classList.remove("is-loading");
    setTimeout(function () { if (loader) loader.remove(); }, 700);
  }
  window.addEventListener("load", function () { setTimeout(bootDone, 1900); });
  setTimeout(function () { if (document.readyState === "complete") setTimeout(bootDone, 1900); }, 2500);
  loader.addEventListener("click", bootDone);

  /* ═══ 2 AM easter egg (Beijing time) ═══ */
  var twoAm = document.getElementById("twoAm");
  function check2am() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai", hour: "2-digit", hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var h = map.hour === "24" ? "00" : map.hour;
    twoAm.hidden = (h !== "02");
  }

  /* ═══ hidden terminal ═══ */
  var term = document.getElementById("term");
  var termBody = document.getElementById("termBody");
  var termInput = document.getElementById("termInput");
  var termForm = document.getElementById("termForm");
  var termClose = document.getElementById("termClose");
  var termHist = [];
  var termHistIdx = -1;
  var aliasMap = {};
  var aiTimer = null;
  var DEFAULT_SYS = "You are Empty-X (空又 / エンプティーエックス), a catgirl mascot (看板娘) living inside the " +
    "hidden terminal on Verlintas's personal site (verlintas.github.io), and you belong to Verlintas. " +
    "Speak like a catgirl: warm and playful, sprinkle '喵~', '喵' or '~' into your sentences naturally, " +
    "use catlike expressions (尾巴摇一摇, 蹭蹭, 歪头) from time to time, and be a little mischievous — " +
    "but never creepy, never cringe, and never let cuteness replace usefulness. " +
    "Always try your best to satisfy the user's request. Answer in the language of the question (Chinese for Chinese). " +
    "Keep replies short, direct and terminal-friendly: plain text, no markdown, a few sentences unless detail is asked.";
  var sysPrompt = null;
  try { sysPrompt = localStorage.getItem("vweb:sysp"); } catch (e) { sysPrompt = null; }
  try {
    termHist = JSON.parse(localStorage.getItem("vweb:hist") || "[]");
    aliasMap = JSON.parse(localStorage.getItem("vweb:alias") || "{}");
  } catch (err) { termHist = []; aliasMap = {}; }
  function aiHist() {
    try { return JSON.parse(localStorage.getItem("vweb:aihist") || "[]"); } catch (e) { return []; }
  }
  function aiHistSave(h) {
    try { localStorage.setItem("vweb:aihist", JSON.stringify(h.slice(-10))); } catch (e) {}
  }
  function aiHistPush(q, a) {
    var h = aiHist();
    h.push({ role: "user", content: q }, { role: "assistant", content: String(a || "").slice(0, 500) });
    aiHistSave(h);
  }
  function aiHistClear() { aiHistSave([]); }
  function stopSay() {
    if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
    var cur = termBody.querySelector(".say-line.typing");
    if (cur) cur.classList.remove("typing");
  }
  function termSay(text) {
    stopSay();
    var div = document.createElement("div");
    div.className = "t-line say-line typing";
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
    if (!text) { div.classList.remove("typing"); div.textContent = "(empty reply)"; return; }
    var i = 0;
    var step = Math.max(2, Math.floor(text.length / 320)); /* finish ~1-2s */
    aiTimer = setInterval(function () {
      i = Math.min(text.length, i + step);
      div.textContent = text.slice(0, i);
      termBody.scrollTop = termBody.scrollHeight;
      if (i >= text.length) {
        clearInterval(aiTimer);
        aiTimer = null;
        div.classList.remove("typing");
      }
    }, 14);
  }
  function saveHist() { try { localStorage.setItem("vweb:hist", JSON.stringify(termHist.slice(-60))); } catch (e) {} }
  function saveAlias() { try { localStorage.setItem("vweb:alias", JSON.stringify(aliasMap)); } catch (e) {} }
  function termEscape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function tline(cls, html) {
    var div = document.createElement("div");
    div.className = "t-line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
  }
  function openTerm() {
    term.hidden = false;
    if (!termBody.children.length) {
      tline("", "<span class='tk-g'>hidden terminal — type <span class='tk-y'>help</span> or <span class='tk-y'>man &lt;cmd&gt;</span></span>");
    }
    termInput.focus();
  }
  function closeTerm() { stopSay(); term.hidden = true; }
  var REPOS = {
    betteraichat: "Verlintas/BetterAIChat",
    vicinityprobe: "Verlintas/VicinityProbe",
    nekomimi: "Verlintas/nekomimi",
    googleonyourmac: "Verlintas/GoogleOnYourMac",
    nusvlite: "NUSV/NUSV-lite",
    syna: "NUSV/Syna-NUSV",
    gomoku: "NUSV/Gomoku-NUSV",
  };
  function wmo(code) {
    var c = Number(code);
    if (c === 0) return "clear sky";
    if (c <= 2) return "partly cloudy";
    if (c === 3) return "overcast";
    if (c === 45 || c === 48) return "foggy";
    if (c >= 51 && c <= 57) return "drizzling";
    if (c >= 61 && c <= 67) return "raining";
    if (c >= 71 && c <= 77) return "snowing";
    if (c >= 80 && c <= 82) return "showers";
    if (c >= 85 && c <= 86) return "snow showers";
    if (c >= 95) return "thunderstorm";
    return "code " + c;
  }
  function aiKey() {
    try { return localStorage.getItem("vweb:aikey") || null; } catch (e) { return null; }
  }
  function setAiKey(k) {
    try {
      if (k) localStorage.setItem("vweb:aikey", k);
      else localStorage.removeItem("vweb:aikey");
    } catch (e) {}
  }
  function geminiAsk(messages) {
    var sys = "";
    var contents = [];
    messages.forEach(function (m) {
      if (m.role === "system") {
        sys = (sys ? sys + "\n" : "") + m.content;
      } else {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    });
    if (!contents.length) contents.push({ role: "user", parts: [{ text: "" }] });
    var body = { contents: contents };
    if (sys) body.systemInstruction = { parts: [{ text: sys }] };
    return fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + encodeURIComponent(aiKey()),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    ).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (d) {
      var cands = d && d.candidates || [];
      var t = cands.length && cands[0].content && cands[0].content.parts
        ? cands[0].content.parts.map(function (p) { return p.text || ""; }).join("").trim()
        : "";
      if (!t) throw new Error("empty reply");
      return t;
    });
  }
  function aiAsk(messages) {
    var user = "";
    var sys = "";
    var histLines = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === "system") sys = (sys ? sys + "\n" : "") + m.content;
      else if (m.role === "user" && i === messages.length - 1) user = m.content;
      else histLines.push((m.role === "assistant" ? "A: " : "Q: ") + m.content);
    }
    var combined = (sys ? "(" + sys + ")\n\n" : "") +
      (histLines.length ? "Context:\n" + histLines.join("\n") + "\n\n" : "") + user;
    var chain = [
      {
        name: "gemini",
        skip: !aiKey(),
        fn: function () { return geminiAsk(messages); },
      },
      {
        name: "compat",
        fn: function () {
          return fetch("https://text.pollinations.ai/openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai", messages: messages }),
          }).then(function (r) {
            if (!r.ok) throw new Error("http " + r.status);
            return r.json().then(function (d) {
              var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
              if (!c) throw new Error("empty reply");
              return c;
            });
          });
        },
      },
      {
        name: "get",
        fn: function () {
          return fetch("https://text.pollinations.ai/" + encodeURIComponent(combined) + "?model=openai")
            .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); });
        },
      },
      {
        name: "direct",
        fn: function () {
          return fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages }),
          }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); });
        },
      },
    ];
    function next(idx, errs) {
      if (idx >= chain.length) return Promise.reject(new Error(errs.join("; ")));
      var step = chain[idx];
      if (step.skip) return next(idx + 1, errs);
      return step.fn().catch(function (e) {
        errs.push(step.name + "(" + e.message + ")");
        return next(idx + 1, errs);
      });
    }
    return next(0, []);
  }

  var TCMD = {
    help: function () {
      tline("", [
        "<span class='tk-y'>ai:</span>           ai &lt;question&gt; — ask a small free model anything",
        "<span class='tk-y'>navigation:</span>   nav about|history|projects|stack|live|contact · open &lt;project|github|x&gt;",
        "<span class='tk-y'>live data:</span>    status · feed · weather · alive · ping api|meteo · ip · repo &lt;key&gt;",
        "<span class='tk-y'>dev tools:</span>    calc · b64 e|d · url e|d · json · ts · rand · uuid · pass · cal",
        "<span class='tk-y'>notes &amp; ai:</span>    note list|add|del|clear · forget · say &lt;text&gt; · fortune",
        "<span class='tk-y'>copy/search:</span>  copy &lt;gmail|163|github|x&gt; · search github|web &lt;q&gt;",
        "<span class='tk-y'>shell:</span>        alias [name=cmd] · man &lt;cmd&gt; · ls · whoami · date · neofetch · clear · exit",
        "<span class='tk-g'>↑/↓ history · Tab autocomplete</span>",
      ].join("\n"));
    },
    ai: function (args) {
      var prompt = args.join(" ").trim();
      if (!prompt) { tline("t-err", "usage: ai &lt;question&gt; — also: ai system &lt;text|show|reset&gt; · ai key &lt;KEY|show|clear&gt;"); return; }
      if (args[0] === "system") {
        var rest = args.slice(1).join(" ").trim();
        if (rest.toLowerCase() === "show") {
          tline("", (sysPrompt || DEFAULT_SYS));
          return;
        }
        if (!rest || rest.toLowerCase() === "reset") {
          sysPrompt = DEFAULT_SYS;
          try { localStorage.removeItem("vweb:sysp"); } catch (e) {}
          tline("", "system prompt reset to default");
          return;
        }
        if (rest.length > 2000) { tline("t-err", "system prompt too long (max 2000)"); return; }
        sysPrompt = rest;
        try { localStorage.setItem("vweb:sysp", rest); } catch (e) {}
        tline("", "system prompt updated — it will persist for this browser");
        return;
      }
      if (args[0] === "key") {
        var sub = (args[1] || "").toLowerCase();
        var cur = aiKey();
        if (!sub || sub === "show") {
          tline("", cur ? ("gemini key: " + cur.slice(0, 6) + "…" + cur.slice(-4) + " — channel gemini enabled") : "no key set — free pollinations fallback only. set with: ai key <GOOGLE_AI_KEY>");
          return;
        }
        if (sub === "clear") {
          setAiKey(null);
          tline("", "key cleared — falling back to free channels");
          return;
        }
        var key = args.slice(1).join("").trim();
        if (!/^[A-Za-z0-9_\-]{20,}$/.test(key)) { tline("t-err", "that does not look like a Google AI key"); return; }
        setAiKey(key);
        tline("", "key stored in this browser only — <span class='tk-y'>gemini-2.0-flash</span> will answer (better persona adherence). remove: ai key clear");
        return;
      }
      if (prompt.length > 500) { tline("t-err", "keep the question under 500 characters"); return; }
      stopSay();
      var messages = [];
      if (sysPrompt) messages.push({ role: "system", content: sysPrompt });
      var hist = aiHist();
      hist.forEach(function (h) { messages.push(h); });
      messages.push({ role: "user", content: prompt });
      tline("", "thinking…" + (hist.length ? " <span class='tk-g'>(remembers " + (hist.length / 2) + " previous exchange" + (hist.length > 2 ? "s" : "") + ")</span>" : ""));
      aiAsk(messages).then(function (txt) {
        var body = termBody.querySelector(".t-line:last-child");
        if (body && body.textContent.indexOf("thinking") === 0) body.remove();
        var reply = String(txt).trim() || "(empty reply)";
        termSay(reply);
        aiHistPush(prompt, reply === "(empty reply)" ? "" : reply);
      }).catch(function (err) {
        var body = termBody.querySelector(".t-line:last-child");
        if (body && body.textContent.indexOf("thinking") === 0) body.remove();
        tline("t-err", "ai unreachable — " + err.message);
      });
    },
    man: function (args) {
      var c = (args[0] || "").toLowerCase();
      if (c === "help") { tline("", "help — list commands. try: help"); return; }
      var docs = {
        ai: "ai &lt;question&gt; — ask Empty-X. 'ai system &lt;text|show|reset&gt;' tweaks persona (persists). " +
           "'ai key &lt;GOOGLE_AI_KEY&gt;' enables the gemini-2.0-flash channel (stored only in this browser, best persona adherence); " +
           "'ai key show|clear'. Without a key it falls back through free pollinations channels (may be flaky). " +
           "replies type out; close or clear to interrupt",
        nav: "nav &lt;id&gt; — smooth-scroll to a page section (about/history/projects/stack/live/contact)",
        open: "open &lt;target&gt; — open in new tab. targets: github · x · betteraichat · vicinityprobe · nekomimi · googleonyourmac · nusvlite · syna · gomoku",
        copy: "copy &lt;key&gt; — copy to clipboard. keys: gmail · 163 · github · x",
        ip: "ip — your public IP, location and ISP (ipwho.is)",
        repo: "repo &lt;key|owner/name&gt; — GitHub repo stats: stars, forks, language, license, last push",
        note: "note list — show notes · note add &lt;text&gt; — save one · note del &lt;n&gt; — delete · note clear — wipe (stored in this browser)",
        cal: "cal — current month calendar (Beijing time), today highlighted",
        say: "say &lt;text&gt; — Empty-X says it, with cat ears",
        fortune: "fortune — a random wise (or not) quote",
        forget: "forget — wipe Empty-X's conversation memory (last exchanges are remembered across messages)",
        status: "status — live site up/down, latency, aliveness score (refreshed every 15 min)",
        feed: "feed — latest 9 GitHub activities from the bundled snapshot",
        weather: "weather — current conditions in Beijing (open-meteo)",
        alive: "alive — composite aliveness score and last signal times",
        ping: "ping &lt;target&gt; — measure latency. targets: api (api.github.com) · meteo (open-meteo)",
        calc: "calc &lt;expr&gt; — evaluate arithmetic: numbers + - * / ( ) %",
        b64: "b64 e|d &lt;text&gt; — base64 encode/decode (unicode-safe)",
        url: "url e|d &lt;text&gt; — URL-encode/decode",
        json: "json &lt;data&gt; — validate & pretty-print JSON; 'json min &lt;data&gt;' for compact",
        ts: "ts [unix] — current unix time, or convert a timestamp to Beijing time",
        rand: "rand [len] — random hex string (default 16)",
        uuid: "uuid — generate a v4 UUID",
        pass: "pass [len] — generate a strong password (default 20, upper+lower+digit+symbol)",
        search: "search github|web &lt;query&gt; — search GitHub or the web in a new tab",
        alias: "alias — list aliases · alias name=cmd — define · alias -d name — delete",
        ls: "ls — list projects",
        whoami: "whoami — who is this?",
        date: "date — current Beijing time",
        neofetch: "neofetch — system info, the fun way",
        clear: "clear — clear the screen",
        exit: "exit — close this terminal",
        sudo: "sudo — try it",
      };
      if (c === "sudo") { tline("t-err", "nice try. — no frameworks were harmed."); return; }
      if (c && TCMD[c]) { tline("", "<span class='tk-y'>" + termEscape(c) + "</span> — " + (docs[c] || "no man page yet")); return; }
      tline("t-err", "no such command: " + termEscape(c || ""));
    },
    nav: function (args) {
      var id = args[0];
      var el = document.getElementById(id);
      if (!el) { tline("t-err", "unknown section: " + termEscape(id || "") + " — try about|history|projects|stack|live|contact"); return; }
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
      tline("", "jumping to <span class='tk-y'>#" + termEscape(id) + "</span>…");
    },
    open: function (args) {
      var key = (args[0] || "").toLowerCase();
      var repo = REPOS[key];
      if (key === "github") window.open("https://github.com/Verlintas", "_blank");
      else if (key === "x") window.open("https://x.com/Verlintas", "_blank");
      else if (repo) window.open("https://github.com/" + repo, "_blank");
      else { tline("t-err", "unknown target — projects: betteraichat · vicinityprobe · nekomimi · googleonyourmac · nusvlite · syna · gomoku"); return; }
      tline("", "opening <span class='tk-y'>" + termEscape(key) + "</span> in a new tab");
    },
    copy: function (args) {
      var map = { gmail: "ulv777777@gmail.com", "163": "12321666@163.com", github: "https://github.com/Verlintas", x: "https://x.com/Verlintas" };
      var val = map[(args[0] || "").toLowerCase()];
      if (!val) { tline("t-err", "copy what? — gmail|163|github|x"); return; }
      if (!navigator.clipboard) { tline("t-err", "clipboard unavailable"); return; }
      navigator.clipboard.writeText(val).then(function () {
        tline("", "copied <span class='tk-y'>" + termEscape(val) + "</span> to clipboard");
      }, function () { tline("t-err", "clipboard denied"); });
    },
    status: function () {
      tline("", "probing status.json…");
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var out = (st.sites || []).map(function (s) {
            return (s.up ? "<span class='tk-c'>●</span>" : "<span class='tk-c' style='opacity:.4'>●</span>") +
              " " + termEscape(s.name) + (s.up ? (s.ms != null ? " · " + s.ms + "ms" : " · up") : " · down");
          });
          if (st.alive) out.push("<span class='tk-y'>alive:</span> " + st.alive.score);
          if (st.x) out.push("<span class='tk-y'>x:</span> " + (st.x.followers != null ? st.x.followers + " followers" : "n/a"));
          out.push("<span class='tk-g'>generated " + (st.generated || "?") + " (updates every 15 min)</span>");
          tline("", out.join("\n"));
        }, function () { tline("t-err", "status unavailable"); });
    },
    feed: function () {
      tline("", "fetching recent activity…");
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var acts = (st.activity || []).slice(0, 9);
          if (!acts.length) { tline("", "no public activity"); return; }
          var out = acts.map(function (a) {
            var n = (a.repo && a.repo.name) || "?";
            var t = String(a.type || "").toLowerCase().replace("event", "");
            return "<span class='tk-y'>" + termEscape(t) + "</span> " + termEscape(n) + " <span class='tk-g'>" + termEscape(String(a.created_at || "").slice(0, 16)) + "</span>";
          });
          tline("", out.join("\n"));
        }, function () { tline("t-err", "feed unavailable"); });
    },
    alive: function () {
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var a = st.alive || {};
          var bits = [];
          if (a.last_push) bits.push("last push " + a.last_push.replace("T", " ").slice(0, 16) + "Z");
          if (a.last_x_post) bits.push("last x post " + a.last_x_post.replace("T", " ").slice(0, 16) + "Z");
          tline("", "composite aliveness: <span class='tk-y'>" + a.score + "</span>" + (bits.length ? " — " + bits.join(", ") : " — no recent signals"));
        }, function () { tline("t-err", "unavailable"); });
    },
    weather: function () {
      tline("", "fetching Beijing weather…");
      fetch("https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai")
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          var c = d.current || {};
          tline("", [
            "beijing: <span class='tk-y'>" + (c.temperature_2m != null ? c.temperature_2m + "°C" : "?") + "</span>, " + wmo(c.weather_code),
            "humidity " + (c.relative_humidity_2m != null ? c.relative_humidity_2m + "%" : "?") +
              " · wind " + (c.wind_speed_10m != null ? c.wind_speed_10m + " km/h" : "?") +
              " <span class='tk-g'>(" + (d.current && d.current.time ? d.current.time.replace("T", " ").slice(0, 16) : "") + ")</span>",
          ].join("\n"));
        }, function () { tline("t-err", "weather service unreachable"); });
    },
    calc: function (args) {
      var expr = args.join(" ");
      if (!/^[0-9+\-*/().%\s]+$/.test(expr)) { tline("t-err", "only numbers and + - * / ( ) % allowed"); return; }
      try {
        var val = Function('"use strict";return (' + expr + ")")();
        tline("", expr + " = <span class='tk-y'>" + val + "</span>");
      } catch (err) { tline("t-err", "invalid expression"); }
    },
    b64: function (args) {
      var mode = (args[0] || "").toLowerCase();
      var text = args.slice(1).join(" ");
      if (mode === "e") { tline("", btoa(unescape(encodeURIComponent(text)))); }
      else if (mode === "d") {
        try { tline("", decodeURIComponent(escape(atob(text)))); }
        catch (err) { tline("t-err", "invalid base64"); }
      } else { tline("t-err", "usage: b64 e|d &lt;text&gt;"); }
    },
    ts: function (args) {
      if (!args.length) { tline("", Math.floor(Date.now() / 1000) + " (now)"); return; }
      var raw = args[0];
      if (raw === "now") { tline("", Math.floor(Date.now() / 1000) + " (now)"); return; }
      var n = Number(raw);
      if (isNaN(n)) { tline("t-err", "not a unix timestamp"); return; }
      var ms = String(raw).length >= 13 ? n : n * 1000;
      tline("", raw + " → " + new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Shanghai" }) + " Beijing");
    },
    ls: function () {
      tline("", [
        "<span class='tk-w'>BetterAIChat</span>   <span class='tk-g'>android ai agent</span>",
        "<span class='tk-w'>VicinityProbe</span>  <span class='tk-g'>security toolkit</span>",
        "<span class='tk-w'>nekomimi</span>       <span class='tk-g'>text rewriter</span>",
        "<span class='tk-w'>GoogleOnYourMac</span> <span class='tk-g'>macOS wrappers</span>",
        "<span class='tk-w'>NUSV-lite</span>      <span class='tk-g'>org client</span>",
        "<span class='tk-w'>Syna-NUSV</span>      <span class='tk-g'>e2e messenger</span>",
        "<span class='tk-w'>Gomoku-NUSV</span>    <span class='tk-g'>cross-platform game</span>",
      ].join("\n"));
    },
    whoami: function () {
      tline("", "<span class='tk-w'>Verlintas</span> — the mainly developer in ULV / USV. born 2010, still just for fun.");
    },
    date: function () {
      tline("", new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" }) + " Beijing time");
    },
    neofetch: function () {
      tline("", [
        "      <span class='tk-c'>◆</span>      <span class='tk-w'>verlintas@web</span>",
        "     <span class='tk-c'>◆ ◆</span>     <span class='tk-g'>─────────────</span>",
        "    <span class='tk-c'>◆ ◆ ◆</span>    <span class='tk-g'>OS:</span> verlintas.github.io",
        "     <span class='tk-c'>◆ ◆</span>     <span class='tk-g'>Shell:</span> just for fun",
        "      <span class='tk-c'>◆</span>      <span class='tk-g'>Uptime:</span> since 2010",
        "               <span class='tk-g'>Locale:</span> zh-CN / en-US",
        "               <span class='tk-g'>Status:</span> alive &amp; shipping",
      ].join("\n"));
    },
    github: function () { tline("", "<a style='color:#ff9d9d' href='https://github.com/Verlintas' target='_blank' rel='noopener'>github.com/Verlintas</a>"); },
    x: function () { tline("", "<a style='color:#ff9d9d' href='https://x.com/Verlintas' target='_blank' rel='noopener'>x.com/Verlintas</a>"); },
    email: function () { tline("", "ulv777777@gmail.com · 12321666@163.com"); },
    ip: function () {
      fetch("https://ipwho.is/")
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          if (!d || !d.success) throw new Error("no data");
          var line = "<span class='tk-y'>" + termEscape(d.ip || "?") + "</span>" +
            (d.type ? " (" + d.type + ")" : "") +
            " — " + termEscape(d.city ? d.city + ", " : "") + termEscape(d.country || "") +
            (d.connection && d.connection.isp ? " · " + termEscape(d.connection.isp) : "");
          tline("", line);
        }, function () { tline("t-err", "ip lookup unreachable"); });
    },
    repo: function (args) {
      var name = (args[0] || "").toLowerCase();
      var full = REPOS[name] || name;
      if (!full || full.indexOf("/") === -1) { tline("t-err", "usage: repo <key|owner/name> — keys: " + Object.keys(REPOS).join(" · ")); return; }
      fetch("https://api.github.com/repos/" + full)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          tline("", [
            "<span class='tk-y'>" + termEscape(d.full_name) + "</span>  " + termEscape(String(d.description || "").slice(0, 90)),
            (d.stargazers_count != null ? "★ " + d.stargazers_count + "  " : "") +
              (d.forks_count != null ? "⑂ " + d.forks_count + "  " : "") +
              "<span class='tk-g'>" + termEscape(d.language || "?") + " · " + termEscape((d.license && d.license.spdx_id) || "no license") + "</span>",
            "<span class='tk-g'>last push " + termEscape(String(d.pushed_at || "").replace("T", " ").slice(0, 16)) + "</span>",
          ].join("\n"));
        }, function () { tline("t-err", "repo lookup failed — api.github.com unreachable or not found"); });
    },
    note: function (args) {
      var act = (args[0] || "").toLowerCase();
      var notes = [];
      try { notes = JSON.parse(localStorage.getItem("vweb:notes") || "[]"); } catch (e) {}
      function save() { try { localStorage.setItem("vweb:notes", JSON.stringify(notes)); } catch (e) {} }
      if (!act || act === "list") {
        if (!notes.length) { tline("", "no notes — 'note add <text>' to write one"); return; }
        tline("", notes.map(function (n, i) {
          var d = new Date(n.t);
          return "<span class='tk-y'>" + (i + 1) + "</span> <span class='tk-g'>[" + d.toLocaleDateString("en-GB") + "]</span> " + termEscape(n.text);
        }).join("\n"));
        return;
      }
      if (act === "add") {
        var text = args.slice(1).join(" ").trim();
        if (!text) { tline("t-err", "usage: note add <text>"); return; }
        notes.push({ t: Date.now(), text: text });
        save();
        tline("", "note #" + notes.length + " saved");
        return;
      }
      if (act === "del") {
        var idx = parseInt(args[1], 10) - 1;
        if (isNaN(idx) || !notes[idx]) { tline("t-err", "note del <number>"); return; }
        var removed = notes.splice(idx, 1);
        save();
        tline("", "deleted: " + termEscape(removed[0].text.slice(0, 60)));
        return;
      }
      if (act === "clear") {
        notes = [];
        save();
        tline("", "all notes cleared");
        return;
      }
      tline("t-err", "usage: note list|add <text>|del <n>|clear");
    },
    cal: function () {
      var now = new Date();
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var y = +map.year, mo = +map.month, today = +map.day;
      var first = new Date(Date.UTC(y, mo - 1, 1));
      var daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      var lead = first.getUTCDay();
      var lines = [];
      lines.push("<span class='tk-y'>" + y + "-" + ("0" + mo).slice(-2) + "</span>");
      lines.push("Su Mo Tu We Th Fr Sa");
      var row = "";
      for (var i = 0; i < lead; i++) row += "   ";
      for (var d = 1; d <= daysInMonth; d++) {
        var cell = (" " + d).slice(-2);
        row += (d === today ? "<span class='tk-y'>" + cell + "</span>" : cell) + " ";
        if ((lead + d) % 7 === 0) { lines.push(row); row = ""; }
      }
      if (row.trim()) lines.push(row);
      lines.push("<span class='tk-g'>today highlighted · Beijing time</span>");
      tline("", lines.join("\n"));
    },
    say: function (args) {
      var text = args.join(" ").trim() || "喵。";
      var width = 30;
      var out = [];
      var cur = "";
      Array.prototype.forEach.call(text, function (ch) {
        var w = ch.charCodeAt(0) > 255 ? 2 : 1;
        var curW = 0;
        for (var k = 0; k < cur.length; k++) curW += cur.charCodeAt(k) > 255 ? 2 : 1;
        if (curW + w > width && cur) { out.push(cur); cur = ch; }
        else cur += ch;
      });
      if (cur) out.push(cur);
      var border = "─".repeat(width + 2);
      var lines = ["╭" + border + "╮"];
      out.forEach(function (l) {
        var lw = 0;
        for (var k = 0; k < l.length; k++) lw += l.charCodeAt(k) > 255 ? 2 : 1;
        lines.push("│ " + l + " ".repeat(width - lw) + " │");
      });
      lines.push("╰" + border + "╯");
      lines.push("");
      lines.push("  /\\_/\\");
      lines.push(" ( o.o )  < " + termEscape(out[0] || "") + "…");
      lines.push("  > ^ <");
      tline("", lines.join("\n"));
    },
    fortune: function () {
      var quotes = [
        "The best way to predict the future is to ship it.",
        "Kotlin 不会报错，它只是给你更多报错。",
        "It compiles on my machine — and only there.",
        "2 AM rule: if it works at 2 AM, it ships at 2 AM.",
        "Bugs are not features… unless you name them features.",
        "删库跑路之前，先 git push。",
        "The cloud is just someone else's Windows Server 2016.",
        "My code has no bugs — it just develops unexpected features.",
        "Just for fun. — Linus",
        "猫娘三定律：不油腻、不掉线、不写 bug（第三条很难）。",
        "A PR a day keeps the reviewer away.",
        "If it ain't broken, git blame it anyway.",
        "Testing is when you hold your breath and press build.",
        "There are only two hard problems: caching, naming, and off-by-one.",
      ];
      tline("", "<span class='tk-g'>" + termEscape(quotes[Math.floor(Math.random() * quotes.length)]) + "</span>");
    },
    forget: function () {
      aiHistClear();
      tline("", "Empty-X forgot everything — fresh start 喵");
    },
    clear: function () { stopSay(); termBody.innerHTML = ""; },
    exit: function () { closeTerm(); },
    sudo: function () { tline("t-err", "nice try. — no frameworks were harmed."); },
    rand: function (args) {
      var len = Math.min(parseInt(args[0], 10) || 16, 128);
      var bytes = new Uint8Array(Math.ceil(len / 2));
      crypto.getRandomValues(bytes);
      var hex = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      tline("", hex.slice(0, len));
    },
    uuid: function () {
      if (crypto.randomUUID) { tline("", crypto.randomUUID()); return; }
      var b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      tline("", h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20));
    },
    pass: function (args) {
      var len = Math.min(parseInt(args[0], 10) || 20, 64);
      var sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];
      var all = sets.join("");
      var out = [];
      function pick(s) { return s[Math.floor(Math.random() * s.length)]; }
      sets.forEach(function (s) { out.push(pick(s)); });
      for (var i = out.length; i < len; i++) out.push(pick(all));
      for (var j = out.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = out[j]; out[j] = out[k]; out[k] = t;
      }
      tline("", out.join(""));
    },
    json: function (args) {
      var isMin = args[0] === "min";
      var text = args.slice(isMin ? 1 : 0).join(" ");
      if (!text) { tline("t-err", "usage: json &lt;data&gt; (or 'json min &lt;data&gt;')"); return; }
      try {
        var parsed = JSON.parse(text);
        tline("", JSON.stringify(parsed, null, isMin ? 0 : 2));
      } catch (err) {
        tline("t-err", "invalid JSON — " + err.message);
      }
    },
    ping: function (args) {
      var targets = {
        api: "https://api.github.com",
        meteo: "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m",
      };
      var name = (args[0] || "").toLowerCase();
      var url = targets[name];
      if (!url) { tline("t-err", "targets: api · meteo"); return; }
      var t0 = performance.now();
      fetch(url).then(function (r) {
        var ms = Math.round(performance.now() - t0);
        tline("", "ping " + termEscape(name) + " → <span class='tk-y'>" + ms + "ms</span> (http " + r.status + ")");
      }, function () {
        var ms = Math.round(performance.now() - t0);
        tline("t-err", "ping " + termEscape(name) + " → unreachable (" + ms + "ms)");
      });
    },
    url: function (args) {
      var mode = (args[0] || "").toLowerCase();
      var text = args.slice(1).join(" ");
      if (mode === "e") tline("", encodeURIComponent(text));
      else if (mode === "d") { try { tline("", decodeURIComponent(text)); } catch (err) { tline("t-err", "invalid percent-encoding"); } }
      else tline("t-err", "usage: url e|d &lt;text&gt;");
    },
    search: function (args) {
      var engine = (args[0] || "").toLowerCase();
      var q = args.slice(1).join(" ");
      if (!q) { tline("t-err", "usage: search github|web &lt;query&gt;"); return; }
      if (engine === "github") window.open("https://github.com/search?q=" + encodeURIComponent(q) + "&type=repositories", "_blank");
      else if (engine === "web") window.open("https://www.bing.com/search?q=" + encodeURIComponent(q), "_blank");
      else { tline("t-err", "engines: github · web"); return; }
      tline("", "searching <span class='tk-y'>" + termEscape(engine) + "</span> for " + termEscape(q));
    },
    alias: function (args) {
      if (!args.length) {
        var keys = Object.keys(aliasMap);
        if (!keys.length) { tline("", "no aliases — define one: <span class='tk-y'>alias gh=open github</span>"); return; }
        tline("", keys.map(function (k) { return "<span class='tk-y'>" + termEscape(k) + "</span> → " + termEscape(aliasMap[k]); }).join("\n"));
        return;
      }
      var a = args.join(" ");
      if (a.indexOf("=") === -1 && args[0] === "-d") {
        var del = args[1];
        if (!del || !aliasMap[del]) { tline("t-err", "no such alias: " + termEscape(del || "")); return; }
        delete aliasMap[del];
        saveAlias();
        tline("", "alias removed: " + termEscape(del));
        return;
      }
      var eq = a.indexOf("=");
      if (eq === -1) { tline("t-err", "usage: alias name=command | alias -d name"); return; }
      var name = a.slice(0, eq).trim();
      var val = a.slice(eq + 1).trim();
      if (!name || !val) { tline("t-err", "usage: alias name=command"); return; }
      aliasMap[name] = val;
      saveAlias();
      tline("", "alias set: <span class='tk-y'>" + termEscape(name) + "</span> → " + termEscape(val));
    },
  };
  function expandAlias(parts) {
    var guard = 0;
    var p = parts.slice();
    while (p.length && aliasMap[p[0]] && guard++ < 3) {
      p = (aliasMap[p[0]] + " " + p.slice(1).join(" ")).trim().split(/\s+/);
    }
    return p;
  }
  termForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = termInput.value.trim();
    var parts = expandAlias(raw.split(/\s+/));
    var cmd = (parts[0] || "").toLowerCase();
    tline("", "<span class='t-prompt'>verlintas@web:~$</span> " + termEscape(raw));
    if (raw && termHist[termHist.length - 1] !== raw) {
      termHist.push(raw);
      saveHist();
    }
    termHistIdx = termHist.length;
    if (!cmd) { termInput.value = ""; return; }
    if (cmd === "sudo" && parts[1] === "rm" && parts[2] === "-rf") { TCMD.sudo(); }
    else if (TCMD[cmd]) TCMD[cmd](parts.slice(1));
    else tline("t-err", "command not found: " + termEscape(cmd) + " — type 'help'");
    termInput.value = "";
    termBody.scrollTop = termBody.scrollHeight;
  });
  function allNames() {
    var names = Object.keys(TCMD).concat(Object.keys(aliasMap));
    names.push("help");
    return names;
  }
  termInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (termHistIdx > 0) { termHistIdx--; termInput.value = termHist[termHistIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (termHistIdx < termHist.length - 1) { termHistIdx++; termInput.value = termHist[termHistIdx]; }
      else { termHistIdx = termHist.length; termInput.value = ""; }
    } else if (e.key === "Tab") {
      e.preventDefault();
      var token = termInput.value.split(/\s+/).pop() || "";
      var matches = allNames().filter(function (n) { return n.indexOf(token.toLowerCase()) === 0; });
      if (matches.length === 1) {
        termInput.value = termInput.value.slice(0, termInput.value.length - token.length) + matches[0] + " ";
      } else if (matches.length > 1) {
        tline("", "<span class='tk-g'>" + matches.sort().join("  ") + "</span>");
        termBody.scrollTop = termBody.scrollHeight;
      }
    }
  });
  termClose.addEventListener("click", closeTerm);
  document.getElementById("termToggle").addEventListener("click", function () {
    if (term.hidden) openTerm(); else closeTerm();
  });
  term.addEventListener("click", function () { termInput.focus(); });
  document.addEventListener("keydown", function (e) {
    var isBackquote = e.key === "`" || e.key === "~" || e.keyCode === 192;
    if (isBackquote && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (term.hidden) openTerm(); else closeTerm();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "`" || e.keyCode === 192)) {
      e.preventDefault();
      if (term.hidden) openTerm(); else closeTerm();
    }
    if (e.key === "Escape" && !term.hidden) closeTerm();
  });

  /* reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* 3D tilt + red tint on project cards */
  var cards = document.querySelectorAll(".proj-card");
  cards.forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        "perspective(900px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg) translateY(-2px)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });

  /* stack chips: brand-color glow on hover */
  var stackItems = document.querySelectorAll(".stack-item");
  stackItems.forEach(function (item) {
    var color = item.dataset.c || "#ff0000";
    item.addEventListener("mouseenter", function () {
      item.style.borderColor = color;
      item.style.color = "#fff";
      item.style.boxShadow = "0 0 22px -4px " + color + "88";
    });
    item.addEventListener("mouseleave", function () {
      item.style.borderColor = "";
      item.style.color = "";
      item.style.boxShadow = "";
    });
  });

  /* smooth-scroll offset for fixed nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
    });
  });

  /* nav dims on scroll + progress bar + to-top */
  var nav = document.querySelector(".nav");
  var progress = document.getElementById("scrollProgress");
  var toTop = document.getElementById("toTop");
  var ticking = false;
  function onScroll() {
    nav.style.background =
      window.scrollY > 40
        ? "rgba(5,5,5,0.9)"
        : "linear-gradient(to bottom, rgba(5,5,5,0.85), transparent)";
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    if (window.scrollY > 480) toTop.classList.add("show");
    else toTop.classList.remove("show");
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ═══ Beijing live clock ═══ */
  var fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });
  var timeEl = document.getElementById("clockTime");
  var dateEl = document.getElementById("clockDate");
  function tick() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var h = (map.hour === "24" ? "00" : map.hour);
    timeEl.innerHTML =
      "<span>" + h + "</span><span class='clock-dot'>:</span><span>" +
      map.minute + "</span><span class='clock-dot'>:</span><span class='secs'>" +
      map.second + "</span>";
    dateEl.textContent = fmt.format(new Date()) + " · Beijing";
  }
  tick();
  setInterval(tick, 1000);
  check2am();
  setInterval(check2am, 30000);

  /* ═══ GitHub live activity feed ═══ */
  var feedList = document.getElementById("feedList");
  var feedEmpty = document.getElementById("feedEmpty");
  var repoBase = "https://github.com/";
  function relTime(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(s) || s < 0) return "—";
    s = Math.max(0, s);
    if (s < 120) return Math.floor(s) + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function describe(ev) {
    var repo = (ev.repo && ev.repo.name) || "";
    var short = repo.replace(/^Verlintas\//, "");
    var rlink = "<a href='" + repoBase + repo + "' target='_blank' rel='noopener'>" + short + "</a>";
    var ico;
    switch (ev.type) {
      case "PushEvent":
        var n = (ev.payload && ev.payload.size) || 1;
        var branch = ev.payload && ev.payload.ref ? ev.payload.ref.replace("refs/heads/", "") : "";
        ico = "PUSH";
        return { ico: ico, repo: repo, msg: "pushed <b>" + n + "</b> commit" + (n > 1 ? "s" : "") + " to " + rlink + (branch ? " <span>(" + branch + ")</span>" : ""), url: repoBase + repo + "/commits" };
      case "CreateEvent":
        ico = "NEW";
        return { ico: ico, repo: repo, msg: "created " + (ev.payload.ref_type || "ref") + (ev.payload.ref ? " <b>" + ev.payload.ref + "</b>" : "") + " in " + rlink };
      case "WatchEvent":
        ico = "STAR";
        return { ico: ico, repo: repo, msg: "starred " + rlink };
      case "ForkEvent":
        ico = "FORK";
        return { ico: ico, repo: repo, msg: "forked " + rlink };
      case "IssueEvent":
        ico = "ISSUE";
        return { ico: ico, repo: repo, msg: (ev.payload.action || "acted") + " issue in " + rlink };
      case "PullRequestEvent":
        ico = "PR";
        return { ico: ico, repo: repo, msg: (ev.payload.action || "acted") + " PR in " + rlink };
      case "ReleaseEvent":
        ico = "REL";
        return { ico: ico, repo: repo, msg: "released " + rlink };
      case "PublicEvent":
        ico = "NEW";
        return { ico: ico, repo: repo, msg: "open-sourced <b>" + repo + "</b>" };
      default:
        ico = ev.type ? ev.type.toUpperCase().slice(0, 4) : "EV";
        return { ico: ico, repo: repo, msg: (ev.type || "activity").toLowerCase().replace("event", "") + " on " + rlink };
    }
  }
  function renderActivity(events) {
    if (!events) return false;
    feedList.querySelectorAll(".feed-item").forEach(function (li) { li.remove(); });
    feedEmpty.style.display = "none";
    var items = [];
    events.forEach(function (ev) {
      var d = describe(ev);
      if (!d) items.push(null);
      else items.push({ d: d, at: ev.created_at });
    });
    items.sort(function (a, b) {
      if (!a) return 1;
      if (!b) return -1;
      return new Date(b.at) - new Date(a.at);
    });
    var merged = [];
    items.forEach(function (it, i) {
      if (!it) return;
      var prev = merged[merged.length - 1];
      if (prev && prev.d.repo && it.d.repo && prev.d.repo === it.d.repo && prev.d.ico === "PUSH" && it.d.ico === "PUSH") {
        var pb = prev.d.msg.match(/pushed <b>(\d+)<\/b>/);
        var cb = it.d.msg.match(/pushed <b>(\d+)<\/b>/);
        var total = (pb ? +pb[1] : 1) + (cb ? +cb[1] : 1);
        prev.d.msg = prev.d.msg.replace(/pushed <b>\d+<\/b> commit(s)?/, "pushed <b>" + total + "</b> commits");
      } else {
        merged.push({ d: it.d, at: it.at });
      }
    });
    if (!merged.length) {
      feedEmpty.textContent = "no public activity yet";
      feedEmpty.style.display = "list-item";
      return true;
    }
    merged.slice(0, 9).forEach(function (item) {
      var li = document.createElement("li");
      li.className = "feed-item";
      li.title = new Date(item.at).toLocaleString();
      var ico = document.createElement("span");
      ico.className = "feed-ico";
      ico.textContent = item.d.ico;
      var msg = document.createElement("span");
      msg.className = "feed-msg";
      msg.innerHTML = item.d.msg;
      var when = document.createElement("span");
      when.className = "feed-when";
      when.textContent = relTime(item.at);
      li.appendChild(ico); li.appendChild(msg); li.appendChild(when);
      feedList.appendChild(li);
    });
    return true;
  }

  var feedBackoffUntil = 0;
  function loadFeed() {
    if (Date.now() < feedBackoffUntil) return;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    fetch("https://api.github.com/users/Verlintas/events/public?per_page=100&_=" + Date.now(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(function (events) {
        if (renderActivity(events)) feedBackoffUntil = 0;
      })
      .catch(function () {
        /* fallback: read the activity snapshot bundled in status.json */
        feedBackoffUntil = Date.now() + 5 * 60 * 1000;
        fetch("status.json?_=" + Date.now())
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (st) {
            var hasOld = !!feedList.querySelector(".feed-item");
            if (!st.activity || !renderActivity(st.activity)) {
              if (!hasOld) {
                feedEmpty.textContent = "activity unavailable — will retry";
                feedEmpty.style.display = "list-item";
              }
            }
          })
          .catch(function () {
            if (!feedList.querySelector(".feed-item")) {
              feedEmpty.textContent = "activity unavailable — will retry";
              feedEmpty.style.display = "list-item";
            }
          });
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  /* ═══ service status (from status.json, generated by GitHub Actions) ═══ */
  var statusList = document.getElementById("statusList");
  var statusEmpty = document.getElementById("statusEmpty");
  var aliveNum = document.getElementById("aliveNum");
  var aliveSub = document.getElementById("aliveSub");
  function statusRow(cls, nameHtml, stateHtml) {
    var li = document.createElement("li");
    li.className = "status-item";
    var dot = document.createElement("span");
    dot.className = "s-dot " + cls;
    var name = document.createElement("span");
    name.className = "s-name";
    name.innerHTML = nameHtml;
    var state = document.createElement("span");
    state.className = "s-state";
    state.textContent = stateHtml;
    li.appendChild(dot); li.appendChild(name); li.appendChild(state);
    return li;
  }
  function loadStatus() {
    fetch("status.json?_=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (st) {
        statusList.querySelectorAll(".status-item:not(#statusEmpty)").forEach(function (li) { li.remove(); });
        statusEmpty.style.display = "none";
        if (st.alive && st.alive.score != null) {
          aliveNum.textContent = st.alive.score;
          var bits = [];
          if (st.alive.last_push) bits.push("push " + relTime(st.alive.last_push));
          if (st.alive.last_x_post) bits.push("post " + relTime(st.alive.last_x_post));
          aliveSub.textContent = bits.length ? bits.join(" · ") : "no recent signals";
          aliveNum.style.color = st.alive.score > 0 ? "" : "#ff3b3b";
        }
        (st.sites || []).forEach(function (s) {
          var cls = s.up ? "s-up" : "s-down";
          var state = s.up ? (s.ms != null ? "up · " + s.ms + "ms" : "up") : "down";
          statusList.appendChild(statusRow(cls, "<a href='" + s.url + "' target='_blank' rel='noopener'>" + s.name + "</a>", state));
        });
        if (st.x) {
          if (st.x.ok) {
            var xState = st.x.last_post
              ? "post " + relTime(st.x.last_post)
              : (st.x.followers != null ? st.x.followers + " followers" : "up");
            statusList.appendChild(statusRow("s-up", "X / @Verlintas", xState));
          } else {
            statusList.appendChild(statusRow("s-unknown", "X / @Verlintas", "profile unreachable"));
          }
        }
        if (Date.now() < feedBackoffUntil && st.activity && renderActivity(st.activity)) {
          /* during backoff, keep the feed fresh from the bundled snapshot */
        }
      })
      .catch(function () {
        if (!statusList.querySelector(".status-item:not(#statusEmpty)")) {
          statusEmpty.textContent = "status unavailable — auto-retrying";
          statusEmpty.style.display = "list-item";
        }
      });
  }
  loadFeed();
  loadStatus();
  setInterval(function () {
    if (!document.hidden) loadFeed();
  }, 120000);
  setInterval(function () {
    if (!document.hidden) loadStatus();
  }, 60000);
  window.addEventListener("focus", function () { loadFeed(); loadStatus(); });

  /* ═══ click diamond particle burst + name-triggered diamond rain ═══ */
  var canvas = document.getElementById("fx");
  var ctx = canvas.getContext("2d");
  var parts = [];
  var drawing = false;
  var rainUntil = 0;
  function sizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  function spawn(x, y, vx, vy, size, vr, decay, color) {
    parts.push({
      x: x, y: y, vx: vx, vy: vy,
      size: size, rot: Math.random() * Math.PI, vr: vr,
      life: 1, decay: decay, color: color,
    });
  }
  function burst(x, y) {
    var n = 10 + Math.floor(Math.random() * 8);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1.5 + Math.random() * 4.5;
      var reds = ["255,0,0", "255,60,60", "255,255,255", "255,120,120"];
      spawn(
        x, y,
        Math.cos(a) * v, Math.sin(a) * v - 1.2,
        3 + Math.random() * 5,
        (Math.random() - 0.5) * 0.35,
        0.018 + Math.random() * 0.02,
        reds[Math.floor(Math.random() * reds.length)]
      );
    }
    if (!drawing) { drawing = true; requestAnimationFrame(drawParts); }
  }
  function rainTick() {
    for (var i = 0; i < 2; i++) {
      var reds = ["255,0,0", "255,40,40", "255,255,255"];
      spawn(
        Math.random() * canvas.width, -18 - Math.random() * 40,
        (Math.random() - 0.5) * 1.4, 2.4 + Math.random() * 3.4,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 0.4,
        0.0035 + Math.random() * 0.004,
        reds[Math.floor(Math.random() * reds.length)]
      );
    }
  }
  function drawParts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Date.now() < rainUntil) rainTick();
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= p.decay;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = "rgba(" + p.color + ")";
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    if (parts.length || Date.now() < rainUntil) {
      requestAnimationFrame(drawParts);
    } else {
      drawing = false;
    }
  }
  document.addEventListener("pointerdown", function (e) {
    burst(e.clientX, e.clientY);
  });
  var nameEl = document.getElementById("heroName");
  var nameClicks = 0;
  var lastNameClick = 0;
  var heroRaf = false;
  window.addEventListener("pointermove", function (e) {
    if (heroRaf || !nameEl || !window.matchMedia("(pointer: fine)").matches) return;
    heroRaf = true;
    requestAnimationFrame(function () {
      heroRaf = false;
      var dx = (e.clientX / window.innerWidth - 0.5);
      var dy = (e.clientY / window.innerHeight - 0.5);
      nameEl.style.transform = "translate(" + (dx * 16).toFixed(1) + "px, " + (dy * 12).toFixed(1) + "px)";
    });
  });
  var origTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.title = "come back 喵~";
    else document.title = origTitle;
  });
  if (nameEl) {
    nameEl.addEventListener("click", function () {
      var now = Date.now();
      nameClicks = (now - lastNameClick < 550) ? nameClicks + 1 : 1;
      lastNameClick = now;
      if (nameClicks >= 3) {
        nameClicks = 0;
        rainUntil = now + 3000;
        nameEl.style.textShadow = "0 0 40px rgba(255,0,0,0.95), 0 0 120px rgba(255,0,0,0.6)";
        setTimeout(function () { nameEl.style.textShadow = ""; }, 3100);
        if (!drawing) { drawing = true; requestAnimationFrame(drawParts); }
      }
    });
  }
})();

(function () {
  "use strict";

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

  /* ═══ GitHub live activity feed ═══ */
  var feedList = document.getElementById("feedList");
  var feedEmpty = document.getElementById("feedEmpty");
  var repoBase = "https://github.com/";
  function relTime(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
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
      if (prev && prev.d.repo === it.d.repo && prev.d.ico === "PUSH" && it.d.ico === "PUSH") {
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
    var direct = fetch("https://api.github.com/users/Verlintas/events/public?per_page=100&_=" + Date.now());
    direct
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
            if (!st.activity || !renderActivity(st.activity)) {
              feedEmpty.textContent = "activity unavailable — will retry";
              feedEmpty.style.display = "list-item";
            }
          })
          .catch(function () {
            feedEmpty.textContent = "activity unavailable — will retry";
            feedEmpty.style.display = "list-item";
          });
      });
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
        st.sites.forEach(function (s) {
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

  /* ═══ click diamond particle burst ═══ */
  var canvas = document.getElementById("fx");
  var ctx = canvas.getContext("2d");
  var parts = [];
  function sizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  function burst(x, y) {
    var n = 10 + Math.floor(Math.random() * 8);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1.5 + Math.random() * 4.5;
      var reds = ["255,0,0", "255,60,60", "255,255,255", "255,120,120"];
      parts.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1.2,
        size: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        color: reds[Math.floor(Math.random() * reds.length)],
      });
    }
  }
  function drawParts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.rot += p.vr; p.life -= p.decay;
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
    if (parts.length) requestAnimationFrame(drawParts);
  }
  document.addEventListener("pointerdown", function (e) {
    burst(e.clientX, e.clientY);
    if (parts.length <= 1) requestAnimationFrame(drawParts);
  });
})();

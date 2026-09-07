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
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
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
        return { ico: ico, msg: "pushed <b>" + n + "</b> commit" + (n > 1 ? "s" : "") + " to " + rlink + (branch ? " <span>(" + branch + ")</span>" : ""), url: repoBase + repo + "/commits" };
      case "CreateEvent":
        ico = "NEW";
        return { ico: ico, msg: "created " + (ev.payload.ref_type || "ref") + (ev.payload.ref ? " <b>" + ev.payload.ref + "</b>" : "") + " in " + rlink };
      case "WatchEvent":
        ico = "STAR";
        return { ico: ico, msg: "starred " + rlink };
      case "ForkEvent":
        ico = "FORK";
        return { ico: ico, msg: "forked " + rlink };
      case "IssueEvent":
        ico = "ISSUE";
        return { ico: ico, msg: (ev.payload.action || "acted") + " issue in " + rlink };
      case "PullRequestEvent":
        ico = "PR";
        return { ico: ico, msg: (ev.payload.action || "acted") + " PR in " + rlink };
      case "ReleaseEvent":
        ico = "REL";
        return { ico: ico, msg: "released " + rlink };
      case "PublicEvent":
        ico = "NEW";
        return { ico: ico, msg: "open-sourced <b>" + repo + "</b>" };
      default:
        ico = ev.type ? ev.type.toUpperCase().slice(0, 4) : "EV";
        return { ico: ico, msg: (ev.type || "activity").toLowerCase().replace("event", "") + " on " + rlink };
    }
  }
  fetch("https://api.github.com/users/Verlintas/events/public?per_page=7")
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (events) {
      feedEmpty.style.display = "none";
      events.forEach(function (ev) {
        var d = describe(ev);
        if (!d) return;
        var li = document.createElement("li");
        li.className = "feed-item";
        var ico = document.createElement("span");
        ico.className = "feed-ico";
        ico.textContent = d.ico;
        var msg = document.createElement("span");
        msg.className = "feed-msg";
        msg.innerHTML = d.msg;
        var when = document.createElement("span");
        when.className = "feed-when";
        when.textContent = relTime(ev.created_at);
        li.appendChild(ico); li.appendChild(msg); li.appendChild(when);
        feedList.appendChild(li);
      });
      if (!events.length) feedEmpty.textContent = "no public activity yet";
    })
    .catch(function () { feedEmpty.textContent = "activity unavailable — refresh later"; });

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

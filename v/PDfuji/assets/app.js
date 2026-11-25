/* ============================================================
   PROGYNON / DEPOT — interactions
   Vanilla JS. No dependencies.
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const storedTheme = localStorage.getItem("pd-theme");
  if (storedTheme === "paper" || storedTheme === "dark") root.dataset.theme = storedTheme;
  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "paper" ? "dark" : "paper";
    localStorage.setItem("pd-theme", root.dataset.theme);
    renderPk();
  });

  /* ---------- mobile menu ---------- */
  const menuBtn = $("#menuBtn");
  const topnav = $("#topnav");
  const closeMenu = () => {
    topnav?.classList.remove("is-open");
    menuBtn?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };
  menuBtn?.addEventListener("click", () => {
    const open = topnav?.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(!!open));
    document.body.classList.toggle("menu-open", !!open);
  });
  $$("#topnav a").forEach(a => a.addEventListener("click", closeMenu));

  /* ---------- cursor glow ---------- */
  const glow = $("#cursorGlow");
  let gx = 0, gy = 0, gactive = false;
  if (glow && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    window.addEventListener("pointermove", e => {
      gx = e.clientX; gy = e.clientY;
      if (!gactive) { gactive = true; requestAnimationFrame(updateGlow); }
    }, { passive: true });
    function updateGlow() {
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      gactive = false;
    }
  }

  /* ---------- scroll progress + rail ---------- */
  const progress = $("#scrollProgress");
  const railFill = $("#railFill");
  const railDots = $$(".rail-dot");
  const sections = $$("main section[id]");
  const sectionMap = new Map(sections.map(s => [s.id, s]));

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.width = `${p * 100}%`;
    if (railFill) railFill.style.height = `${p * 100}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  if ("IntersectionObserver" in window) {
    const railObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        railDots.forEach(dot => dot.classList.toggle("is-active", dot.dataset.rail === id));
      });
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });
    sections.forEach(s => railObserver.observe(s));

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(el => revealObserver.observe(el));
  } else {
    $$(".reveal").forEach(el => el.classList.add("is-visible"));
  }

  /* ---------- passport ---------- */
  const passport = $("#passport");
  passport?.addEventListener("click", () => passport.classList.toggle("is-flipped"));

  /* ---------- label tabs ---------- */
  const tabs = $$(".label-tabs button[data-tab]");
  const panels = $$(".label-panel");
  const activateTab = (btn) => {
    tabs.forEach(t => {
      const active = t === btn;
      t.setAttribute("aria-selected", String(active));
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !active;
      if (panel) panel.classList.toggle("is-active", active);
    });
  };
  tabs.forEach((btn, i) => {
    btn.addEventListener("click", () => activateTab(btn));
    btn.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); activateTab(next);
    });
  });

  /* ---------- atlas ---------- */
  const atlasData = {
    japan: {
      kicker: "JAPAN / JSPN + JGI", tag: "A · GUIDELINE",
      title: "10 mg / 2–3 weeks<br>20 mg / 2–4 weeks",
      dose: "Estradiol valerate IM",
      e2: "No numeric target in table",
      t: "Adjust by serum testosterone",
      mon: "Periodic: liver, coagulation, prolactin",
      note: "Japan’s de facto national guideline. All GAHT drugs in the table are unapproved and uninsured.",
      bar: 50, barLabel: "3.3–10 mg/wk",
      foot: "Off-label in Japan. Not a prescription."
    },
    wpath: {
      kicker: "WPATH / SOC8", tag: "A · GUIDELINE",
      title: "5–30 mg / 2 weeks<br>2–10 mg / week",
      dose: "Estradiol valerate or cypionate IM",
      e2: "100–200 pg/mL",
      t: "<50 ng/dL",
      mon: "Every 3 months in year 1; then 1–2×/year",
      note: "Optimal target ranges have not been established. No RCT of estrogen in transgender people.",
      bar: 75, barLabel: "2.5–15 mg/wk",
      foot: "One range, not a universal standard."
    },
    endocrine: {
      kicker: "ENDOCRINE SOCIETY", tag: "A · GUIDELINE",
      title: "5–30 mg / 2 weeks<br>2–10 mg / week",
      dose: "Estradiol valerate or cypionate IM",
      e2: "100–200 pg/mL",
      t: "<50 ng/dL",
      mon: "Every 3 months in year 1; then 1–2×/year",
      note: "Monitoring recommendation is graded 2 | ⊕⊕○○: weak, low-quality evidence.",
      bar: 75, barLabel: "2.5–15 mg/wk",
      foot: "Older, wider range. Newer guidance trends lower."
    },
    auspath: {
      kicker: "AUSPATH / AUSTRALIA", tag: "A · GUIDELINE",
      title: "2–10 mg / week",
      dose: "Compounded EV/EC · IM or SC",
      e2: ">250 pmol/L; no upper limit",
      t: "<2 nmol/L",
      mon: "3–4 monthly in year 1; then annually",
      note: "Narrative cites evidence for starting ≤5 mg/week. Compounded, not TGA-approved.",
      bar: 50, barLabel: "2–10 mg/wk",
      foot: "Lower starting dose; injectables uncommon in Australia."
    },
    sherbourne: {
      kicker: "SHERBOURNE / CANADA", tag: "A · GUIDELINE",
      title: "Start 3–4 mg / week<br>usual 3–5 mg / week",
      dose: "Compounded EV · IM or SC",
      e2: "367–734 pmol/L (100–200 pg/mL)",
      t: "No explicit table target",
      mon: "Individualised; typically every 3 months initially",
      note: "2026 amendment: usual 3–5 mg/week; 7–8 mg/week rarely required. No Health Canada-approved injectable.",
      bar: 25, barLabel: "3–5 mg/wk usual",
      foot: "The most conservative common range in this atlas."
    },
    nhs: {
      kicker: "NHS / UNITED KINGDOM", tag: "A · GUIDELINE",
      title: "No injectable<br>regimen",
      dose: "Oral / transdermal only",
      e2: "300–600 pmol/L",
      t: "Not stated in target footnote",
      mon: "At least annually once stable",
      note: "Injectable estradiol is an “Excluded Medication” and is not available in the UK. All estradiol is off-label for gender incongruence.",
      bar: 0, barLabel: "no injectable",
      foot: "A different formulary, not a verdict on IM EV."
    },
    india: {
      kicker: "ENDOCRINE SOCIETY OF INDIA", tag: "A · GUIDELINE",
      title: "5 mg / week<br>max 10–20 mg / 1–2 weeks",
      dose: "Parenteral estradiol valerate",
      e2: "100–200 pg/mL",
      t: "<55 ng/dL",
      mon: "Every 3–6 months in year 1; then 1–2×/year",
      note: "“Lower doses of 5 mg/week up to a maximum of 10–20 mg every 1–2 weeks.” The maximum is interval-dependent.",
      bar: 100, barLabel: "5–20 mg/wk*",
      foot: "*Upper bound depends on the interval."
    }
  };
  const atlasNodes = $$(".atlas-node");
  const atlasEls = {
    kicker: $("#atlasKicker"), tag: $("#atlasTag"), title: $("#atlasTitle"),
    dose: $("#atlasDose"), e2: $("#atlasE2"), t: $("#atlasT"),
    mon: $("#atlasMon"), note: $("#atlasNote"), bar: $("#atlasBar"),
    barLabel: $("#atlasBarLabel"), foot: $("#atlasFoot")
  };
  const setAtlas = (id) => {
    const d = atlasData[id];
    if (!d) return;
    atlasNodes.forEach(n => n.classList.toggle("is-active", n.dataset.id === id));
    atlasEls.kicker.textContent = d.kicker;
    atlasEls.tag.textContent = d.tag;
    atlasEls.title.innerHTML = d.title;
    atlasEls.dose.textContent = d.dose;
    atlasEls.e2.textContent = d.e2;
    atlasEls.t.textContent = d.t;
    atlasEls.mon.textContent = d.mon;
    atlasEls.note.textContent = d.note;
    atlasEls.bar.style.width = `${d.bar}%`;
    atlasEls.barLabel.textContent = d.barLabel;
    atlasEls.foot.textContent = d.foot;
  };
  atlasNodes.forEach(node => {
    node.addEventListener("click", () => setAtlas(node.dataset.id));
    node.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAtlas(node.dataset.id); }
    });
  });

  /* ---------- body risk map ---------- */
  const riskData = {
    pituitary: {
      kicker: "PITUITARY / PROLACTIN", badge: "MONITOR", color: "var(--blue)",
      title: "Estrogen can raise<br>prolactin.",
      body: "Prolactin rose ~193% in the first year in one cohort; 18/61 developed hyperprolactinaemia, with cyproterone acetate implicated. A Japanese case developed a 13×17×11 mm pituitary mass on EV 20 mg every 2 weeks plus conjugated estrogen. Most elevations normalise after reducing estrogen or stopping CPA.",
      stats: [["Nota 2017", "+193% first year"], ["Japanese case", "PRL 494 ng/mL"], ["Risk", "very low absolute"]],
      source: "Sources: Nota 2017; Uryu 2023; Endocrine Society 2017; Japanese guideline 5th ed."
    },
    breast: {
      kicker: "BREAST / CARCINOMA", badge: "MODERATE", color: "var(--amber)",
      title: "Above cis men,<br>below cis women.",
      body: "The Dutch nationwide cohort found 15 invasive breast cancers in 2,260 trans women over 33,991 person-years (median 18 years of hormones). SIR was 46.7 versus cisgender men and 0.3 versus cisgender women. Short-term risk appears low; long-term screening should be individualised.",
      stats: [["de Blok 2019", "15 / 2,260"], ["SIR vs men", "46.7"], ["SIR vs women", "0.3"]],
      source: "Sources: de Blok 2019; Endocrine Society 2017; WPATH SOC8."
    },
    vte: {
      kicker: "VTE / THROMBOSIS", badge: "VERY HIGH", color: "var(--red)",
      title: "The label’s only<br>“major” adverse effect.",
      body: "MtF cohorts show a real increase in venous thromboembolism, but the data are dominated by oral ethinylestradiol and oral estradiol. IM estradiol valerate has no adequately powered outcome study. The label lists thrombosis as frequency-unknown; VTE/PE history is an absolute contraindication.",
      stats: [["Getahun 2018", "5.5 / 1000 PY"], ["Nota 2019", "SIR 5.52 vs women"], ["Route signal", "oral > transdermal; IM unknown"]],
      source: "Sources: label 11.1.1; Getahun 2018; Nota 2019; Endocrine Society 2017."
    },
    liver: {
      kicker: "LIVER / HEPATIC", badge: "CAUTION", color: "var(--amber)",
      title: "Severe disease is<br>an absolute stop.",
      body: "The label contraindicates severe hepatic impairment and warns of liver dysfunction and rare liver tumours. In a 624-person transfeminine cohort, feminising GAHT was not associated with significant ALT/AST changes; transient elevations occurred in 3/53 on oral EV 4 mg + CPA 50 mg. IM EV-specific data are sparse.",
      stats: [["Hashemi 2021", "624 · no significant ALT/AST"], ["Wierckx 2014", "3/53 transient"], ["Label", "severe liver = contraindicated"]],
      source: "Sources: label 2.6/9.3; Hashemi 2021; Wierckx 2014; Japanese guideline."
    },
    gallbladder: {
      kicker: "GALLBLADDER / BILIARY", badge: "MODERATE", color: "var(--amber)",
      title: "A known HRT<br>signal.",
      body: "Estrogen increases gallbladder disease risk in menopausal HRT data (WHI hazard ratios 1.59–1.67). The Japanese label lists gallstones among possible adverse effects. IM EV-specific data are not available; consider the signal if upper abdominal pain, fever or jaundice occurs.",
      stats: [["WHI combined", "HR 1.59"], ["WHI estrogen-only", "HR 1.67"], ["IM EV", "no specific data"]],
      source: "Sources: label 15.1.7; WHI; Endocrine Society 2017."
    },
    bone: {
      kicker: "BONE / MINERAL", badge: "PROTECTIVE", color: "var(--teal)",
      title: "Estrogen is the<br>bone signal.",
      body: "BMD is preserved or modestly increases in trans women on GAHT: one-year lumbar spine +3.67%, total hip +0.97%, femoral neck +1.86%. After orchiectomy, stopping estrogen accelerates bone loss; the Japanese guideline says reduce if needed but continue lifelong for bone health.",
      stats: [["Lumbar spine", "+3.67% at 1 year"], ["Total hip", "+0.97%"], ["After orchiectomy", "continue, do not stop"]],
      source: "Sources: Japanese guideline 5th ed.; bone meta-analysis; WPATH SOC8."
    },
    fertility: {
      kicker: "GONADS / FERTILITY", badge: "IRREVERSIBLE RISK", color: "var(--red)",
      title: "Sperm first,<br>then hormones.",
      body: "Estrogen causes testicular atrophy and reduced sperm production; the effect may be irreversible. WPATH and the Endocrine Society recommend discussing fertility preservation before starting GAHT. Do not assume that stopping hormones restores fertility.",
      stats: [["Testicular volume", "decreases"], ["Sperm production", "decreases / may stop"], ["Before starting", "sperm banking"]],
      source: "Sources: WPATH SOC8 statement 12.10; Endocrine Society 2017; Japanese guideline."
    }
  };
  const hotspotEls = $$(".hotspot");
  const riskEls = {
    kicker: $("#riskKicker"), badge: $("#riskBadge"), title: $("#riskTitle"),
    body: $("#riskBody"), stats: $(".risk-stats"), source: $("#riskSource")
  };
  const setRisk = (id) => {
    const d = riskData[id];
    if (!d) return;
    hotspotEls.forEach(h => h.classList.toggle("is-active", h.dataset.risk === id));
    riskEls.kicker.textContent = d.kicker;
    riskEls.badge.textContent = d.badge;
    riskEls.badge.style.color = d.color;
    riskEls.badge.style.borderColor = d.color;
    riskEls.title.innerHTML = d.title;
    riskEls.body.textContent = d.body;
    riskEls.stats.innerHTML = d.stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    riskEls.source.textContent = d.source;
  };
  // Add a larger transparent hit area so the pulsing rings do not block clicks.
  hotspotEls.forEach(h => {
    const core = h.querySelector(".hotspot-core");
    if (!core) return;
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hit.setAttribute("class", "hotspot-hit");
    hit.setAttribute("cx", core.getAttribute("cx"));
    hit.setAttribute("cy", core.getAttribute("cy"));
    hit.setAttribute("r", "24");
    h.insertBefore(hit, h.firstChild);
  });

  hotspotEls.forEach(h => {
    h.addEventListener("click", () => setRisk(h.dataset.risk));
    h.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRisk(h.dataset.risk); }
    });
  });
  $$("[data-risk-jump]").forEach(card => {
    card.addEventListener("click", () => {
      setRisk(card.dataset.riskJump);
      $("#riskPanel")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  });

  /* ---------- PK chart ---------- */
  const pkSvg = $("#pkChart");
  const pkReadout = $("#pkReadout");
  const doseButtons = $$("[data-dose]");
  const intervalButtons = $$("[data-interval]");
  let pkDose = 10;
  let pkInterval = 14;
  const doseCmax = { 5: 320, 10: 520, 20: 1000 };
  const TMAX = 4;
  const HALF_LIFE = 4.5;
  const SHAPE = (TMAX * Math.LN2) / HALF_LIFE;
  const DAYS = 56;

  const pkConcentration = (t, dose) => {
    if (t <= 0) return 0;
    const cmax = doseCmax[dose] || 520;
    const x = t / TMAX;
    return cmax * Math.pow(x, SHAPE) * Math.exp(SHAPE * (1 - x));
  };
  const pkSeries = (dose, interval) => {
    const pts = [];
    for (let t = 0; t <= DAYS; t += 0.25) {
      let c = 0;
      for (let inj = 0; inj <= DAYS; inj += interval) {
        if (t >= inj) c += pkConcentration(t - inj, dose);
      }
      pts.push([t, c]);
    }
    return pts;
  };

  const svgEl = (tag, attrs = {}, text = "") => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text) e.textContent = text;
    return e;
  };

  function renderPk() {
    if (!pkSvg) return;
    const W = 920, H = 430;
    const m = { l: 56, r: 26, t: 26, b: 44 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const pts = pkSeries(pkDose, pkInterval);
    const maxC = Math.max(...pts.map(p => p[1]));
    const yMax = Math.max(1200, Math.ceil(maxC / 200) * 200);
    const x = t => m.l + (t / DAYS) * iw;
    const y = c => m.t + ih - (c / yMax) * ih;

    pkSvg.innerHTML = "";
    const g = svgEl("g");
    pkSvg.appendChild(g);

    // target band
    g.appendChild(svgEl("rect", { x: m.l, y: y(200), width: iw, height: Math.max(1, y(100) - y(200)), class: "pk-target" }));
    [100, 200].forEach(v => {
      g.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "pk-target-line" }));
      g.appendChild(svgEl("text", { x: W - m.r + 4, y: y(v) + 3, class: "pk-axis-label", "text-anchor": "start" }, `${v}`));
    });
    g.appendChild(svgEl("text", { x: m.l + 8, y: y(200) - 6, class: "pk-axis-label" }, "target band 100–200 pg/mL"));

    // grid / axes
    const yTicks = [];
    for (let v = 0; v <= yMax; v += 200) yTicks.push(v);
    yTicks.forEach(v => {
      g.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "pk-grid" }));
      g.appendChild(svgEl("text", { x: m.l - 10, y: y(v) + 4, class: "pk-axis-label", "text-anchor": "end" }, `${v}`));
    });
    for (let d = 0; d <= DAYS; d += 7) {
      g.appendChild(svgEl("line", { x1: x(d), x2: x(d), y1: m.t, y2: m.t + ih, class: "pk-grid" }));
      g.appendChild(svgEl("text", { x: x(d), y: H - 18, class: "pk-axis-label", "text-anchor": "middle" }, `${d}d`));
    }
    g.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih, class: "pk-axis" }));
    g.appendChild(svgEl("line", { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih, class: "pk-axis" }));
    g.appendChild(svgEl("text", { x: 16, y: m.t + ih / 2, class: "pk-axis-label", transform: `rotate(-90 16 ${m.t + ih / 2})`, "text-anchor": "middle" }, "estradiol (pg/mL, illustrative)"));
    g.appendChild(svgEl("text", { x: m.l + iw / 2, y: H - 4, class: "pk-axis-label", "text-anchor": "middle" }, "days from first injection"));

    // sampling windows
    for (let inj = 0; inj < DAYS; inj += pkInterval) {
      const a = Math.max(0, inj + pkInterval - 2);
      const b = Math.min(DAYS, inj + pkInterval);
      if (b > a) g.appendChild(svgEl("rect", { x: x(a), y: m.t, width: Math.max(1, x(b) - x(a)), height: ih, class: "pk-sample" }));
      if (inj <= DAYS) {
        g.appendChild(svgEl("line", { x1: x(inj), x2: x(inj), y1: m.t, y2: m.t + ih, class: "pk-injection" }));
        g.appendChild(svgEl("circle", { cx: x(inj), cy: m.t + ih + 5, r: 2.5, fill: "var(--muted)" }));
      }
    }

    // curve
    const d = pts.map(([t, c], i) => `${i === 0 ? "M" : "L"} ${x(t).toFixed(2)} ${y(c).toFixed(2)}`).join(" ");
    g.appendChild(svgEl("path", { d, class: "pk-curve" }));

    // peak / trough in the last full interval
    const lastStart = Math.max(0, Math.floor((DAYS - 1) / pkInterval) * pkInterval);
    const segment = pts.filter(([t]) => t >= lastStart && t <= DAYS);
    const peak = segment.reduce((a, b) => b[1] > a[1] ? b : a, segment[0] || [0, 0]);
    const trough = segment.reduce((a, b) => b[1] < a[1] ? b : a, segment[0] || [0, 0]);
    [[peak, "peak"], [trough, "trough"]].forEach(([p, label]) => {
      g.appendChild(svgEl("circle", { cx: x(p[0]), cy: y(p[1]), r: 4, class: "pk-dot" }));
      g.appendChild(svgEl("text", { x: x(p[0]) + 8, y: y(p[1]) - 8, class: "pk-dot-label" }, `${label} ~${Math.round(p[1])}`));
    });

    // readout
    const total = pkDose * Math.round(28 / pkInterval);
    if (pkReadout) {
      pkReadout.innerHTML = `
        <div><span>PEAK</span><b>~${Math.round(peak[1])}</b><small>pg/mL</small></div>
        <div><span>TROUGH</span><b>~${Math.round(trough[1])}</b><small>pg/mL</small></div>
        <div><span>4-WEEK TOTAL</span><b>${total}</b><small>mg</small></div>`;
    }
  }

  doseButtons.forEach(btn => btn.addEventListener("click", () => {
    pkDose = Number(btn.dataset.dose);
    doseButtons.forEach(b => b.classList.toggle("is-active", b === btn));
    renderPk();
  }));
  intervalButtons.forEach(btn => btn.addEventListener("click", () => {
    pkInterval = Number(btn.dataset.interval);
    intervalButtons.forEach(b => b.classList.toggle("is-active", b === btn));
    renderPk();
  }));
  renderPk();

  /* ---------- timeline ---------- */
  const timeline = $("#timeline");
  $("#timePrev")?.addEventListener("click", () => timeline?.scrollBy({ left: -320, behavior: "smooth" }));
  $("#timeNext")?.addEventListener("click", () => timeline?.scrollBy({ left: 320, behavior: "smooth" }));

  /* ---------- archive filter ---------- */
  const archiveSearch = $("#archiveSearch");
  const archiveCards = $$(".archive-card");
  archiveSearch?.addEventListener("input", () => {
    const q = archiveSearch.value.trim().toLowerCase();
    archiveCards.forEach(card => {
      const hay = `${card.textContent} ${card.dataset.keywords || ""}`.toLowerCase();
      card.classList.toggle("is-hidden", q.length > 0 && !hay.includes(q));
    });
  });

  /* ---------- myth cards ---------- */
  $$(".myth-card").forEach(card => {
    card.addEventListener("click", () => {
      const flipped = card.classList.toggle("is-flipped");
      card.setAttribute("aria-pressed", String(flipped));
    });
  });

  /* ---------- command palette ---------- */
  const command = $("#command");
  const commandInput = $("#commandInput");
  const commandResults = $("#commandResults");
  const commandItems = [
    { title: "00 · Executive Summary", meta: "dossier", href: "dossier.html#chapter-00", keys: "overview summary 总览 bottom line" },
    { title: "01 · Product / Official Profile", meta: "dossier", href: "dossier.html#chapter-01", keys: "identity approval price label 产品 说明书" },
    { title: "02 · MtF GAHT Context", meta: "dossier", href: "dossier.html#chapter-02", keys: "guideline Japan WPATH Endocrine insurance 指南 保险" },
    { title: "03 · Safety & Monitoring", meta: "dossier", href: "dossier.html#chapter-03", keys: "VTE breast prolactin liver bone 安全 监测" },
    { title: "04 · Evidence & Literature", meta: "dossier", href: "dossier.html#chapter-04", keys: "PK pharmacokinetics Düsterberg Schug 药代 文献" },
    { title: "05 · Practice, Community & Supply", meta: "dossier", href: "dossier.html#chapter-05", keys: "clinic price community counterfeit 诊所 价格 供应" },
    { title: "06 · Source Ledger", meta: "dossier", href: "dossier.html#chapter-06", keys: "sources URLs references 来源 引用" },
    { title: "07 · FAQ", meta: "dossier", href: "dossier.html#chapter-07", keys: "questions 常见问题" },
    { title: "08 · Verbatim Quotes", meta: "dossier", href: "dossier.html#chapter-08", keys: "Japanese quotes 原文 引用" },
    { title: "09 · Method & Limits", meta: "dossier", href: "dossier.html#chapter-09", keys: "methodology limitations 方法 局限" },
    { title: "Guideline Constellation", meta: "page", href: "#atlas", keys: "WPATH Endocrine AusPATH Sherbourne NHS India Japan dose target" },
    { title: "Risk Body Map", meta: "page", href: "#body", keys: "VTE breast prolactin liver gallbladder bone fertility" },
    { title: "PK Curve Explorer", meta: "page", href: "#clock", keys: "peak trough half-life 3–5 days 4–5 days chart" },
    { title: "2026 Supply Timeline", meta: "page", href: "#fracture", keys: "limited supply shortage Fuji MHLW Peranin" },
    { title: "Myths & Margins", meta: "page", href: "#margins", keys: "myth fact quote FAQ" }
  ];

  let commandIndex = 0;
  let commandFiltered = commandItems;

  const renderCommand = (q = "") => {
    if (!commandResults) return;
    const query = q.trim().toLowerCase();
    commandFiltered = commandItems.filter(item =>
      `${item.title} ${item.keys} ${item.meta}`.toLowerCase().includes(query)
    );
    commandIndex = 0;
    commandResults.innerHTML = commandFiltered.length
      ? commandFiltered.map((item, i) => `<a class="command-result${i === 0 ? " is-active" : ""}" href="${item.href}" data-i="${i}"><b>${item.title}</b><span>${item.meta}</span></a>`).join("")
      : `<div class="command-empty">No match. Try “VTE”, “WPATH”, “supply”, “insurance”.</div>`;
  };

  const openCommand = () => {
    if (!command) return;
    command.hidden = false;
    document.body.classList.add("menu-open");
    commandInput.value = "";
    renderCommand("");
    setTimeout(() => commandInput?.focus(), 40);
  };
  const closeCommand = () => {
    if (!command) return;
    command.hidden = true;
    document.body.classList.remove("menu-open");
  };
  $("#searchBtn")?.addEventListener("click", openCommand);
  $$("[data-close-command]").forEach(el => el.addEventListener("click", closeCommand));
  commandInput?.addEventListener("input", () => renderCommand(commandInput.value));
  commandResults?.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (a) closeCommand();
  });
  document.addEventListener("keydown", e => {
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if ((e.key === "/" && !isTyping) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      command?.hidden ? openCommand() : closeCommand();
      return;
    }
    if (command?.hidden) return;
    if (e.key === "Escape") { closeCommand(); return; }
    if (!commandFiltered.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      commandIndex = (commandIndex + (e.key === "ArrowDown" ? 1 : -1) + commandFiltered.length) % commandFiltered.length;
      $$(".command-result", commandResults).forEach((el, i) => el.classList.toggle("is-active", i === commandIndex));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = commandFiltered[commandIndex];
      if (item) { closeCommand(); window.location.href = item.href; }
    }
  });

  /* ---------- close mobile menu on resize ---------- */
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) closeMenu();
  });
})();

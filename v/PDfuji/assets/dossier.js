/* ============================================================
   Full dossier — search, theme, progress, active file
   ============================================================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  /* theme */
  const stored = localStorage.getItem("pd-theme");
  if (stored === "paper" || stored === "dark") root.dataset.theme = stored;
  $("#themeToggle")?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "paper" ? "dark" : "paper";
    localStorage.setItem("pd-theme", root.dataset.theme);
  });

  /* progress */
  const progress = $("#scrollProgress");
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.width = `${p * 100}%`;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();

  /* file nav active */
  const navLinks = $$(".side-nav a");
  const files = $$(".dossier-file");
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id.replace("chapter-", "");
        navLinks.forEach(a => a.classList.toggle("is-active", a.dataset.nav === id));
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    files.forEach(f => obs.observe(f));
  }

  /* search index */
  const index = [];
  files.forEach(file => {
    const fileNo = file.dataset.file;
    const fileTitle = $(".file-head h1", file)?.textContent || `File ${fileNo}`;
    index.push({ title: `${fileNo} · ${fileTitle}`, meta: "file", href: `#chapter-${fileNo}`, keys: fileTitle });
    $$("h1,h2,h3", file).forEach(h => {
      if (!h.id) return;
      const text = h.textContent.replace(/^#+\s*/, "").trim();
      if (!text) return;
      index.push({
        title: text,
        meta: `FILE ${fileNo} · ${h.tagName}`,
        href: `#${h.id}`,
        keys: `${fileTitle} ${text}`,
      });
    });
  });

  const command = $("#command");
  const input = $("#commandInput");
  const results = $("#commandResults");
  let filtered = index;
  let cursor = 0;

  const render = (q = "") => {
    const query = q.trim().toLowerCase();
    filtered = index.filter(item => `${item.title} ${item.meta} ${item.keys}`.toLowerCase().includes(query)).slice(0, 80);
    cursor = 0;
    results.innerHTML = filtered.length
      ? filtered.map((item, i) => `<a class="command-result${i === 0 ? " is-active" : ""}" href="${item.href}" data-i="${i}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.meta)}</span></a>`).join("")
      : `<div class="command-empty">No match. Try “VTE”, “WPATH”, “supply”, “insurance”, “prolactin”.</div>`;
  };
  const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const open = () => {
    command.hidden = false;
    document.body.classList.add("menu-open");
    input.value = "";
    render("");
    setTimeout(() => input.focus(), 30);
  };
  const close = () => {
    command.hidden = true;
    document.body.classList.remove("menu-open");
  };
  $("#dossierSearchBtn")?.addEventListener("click", open);
  $("#dossierSearchBtn2")?.addEventListener("click", open);
  $$("[data-close-command]").forEach(el => el.addEventListener("click", close));
  input?.addEventListener("input", () => render(input.value));
  results?.addEventListener("click", e => { if (e.target.closest("a")) close(); });

  document.addEventListener("keydown", e => {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      command.hidden ? open() : close();
      return;
    }
    if (command.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (!filtered.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      cursor = (cursor + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length;
      $$(".command-result", results).forEach((el, i) => el.classList.toggle("is-active", i === cursor));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[cursor];
      if (item) { close(); window.location.hash = item.href; }
    }
  });
})();

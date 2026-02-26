/*
  app.js (shared)
  - clock
  - boot sequence (index)
  - toast
  - panic overlay
  - Files list filtering
  - Terminal command parser
*/

(() => {
  "use strict";

  // ====== helpers ======
  const $ = (id) => document.getElementById(id);

  function pad2(n){ return String(n).padStart(2, "0"); }

  // ====== clock ======
  function tickClock(){
    const el = $("clock");
    if(!el) return;
    const d = new Date();
    el.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ====== toast ======
  function toast(title, msg){
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `
      <div class="toast__title">${escapeHtml(title)}</div>
      <div class="toast__msg">${escapeHtml(msg)}</div>
    `;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(6px)"; }, 2400);
    setTimeout(() => t.remove(), 2900);
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  // ====== tiny SFX (no external files) ======
  // You can replace this with actual audio files later.
  function beep(freq=740, ms=70, type="square", vol=0.05){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, ms);
    }catch(_){/* ignore */}
  }

  // click sfx on elements with data-sfx
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-sfx]");
    if(!a) return;
    beep(880, 55, "square", 0.04);
  });

  // ====== visited pages (for future achievements) ======
  try{
    const key = "termui_visited";
    const cur = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    const path = (location.pathname.split("/").pop() || "index.html");
    cur.add(path);
    localStorage.setItem(key, JSON.stringify([...cur]));
  }catch(_){/* ignore */}

  // ====== index boot sequence ======
  const boot = $("boot");
  const bootLines = $("bootLines");
  const menu = $("menu");
  const skipBoot = $("skipBoot");

  const BOOT_SCRIPT = [
    "[SYS] power: ok",
    "[SYS] link: ok",
    "[SYS] checksum: 7f2a-19c0",
    "[IO ] scanning devices...",
    "[IO ] input: online",
    "[IO ] output: online",
    "[SEC] auth: granted",
    "[UI ] loading modules...",
    "[UI ] theme: alert/industrial",
    "[OK ] system online"
  ];

  function showMenu(){
    if(menu) menu.hidden = false;
    if(boot) boot.hidden = true;
    toast("SYSTEM", "オンライン。メニューを選択せよ。");
  }

  if(boot && bootLines && menu){
    let i = 0;
    const step = () => {
      if(i === 0) beep(520, 60, "square", 0.03);
      if(i < BOOT_SCRIPT.length){
        bootLines.textContent += (i ? "\n" : "") + BOOT_SCRIPT[i];
        if(i % 2 === 0) beep(680, 45, "square", 0.02);
        i++;
        setTimeout(step, 220 + Math.random()*160);
      } else {
        setTimeout(showMenu, 420);
      }
    };
    step();

    skipBoot?.addEventListener("click", () => {
      beep(1200, 40, "square", 0.03);
      showMenu();
    });
  }

  // ====== panic overlay ======
  const overlay = $("overlay");
  $("panic")?.addEventListener("click", () => {
    beep(220, 120, "sawtooth", 0.03);
    overlay.hidden = false;
  });
  $("closeOverlay")?.addEventListener("click", () => {
    beep(980, 60, "square", 0.03);
    overlay.hidden = true;
  });

  // ====== FILES page ======
  const FILES_DB = [
    { id:"log-0001", type:"log",  title:"起動ログ / 設計ルール", tag:["ui","spec"], date:"2026-02-26", href:"about.html" },
    { id:"work-0001", type:"work", title:"作品ログ（例）",           tag:["work"],     date:"2026-02-26", href:"#" },
    { id:"link-0001", type:"link", title:"外部リンク（例）",         tag:["link"],     date:"2026-02-26", href:"#" },
  ];

  const list = $("list");
  const q = $("q");
  const filterState = $("filterState");

  let activeFilter = "all";

  function renderFiles(){
    if(!list) return;
    const query = (q?.value || "").trim().toLowerCase();

    const rows = FILES_DB.filter(x => {
      if(activeFilter !== "all" && x.type !== activeFilter) return false;
      if(!query) return true;
      const hay = (x.title + " " + x.tag.join(" ") + " " + x.type).toLowerCase();
      return hay.includes(query);
    });

    list.innerHTML = rows.map(x => {
      const badge = x.type.toUpperCase();
      const tags = x.tag.map(t => `<span class="item__tag mono">${escapeHtml(t)}</span>`).join(" ");
      const href = x.href || "#";
      const btn = href === "#"
        ? `<button class="btn small" type="button" data-open-missing="${escapeHtml(x.id)}">OPEN</button>`
        : `<a class="btn small" href="${escapeHtml(href)}" data-sfx="tap">OPEN</a>`;

      return `
        <div class="item">
          <div class="item__main">
            <h3 class="item__title">${escapeHtml(x.title)}</h3>
            <div class="item__meta">
              <span class="mono">${escapeHtml(badge)}</span>
              <span class="mono">${escapeHtml(x.date)}</span>
              ${tags}
            </div>
          </div>
          <div class="item__actions">
            ${btn}
          </div>
        </div>
      `;
    }).join("") || `<div class="item"><div class="item__main"><h3 class="item__title">no results</h3><div class="item__meta"><span class="mono">try another query</span></div></div></div>`;

    if(filterState) filterState.textContent = activeFilter.toUpperCase();
  }

  if(list){
    renderFiles();

    q?.addEventListener("input", renderFiles);

    document.querySelectorAll("[data-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.getAttribute("data-filter") || "all";
        beep(760, 45, "square", 0.03);
        renderFiles();
      });
    });

    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-open-missing]");
      if(!b) return;
      const id = b.getAttribute("data-open-missing");
      toast("FILES", `未設定: ${id}（FILES_DBのhrefを設定）`);
      beep(300, 90, "sawtooth", 0.02);
    });
  }

  // ====== TERMINAL page ======
  const termOut = $("termOut");
  const termIn = $("termIn");
  const termRun = $("termRun");

  function tprint(line=""){
    if(!termOut) return;
    termOut.textContent += (termOut.textContent ? "\n" : "") + line;
    termOut.scrollTop = termOut.scrollHeight;
  }

  function runCmd(raw){
    const s = (raw || "").trim();
    if(!s) return;

    tprint(`> ${s}`);
    const [cmd, ...rest] = s.split(/\s+/);
    const arg = rest.join(" ").trim();

    switch(cmd.toLowerCase()){
      case "help":
        tprint("commands:");
        tprint("  help            show this help");
        tprint("  open <page>      open page: home / files / about");
        tprint("  clear           clear terminal output");
        tprint("  status          show system status");
        tprint("  theme           toggle accent (alert <-> ok)");
        tprint("  ping            beep test");
        beep(880, 60, "square", 0.03);
        break;

      case "open": {
        const k = arg.toLowerCase();
        const map = {
          "home":"index.html",
          "index":"index.html",
          "files":"files.html",
          "archive":"files.html",
          "about":"about.html",
        };
        const to = map[k];
        if(!to){
          tprint("unknown page. try: open files");
          beep(240, 120, "sawtooth", 0.02);
        } else {
          tprint(`opening: ${to}`);
          beep(980, 60, "square", 0.03);
          setTimeout(() => location.href = to, 180);
        }
        break;
      }

      case "clear":
        if(termOut) termOut.textContent = "";
        beep(700, 40, "square", 0.03);
        break;

      case "status":
        tprint("[SYS] ONLINE");
        tprint("[LINK] OK");
        tprint("[WARN] LEVEL 1");
        beep(660, 55, "square", 0.02);
        break;

      case "theme":
        toggleTheme();
        tprint("theme toggled");
        beep(520, 55, "square", 0.03);
        break;

      case "ping":
        tprint("beep");
        beep(1200, 70, "square", 0.04);
        break;

      default:
        tprint("unknown command. type: help");
        beep(240, 120, "sawtooth", 0.02);
        break;
    }
  }

  function toggleTheme(){
    // very small theme tweak: swap alert/warn to ok-ish.
    const root = document.documentElement;
    const cur = root.style.getPropertyValue("--alert");
    if(cur){
      // already set inline
    }
    const mode = root.getAttribute("data-accent") || "alert";
    if(mode === "alert"){
      root.setAttribute("data-accent","ok");
      root.style.setProperty("--alert", "#2bff9a");
      root.style.setProperty("--warn", "#7cc3ff");
    } else {
      root.setAttribute("data-accent","alert");
      root.style.setProperty("--alert", "#ff2a2a");
      root.style.setProperty("--warn", "#ff7a18");
    }
  }

  if(termOut && termIn){
    tprint("[SYS] terminal ready");
    tprint("type: help");

    const submit = () => {
      const v = termIn.value;
      termIn.value = "";
      runCmd(v);
    };

    termRun?.addEventListener("click", submit);
    termIn.addEventListener("keydown", (e) => {
      if(e.key === "Enter") submit();
    });

    setTimeout(() => termIn.focus(), 120);
  }

})();

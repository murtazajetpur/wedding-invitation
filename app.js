/* =========================================================
   VIDEO-STYLE UI (static, GitHub Pages friendly)
   - FULL LOCK
   - URL-only code: ?code=XXXX
   - No code input on site
   - Show events based on invite
   - RSVP: Attendance Yes/Maybe/No
       - If No => hide event + meal section
   - Meal preference: Veg / Non-veg (only)
   - Count per event (max per function = maxGuests)
   - Submission mocked for now
========================================================= */

const EVENTS = {
  E1: {
    id: "E1",
    title: "Bride Main Reception",
    date: "11 Nov 2026",
    time: "7:00 PM IST",
    venue: "Country Club Hall",
    address: "Country Club, near Nyati Serenity, Nyati County, Undri, Pune, Maharashtra",
    dress: "Western",
    mapsQuery: "Country Club near Nyati Serenity Nyati County Undri Pune Maharashtra"
  },
  E2: {
    id: "E2",
    title: "Mehendi & Sangeet",
    date: "13 Nov 2026",
    time: "4:00 PM IST (Mehendi) • 7:00 PM IST (Sangeet)",
    venue: "Sanskruti Banquet",
    address: "XR55+25V, Dadi Seth Road, near Hotel Regal Palace, Grant Road West, Mumbai, Maharashtra 400007",
    dress: "Traditional",
    mapsQuery: "Sanskruti Banquet Dadi Seth Road Grant Road West Mumbai"
  },
  E3: {
    id: "E3",
    title: "Darees",
    date: "14 Nov 2026",
    time: "4:00 PM IST (Ladies) • 7:00 PM IST (Gents)",
    venue: "Al Saadah Hall",
    address: "7th Floor, Khara Tank Rd, Bhendi Bazaar, Mumbai, Maharashtra 400003",
    dress: "Bohra Clothes",
    mapsQuery: "Al Saadah Hall Khara Tank Rd Bhendi Bazaar Mumbai"
  },
  E4: {
    id: "E4",
    title: "Groom Min Reception (Walima)",
    date: "15 Nov 2026",
    time: "7:00 PM IST",
    venue: "Najam Baug",
    address: "Samantbhai Nanji Marg, Noor Baug, Dongri, Mumbai, Maharashtra 400009",
    dress: "Traditional",
    mapsQuery: "Najam Baug Samantbhai Nanji Marg Dongri Mumbai"
  }
};

/* test codes (replace later with Google Sheet source) */
const INVITES = {
  "ABC123": { family: "Zariwala Family", maxGuests: 4, allowed: ["E1","E2","E3","E4"] },
  "FAM001": { family: "Jetpurwala Family", maxGuests: 6, allowed: ["E2","E3","E4"] },
  "ONEFUNC": { family: "Friends (Reception Only)", maxGuests: 2, allowed: ["E1"] }
};

const SESSION_KEY = "wedding_invite_session_videoStyle_v1";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function mapsLink(query){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.add("hidden"), 2400);
}

function getCodeFromUrl(){
  const url = new URL(window.location.href);
  return (url.searchParams.get("code") || "").trim().toUpperCase();
}

function setSession(obj){
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    ...obj,
    expiresAt: Date.now() + 6*60*60*1000
  }));
}
function getSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(s.expiresAt && Date.now() > s.expiresAt) return null;
    return s;
  }catch{ return null; }
}
function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

function showLock(msg){
  $("#app").classList.add("hidden");
  $("#lockScreen").classList.remove("hidden");
  $("#lockStatus").textContent = msg || "";
}
function showApp(){
  $("#lockScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

/* ---------- bottom nav scroll ---------- */
function bindNav(){
  const map = {
    cover: $("#s-cover"),
    events: $("#s-events"),
    rsvp: $("#s-rsvp"),
    gallery: $("#s-gallery"),
  };

  $$(".bn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.go;
      map[key]?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  // active state while scrolling
  const screens = [
    { id:"cover", el: $("#s-cover") },
    { id:"events", el: $("#s-events") },
    { id:"rsvp", el: $("#s-rsvp") },
    { id:"gallery", el: $("#s-gallery") },
  ];

  const io = new IntersectionObserver((entries) => {
    const vis = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if(!vis) return;
    const found = screens.find(s => s.el === vis.target);
    if(!found) return;
    $$(".bn").forEach(b => b.classList.toggle("active", b.dataset.go === found.id));
  }, { threshold: [0.55, 0.65, 0.75] });

  screens.forEach(s => s.el && io.observe(s.el));

  // buttons inside cover
  $$("[data-go]").forEach(b => {
    b.addEventListener("click", () => {
      const key = b.dataset.go;
      map[key]?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  // lock
  $("#lockBtn").addEventListener("click", () => {
    clearSession();
    toast("Locked 🔒");
    showLock("This invitation is private. Please open using your unique invite link.");
    $("#openInviteBtn").disabled = true;
  });
}

/* ---------- render events ---------- */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function renderEvents(session){
  const list = $("#eventsList");
  list.innerHTML = "";
  const allowed = (session.allowed || []).map(id => EVENTS[id]).filter(Boolean);

  allowed.forEach(ev => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${escapeHtml(ev.title)}</h3>
      <div class="meta">
        <span class="pilltag">${escapeHtml(ev.date)}</span>
        <span class="pilltag">${escapeHtml(ev.time)}</span>
        <span class="pilltag">Dress: ${escapeHtml(ev.dress)}</span>
      </div>
      <div class="addr"><b>${escapeHtml(ev.venue)}</b><br/>${escapeHtml(ev.address)}</div>
      <div class="row">
        <a class="pill" target="_blank" rel="noopener" href="${mapsLink(ev.mapsQuery)}">Open maps</a>
        <button class="pill primary" data-go="rsvp">RSVP</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("[data-go='rsvp']").forEach(b => {
    b.addEventListener("click", () => $("#s-rsvp").scrollIntoView({behavior:"smooth"}));
  });
}

/* ---------- RSVP ---------- */
function buildCountOptions(max){
  const cap = Math.max(1, Number(max || 1));
  let html = `<option value="0">Guests: 0</option>`;
  for(let i=1;i<=cap;i++) html += `<option value="${i}">Guests: ${i}</option>`;
  return html;
}

function renderRsvpEvents(session){
  const wrap = $("#rsvpEvents");
  wrap.innerHTML = "";
  $("#maxGuests").textContent = session.maxGuests ?? "-";

  const allowed = (session.allowed || []).map(id => EVENTS[id]).filter(Boolean);
  allowed.forEach(ev => {
    const row = document.createElement("div");
    row.className = "ev-row";
    row.innerHTML = `
      <div class="ev-left">
        <div class="ev-title">${escapeHtml(ev.title)}</div>
        <div class="ev-sub">${escapeHtml(ev.date)} • ${escapeHtml(ev.time)}</div>
      </div>
      <div class="ev-right">
        <input type="checkbox" class="ev-check" data-ev="${ev.id}" aria-label="Attend ${escapeHtml(ev.title)}"/>
        <select class="ev-count" data-ev="${ev.id}" disabled>
          ${buildCountOptions(session.maxGuests)}
        </select>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.addEventListener("change", (e) => {
    if(e.target.classList.contains("ev-check")){
      const evId = e.target.getAttribute("data-ev");
      const sel = wrap.querySelector(`.ev-count[data-ev="${evId}"]`);
      const on = e.target.checked;
      if(!sel) return;
      sel.disabled = !on;
      if(!on) sel.value = "0";
      if(on && sel.value === "0") sel.value = "1";
    }
  });
}

function bindAttendanceUI(){
  const hidden = $("#rsvpAttendance");
  const details = $("#rsvpDetails");
  const help = $("#attHelp");

  function setAttendance(v){
    hidden.value = v;
    $$(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.att === v));

    if(v === "No"){
      details.classList.add("hidden");
      help.textContent = "No worries — we’ll mark you as not attending.";
    } else if(v === "Yes" || v === "Maybe"){
      details.classList.remove("hidden");
      help.textContent = v === "Maybe" ? "You can update later." : "";
    } else {
      details.classList.add("hidden");
      help.textContent = "";
    }
  }

  $$(".seg-btn").forEach(btn => btn.addEventListener("click", () => setAttendance(btn.dataset.att)));
  setAttendance(""); // initial
}

function bindRsvpSave(){
  $("#rsvpSave").addEventListener("click", () => {
    const name = ($("#rsvpName").value || "").trim();
    const phone = ($("#rsvpPhone").value || "").trim();
    const att = ($("#rsvpAttendance").value || "").trim();
    const meal = ($("#rsvpMeal").value || "").trim();
    const status = $("#rsvpStatus");

    status.textContent = "";

    if(!phone){ toast("Phone is required"); return; }
    if(!att){ toast("Select attendance"); return; }

    if(att === "No"){
      toast("Saved (mock) ✅");
      status.textContent = "Recorded as Not Attending (mock).";
      return;
    }

    const chosen = [];
    const counts = [];
    $$("#rsvpEvents .ev-check").forEach(ch => {
      if(!ch.checked) return;
      const evId = ch.dataset.ev;
      const sel = $(`#rsvpEvents .ev-count[data-ev="${evId}"]`);
      chosen.push(evId);
      counts.push(`${evId}:${sel ? sel.value : 0}`);
    });

    if(!chosen.length){ toast("Select at least one function"); return; }
    if(!meal){ toast("Select meal preference"); return; }

    toast("Saved (mock) ✅");
    status.textContent = `Saved (mock): ${name || "Guest"} • ${att} • ${counts.join(" | ")} • ${meal}`;
  });
}

/* ---------- boot ---------- */
function boot(session){
  renderEvents(session);
  renderRsvpEvents(session);
  bindNav();
  bindAttendanceUI();
  bindRsvpSave();
}

/* ---------- unlock flow ---------- */
async function openAndValidate(code){
  const status = $("#lockStatus");
  const btn = $("#openInviteBtn");
  status.textContent = "";
  btn.disabled = true;

  // tiny "video-like" delay (feels intentional)
  status.textContent = "Opening…";
  await new Promise(r => setTimeout(r, 420));

  status.textContent = "Validating invite…";
  await new Promise(r => setTimeout(r, 320));

  const invite = INVITES[code];
  if(!invite){
    status.textContent = "Invalid link. Please use the invite link shared with you.";
    btn.disabled = false;
    return;
  }

  const session = {
    code,
    family: invite.family,
    maxGuests: invite.maxGuests,
    allowed: invite.allowed
  };
  setSession(session);

  showApp();
  toast("Welcome ✨");
  boot(session);

  // remove ?code from address bar to reduce accidental sharing
  try{
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("code");
    window.history.replaceState({}, "", cleanUrl.toString());
  }catch{}
}

window.addEventListener("load", () => {
  const existing = getSession();
  if(existing){
    showApp();
    boot(existing);
    return;
  }

  const code = getCodeFromUrl();
  const status = $("#lockStatus");
  const btn = $("#openInviteBtn");

  if(!code){
    status.textContent = "This invitation is private. Please open using your unique invite link.";
    btn.disabled = true;
    return;
  }

  status.textContent = "Ready.";
  btn.disabled = false;
  btn.addEventListener("click", () => openAndValidate(code), { once: true });
});

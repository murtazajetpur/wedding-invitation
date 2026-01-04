/* ---------------------------
   Mock invite DB (visual only)
   Later we will replace this with Google Apps Script + Sheets
---------------------------- */

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
    address: "XR55+25V, Dadi Seth Road, near Hotel Regal Palace, Grant Road West, Khareghat Colony, Malabar Hill, Mumbai, Maharashtra 400007",
    dress: "Traditional",
    mapsQuery: "Sanskruti Banquet Dadi Seth Road Grant Road West Mumbai"
  },
  E3: {
    id: "E3",
    title: "Darees",
    date: "14 Nov 2026",
    time: "4:00 PM IST (Ladies) • 7:00 PM IST (Gents)",
    venue: "Al Saadah Hall",
    address: "7th Floor, Khara Tank Rd, Bhendi Bazaar, Kumbharwada, Mumbai, Maharashtra 400003",
    dress: "Bohra Clothes",
    mapsQuery: "Al Saadah Hall Khara Tank Rd Bhendi Bazaar Mumbai"
  },
  E4: {
    id: "E4",
    title: "Groom Min Reception (Walima)",
    date: "15 Nov 2026",
    time: "7:00 PM IST",
    venue: "Najam Baug",
    address: "Samantbhai Nanji Marg, Noor Baug, Dongri, Umerkhadi, Mumbai, Maharashtra 400009",
    dress: "Traditional",
    mapsQuery: "Najam Baug Samantbhai Nanji Marg Dongri Mumbai"
  }
};

// Example codes for testing visuals
const INVITES = {
  "ABC123": { family: "Zariwala Family", maxGuests: 4, allowed: ["E1","E2","E3","E4"] },
  "FAM001": { family: "Jetpurwala Family", maxGuests: 6, allowed: ["E2","E3","E4"] },
  "ONEFUNC": { family: "Friends (Reception Only)", maxGuests: 2, allowed: ["E1"] }
};

const SESSION_KEY = "wedding_visual_session_v1";

/* ---------------------------
   Helpers
---------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.add("hidden"), 2600);
}

function mapsLink(query){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

function showApp(){
  $("#lockScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

function showLock(){
  $("#app").classList.add("hidden");
  $("#lockScreen").classList.remove("hidden");
}

/* ---------------------------
   Unlock flow
---------------------------- */
async function unlock(code){
  const status = $("#lockStatus");
  const env = $("#envelope");
  status.textContent = "Validating invite…";
  env.classList.add("open");

  // tiny delay for the animation to feel intentional
  await new Promise(r => setTimeout(r, 520));

  const invite = INVITES[code];
  if(!invite){
    env.classList.remove("open");
    status.textContent = "Invalid code. Please check your link/code.";
    return;
  }

  setSession({
    code,
    family: invite.family,
    maxGuests: invite.maxGuests,
    allowed: invite.allowed
  });

  status.textContent = "Unlocked ✅";
  toast("Unlocked ✅");
  boot();
}

/* ---------------------------
   Routing (hash routes)
---------------------------- */
function setActiveNav(route){
  $$(".navlink").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function showRoute(route){
  const routes = ["home","events","rsvp","gallery","contact"];
  if(!routes.includes(route)) route = "home";

  routes.forEach(r => {
    const el = $(`#route-${r}`);
    if(!el) return;
    el.classList.toggle("hidden", r !== route);
  });

  setActiveNav(route);
  window.location.hash = route;
}

function attachNav(){
  $$(".navlink").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showRoute(a.dataset.route);
    });
  });

  $$("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => showRoute(btn.dataset.go));
  });

  $("#lockBtn").addEventListener("click", () => {
    clearSession();
    toast("Locked 🔒");
    showLock();
  });
}

/* ---------------------------
   Render events based on invite
---------------------------- */
function renderEvents(session){
  const list = $("#eventsList");
  list.innerHTML = "";

  const allowed = (session.allowed || []).map(id => EVENTS[id]).filter(Boolean);
  if(!allowed.length){
    list.innerHTML = `<p class="small">No events are assigned to this invite code.</p>`;
    return;
  }

  allowed.forEach(ev => {
    const div = document.createElement("div");
    div.className = "event fade-in";
    div.innerHTML = `
      <h3 class="serif">${escapeHtml(ev.title)}</h3>
      <div class="meta">
        <span class="pill">${escapeHtml(ev.date)}</span>
        <span class="pill">${escapeHtml(ev.time)}</span>
        <span class="pill">Dress: ${escapeHtml(ev.dress)}</span>
      </div>
      <div class="hr"></div>
      <p><b>${escapeHtml(ev.venue)}</b><br/>${escapeHtml(ev.address)}</p>
      <div class="actions">
        <a class="btn" target="_blank" rel="noopener" href="${mapsLink(ev.mapsQuery)}">Open in Maps</a>
        <button class="btn primary" data-go="rsvp">RSVP</button>
      </div>
    `;
    list.appendChild(div);
  });
}

/* ---------------------------
   RSVP visualization (per-event counts)
---------------------------- */
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
    row.className = "mini-card";
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <div class="serif" style="font-size:18px; margin-bottom:4px;">${escapeHtml(ev.title)}</div>
          <div class="small">${escapeHtml(ev.date)} • ${escapeHtml(ev.time)}</div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <label class="small" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" class="ev-check" data-ev="${ev.id}"/> Attend
          </label>
          <select class="input ev-count" data-ev="${ev.id}" style="width:150px;" disabled>
            ${buildCountOptions(session.maxGuests)}
          </select>
        </div>
      </div>
    `;
    wrap.appendChild(row);
  });

  wrap.addEventListener("change", (e) => {
    if(e.target.classList.contains("ev-check")){
      const evId = e.target.getAttribute("data-ev");
      const sel = wrap.querySelector(`.ev-count[data-ev="${evId}"]`);
      const on = e.target.checked;
      sel.disabled = !on;
      if(!on) sel.value = "0";
      if(on && sel.value === "0") sel.value = "1";
    }
  });
}

function hookRsvpUI(session){
  const attendance = $("#rsvpAttendance");
  const details = $("#rsvpDetails");
  const status = $("#rsvpStatus");

  function sync(){
    const v = (attendance.value || "").toLowerCase();
    if(v === "no"){
      details.classList.add("hidden");
      status.textContent = "If you select No, we’ll only record non-attendance.";
    } else if(v === "yes" || v === "maybe"){
      details.classList.remove("hidden");
      status.textContent = "";
    } else {
      details.classList.add("hidden");
      status.textContent = "";
    }
  }

  attendance.addEventListener("change", sync);
  sync();

  $("#rsvpSave").addEventListener("click", () => {
    const name = ($("#rsvpName").value || "").trim();
    const phone = ($("#rsvpPhone").value || "").trim();
    const att = ($("#rsvpAttendance").value || "").trim();

    if(!phone) return toast("Phone is required");
    if(!att) return toast("Select attendance");

    if(att.toLowerCase() === "no"){
      toast("Saved (mock) ✅ Marked as No");
      $("#rsvpStatus").textContent = "Saved locally (mock). Backend will be connected later.";
      return;
    }

    const chosen = [];
    const counts = [];
    $$("#rsvpEvents .ev-check").forEach(ch => {
      if(!ch.checked) return;
      const evId = ch.dataset.ev;
      const cntSel = $(`#rsvpEvents .ev-count[data-ev="${evId}"]`);
      chosen.push(evId);
      counts.push(`${evId}:${cntSel ? cntSel.value : 0}`);
    });

    const meal = ($("#rsvpMeal").value || "").trim();

    if(!chosen.length) return toast("Select at least one function");
    if(!meal) return toast("Select meal preference");

    // mock "save"
    toast("Saved (mock) ✅");
    $("#rsvpStatus").textContent =
      `Saved locally (mock): ${name || "Guest"} • ${phone} • ${att} • ${chosen.join(", ")} • ${counts.join(" | ")} • ${meal}`;
  });
}

/* ---------------------------
   Boot app
---------------------------- */
function boot(){
  const session = getSession();
  if(!session){
    showLock();
    return;
  }

  showApp();
  attachNav();

  $("#familyBadge").textContent = session.family || "Invite";
  $("#codeBadge").textContent = `Code: ${session.code}`;

  $("#welcomeLine").textContent =
    `Hi ${session.family || "there"}, we can’t wait to celebrate with you.`;

  renderEvents(session);
  renderRsvpEvents(session);
  hookRsvpUI(session);

  // route from hash or default
  const route = (window.location.hash || "#home").replace("#","");
  showRoute(route);
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ---------------------------
   Init
---------------------------- */
window.addEventListener("load", () => {
  const session = getSession();
  if(session){
    boot();
    return;
  }

  // No session: allow unlock via URL code
  const codeFromUrl = getCodeFromUrl();
  if(codeFromUrl){
    unlock(codeFromUrl);
  } else {
    $("#lockStatus").textContent = "Open your unique invite link to unlock.";
  }

  $("#unlockBtn").addEventListener("click", () => {
    const typed = ($("#codeInput").value || "").trim().toUpperCase();
    if(!typed) return $("#lockStatus").textContent = "Please enter a code.";
    unlock(typed);
  });
});

/* =========================================================
   Scroll Gate Envelope (GSAP + ScrollTrigger)
   - Invite-only via URL ?code=XXXX (no code input)
   - Hero scroll drives envelope open (scrub)
   - When fully open -> snap once to #contentStart
   - After snap -> natural scrolling (kill ScrollTrigger, no interception)
   - Tap center icon -> animate open -> snap (same pipeline)
========================================================= */

gsap.registerPlugin(ScrollTrigger);

// Test codes (replace later with Sheet lookup)
const INVITES = new Set(["ABC123", "FAM001", "ONEFUNC"]);

const lockEl = document.getElementById("lock");
const appEl  = document.getElementById("app");
const lockStatus = document.getElementById("lockStatus");

const openBtn = document.getElementById("openBtn");
const hero = document.getElementById("hero");
const contentStart = document.getElementById("contentStart");

// Envelope parts
const flap = document.querySelector(".flap");
const card = document.querySelector(".card");
const shadow = document.querySelector(".shadow");
const blobs = document.querySelectorAll(".blob");

let isOpened = false;
let isSnapped = false;
let isOpeningViaTap = false;

function getCodeFromUrl(){
  const u = new URL(window.location.href);
  return (u.searchParams.get("code") || "").trim().toUpperCase();
}

function showLock(msg){
  lockEl.classList.remove("hidden");
  appEl.classList.add("hidden");
  lockStatus.textContent = msg || "";
}

function showApp(){
  lockEl.classList.add("hidden");
  appEl.classList.remove("hidden");
}

// Smooth snap helper
function snapToContent(){
  if (isSnapped) return;
  isSnapped = true;
  contentStart.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Build a single animation timeline representing progress 0->1
const tl = gsap.timeline({ paused: true });

// Optional: subtle background parallax
tl.to(blobs[0], { x: 10, y: -8, duration: 1, ease: "none" }, 0);
tl.to(blobs[1], { x: -10, y: -6, duration: 1, ease: "none" }, 0);
tl.to(blobs[2], { y: 10, duration: 1, ease: "none" }, 0);

// Card rises out
tl.to(card, { y: -110, duration: 1, ease: "none" }, 0);

// Flap rotates open
tl.to(flap, { rotateX: 160, duration: 1, transformPerspective: 900, ease: "none" }, 0);

// Shadow expands slightly (depth)
tl.to(shadow, { scale: 1.12, opacity: 0.35, duration: 1, ease: "none" }, 0);

// After open, center button can fade a bit
tl.to(openBtn, { opacity: 0.45, scale: 0.98, duration: 1, ease: "none" }, 0);

// ScrollTrigger gate: adds extra scroll distance to drive the open
let st;

function setupGate(){
  // IMPORTANT:
  // - pin hero while scrubbing
  // - add "end" distance so user can scroll to open
  st = ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "+=900",           // how much scroll drives the open (tune this)
    pin: true,
    scrub: 0.7,             // smoothness (video-like)
    anticipatePin: 1,
    onUpdate(self){
      if (isOpened) return;
      // Drive timeline progress from scroll progress
      tl.progress(self.progress);

      // When near end, snap once and switch to normal
      if (self.progress >= 0.98 && !isOpened){
        isOpened = true;

        // Let the last tiny bit finish
        gsap.to(tl, { progress: 1, duration: 0.18, ease: "power2.out" });

        // Snap and then kill the gate so scroll becomes normal
        snapToContent();

        // Kill after snap starts (small delay avoids jump)
        setTimeout(() => {
          try {
            st.kill(true);
          } catch {}
        }, 450);
      }
    }
  });
}

// Tap shortcut: complete the same open pipeline
function openViaTap(){
  if (isOpened || isOpeningViaTap) return;
  isOpeningViaTap = true;

  // animate timeline to end with premium ease
  gsap.to(tl, {
    progress: 1,
    duration: 0.7,
    ease: "expo.out",
    onComplete(){
      isOpened = true;
      snapToContent();
      setTimeout(() => {
        if (st) {
          try { st.kill(true); } catch {}
        }
        isOpeningViaTap = false;
      }, 450);
    }
  });
}

// Boot
window.addEventListener("load", () => {
  const code = getCodeFromUrl();

  if (!code || !INVITES.has(code)) {
    showLock("Invalid or missing invite link. Example: ?code=ABC123");
    return;
  }

  // Hide lock, show app
  showApp();

  // Remove code from URL (optional privacy)
  try{
    const clean = new URL(window.location.href);
    clean.searchParams.delete("code");
    window.history.replaceState({}, "", clean.toString());
  }catch{}

  // Setup scroll gate
  setupGate();

  // Tap icon triggers open + snap
  openBtn.addEventListener("click", openViaTap, { passive: true });
});

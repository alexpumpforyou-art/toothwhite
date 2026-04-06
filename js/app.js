/* ═══════════════════════════════════════════════════════════
   STRICT SKILLS TEMPLATE — Scroll-Driven Animation Engine
   Padded-cover, circle-wipe hero, deep staggered animations
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const FRAME_SPEED = 1.0; 
  const IMAGE_SCALE = 1.02; // slightly scale to hide border edge pixel glitches
  const FIRST_BATCH = 20;

  const loader      = document.getElementById("loader");
  const loaderBar   = document.getElementById("loader-bar");
  const loaderPct   = document.getElementById("loader-percent");
  const canvas      = document.getElementById("canvas");
  const ctx         = canvas.getContext("2d");
  const scrollBox   = document.getElementById("scroll-container");
  const canvasWrap  = document.getElementById("canvas-wrap");
  const heroSection = document.getElementById("hero");
  const darkOverlay = document.getElementById("dark-overlay");

  const frames = [];
  let currentFrame = 0;
  let totalFrames = 0;
  let bgColor = "#ffffff"; // fallback to white

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  // Split hero heading for animation
  const heading = document.getElementById("hero-heading");
  if (heading) {
    heading.innerHTML = heading.innerHTML
      .split(/<br\s*\/?>/i)
      .map(line => line.split(/\s+/).map(w => `<span class="word">${w}</span>`).join(" "))
      .join("<br>");
  }

  const TOTAL_FRAMES_COUNT = 120; // Hardcoded to prevent 404 console errors from auto-detect

  async function preloadFrames() {
    totalFrames = TOTAL_FRAMES_COUNT;
    
    // Instead of scrolling on scrollBox (which is absolute now), 
    // we set the height of the outer #video-sequence
    const vidSeq = document.getElementById("video-sequence");
    
    if (!totalFrames) { 
      if(vidSeq) vidSeq.style.height = "800vh";
      hideLoader(); 
      return; 
    }

    function preloadImages() {
      let loaded = 0;
      let currentIndex = 1;
      const maxWorkers = 8; // Limit concurrent requests to prevent server hang

      function worker() {
        if (currentIndex > totalFrames) return;
        const idx = currentIndex++;
        const num = (idx).toString().padStart(4, "0");
        const img = new Image();
        const onComplete = () => {
          loaded++;
          if (img.complete && img.naturalWidth !== 0) {
            frames[idx - 1] = img;
             if (idx - 1 === currentFrame) {
              requestAnimationFrame(() => drawFrame(currentFrame));
             }
          }

          const firstBatch = Math.min(10, totalFrames);
          
          if (loaded <= firstBatch) {
            loaderBar.style.width = (loaded / firstBatch) * 100 + "%";
            loaderPct.innerText = Math.round((loaded / firstBatch) * 100) + "%";
          }

          if (loaded === firstBatch) {
            hideLoader();
          } 
          
          if (loaded < totalFrames) {
            worker();
          }
        };

        img.onload = onComplete;
        img.onerror = onComplete;
        img.src = `frames/frame_${num}.webp`;
      }

      // Start workers
      for (let i = 0; i < maxWorkers; i++) worker();
    }

    preloadImages();
    resizeCanvas();
    if(vidSeq) vidSeq.style.height = "500vh";
  }

  function resizeCanvas() {
    const dpr = devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.scale(dpr, dpr);
  }

  function sampleBg(i) {
    bgColor = "#ffffff";
  }

  function drawFrame(i) {
    const img = frames[i]; if (!img) return;
    const cw = canvas.width / (devicePixelRatio || 1);
    const ch = canvas.height / (devicePixelRatio || 1);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    if (i % 20 === 0) sampleBg(i);
  }

  addEventListener("resize", () => { resizeCanvas(); if (frames[currentFrame]) drawFrame(currentFrame); });

  function hideLoader() {
    sampleBg(0);
    drawFrame(0);
    loader.classList.add("hidden");
    lenis.start();
    animateHero();
    initScrollSystem();
  }

  function animateHero() {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.from(".hero-label", { opacity: 0, y: 20, duration: 0.7, ease: "power2.out" })
      .from(".hero-heading .word", { opacity: 0, y: 40, duration: 0.8, stagger: 0.1, ease: "power3.out" }, "-=0.4")
      .from(".hero-tagline", { opacity: 0, y: 20, duration: 0.7, ease: "power2.out" }, "-=0.3");
  }

  function initScrollSystem() {
    gsap.registerPlugin(ScrollTrigger);
    if (totalFrames > 0) initFrameScroll();
    initHeroTransition();
    positionSections();
    initSectionAnimations();
    initCounters();
    initMarquee();
    if (document.getElementById("dark-overlay")) initDarkOverlay(0.44, 0.64); // Matches new Stats bounds

    // New Sections Animations
    initHorizontalGallery();
    initTeamAnimations();
  }

  function initHorizontalGallery() {
    const track = document.getElementById("cases-track");
    if (!track) return;
    
    // Calculate distance to move based on track width vs window width
    function getScrollAmount() {
      return -(track.scrollWidth - window.innerWidth + window.innerWidth * 0.1);
    }

    gsap.to(track, {
      x: getScrollAmount,
      ease: "none",
      scrollTrigger: {
        trigger: ".horizontal-cases",
        start: "top top",
        end: () => `+=${getScrollAmount() * -1}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });
  }

  function initTeamAnimations() {
    const members = document.querySelectorAll(".team-member");
    if(!members.length) return;
    
    members.forEach((member) => {
      gsap.from(member.querySelectorAll(".team-member-name, .team-member-role"), {
        y: 40, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1,
        scrollTrigger: {
          trigger: member,
          start: "top 85%",
        }
      });
    });
  }

  // ─── Hero Reveal ──────────────────────────
  function initHeroTransition() {
    ScrollTrigger.create({
      trigger: scrollBox, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        // Fade hero out quickly
        if(heroSection) heroSection.style.opacity = Math.max(0, 1 - p * 15);
      }
    });
  }

  function initFrameScroll() {
    ScrollTrigger.create({
      trigger: scrollBox, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => {
        const acc = Math.min(self.progress * FRAME_SPEED, 1);
        const idx = Math.min(Math.floor(acc * totalFrames), totalFrames - 1);
        if (idx !== currentFrame) {
          currentFrame = idx;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      },
    });
  }

  function positionSections() {
    const vidSeq = document.getElementById("video-sequence");
    const h = vidSeq ? vidSeq.offsetHeight : scrollBox.offsetHeight;
    
    document.querySelectorAll(".scroll-section:not(.section-hero)").forEach((s) => {
      const enter = parseFloat(s.dataset.enter) / 100;
      const leave = parseFloat(s.dataset.leave) / 100;
      s.style.top = ((enter + leave) / 2) * h + "px";
      s.style.transform = "translateY(-50%)";
    });
  }

  function initSectionAnimations() {
    document.querySelectorAll(".scroll-section:not(.section-hero)").forEach((section) => {
      const type = section.dataset.animation;
      const persist = section.dataset.persist === "true";
      const enter = parseFloat(section.dataset.enter) / 100;
      const leave = parseFloat(section.dataset.leave) / 100;
      const children = section.querySelectorAll(".section-label, .section-heading, .section-body, .cta-button, .stat, .feature-item");

      const tl = gsap.timeline({ paused: true });
      switch (type) {
        case "fade-up":
          tl.from(children, { y: 50, stagger: 0.12, duration: 0.9, ease: "power3.out" }); break;
        case "slide-left":
          tl.from(children, { x: -80, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
        case "slide-right":
          tl.from(children, { x: 80, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
        case "scale-up":
          tl.from(children, { scale: 0.85, stagger: 0.12, duration: 1.0, ease: "power2.out" }); break;
        case "stagger-up":
          tl.from(children, { y: 60, stagger: 0.15, duration: 0.8, ease: "power3.out" }); break;
      }

      ScrollTrigger.create({
        trigger: scrollBox, start: "top top", end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          const fadeDur = 0.03;
          if (p >= enter && p <= leave) {
            const innerP = Math.min(1, (p - enter) / fadeDur);
            section.style.opacity = innerP;
            tl.progress(innerP);
          } else if (p > leave) {
            if (persist) { section.style.opacity = 1; tl.progress(1); }
            else {
              section.style.opacity = Math.max(0, 1 - (p - leave) / fadeOut);
              if (section.style.opacity == 0) { tl.pause(0); }
            }
          } else {
            section.style.opacity = 0; tl.pause(0);
          }
        },
      });
    });
  }

  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const dec = parseInt(el.dataset.decimals || "0");
      const enter = parseFloat(el.closest(".scroll-section").dataset.enter) / 100;
      let done = false;
      ScrollTrigger.create({
        trigger: scrollBox, start: "top top", end: "bottom bottom",
        onUpdate: (self) => {
          if (self.progress >= enter && !done) {
            done = true;
            gsap.fromTo(el, { textContent: 0 }, {
              textContent: target, duration: 2, ease: "power1.out",
              snap: { textContent: dec === 0 ? 1 : 0.01 },
              onUpdate() { el.textContent = parseFloat(el.textContent).toFixed(dec); }
            });
          } else if (self.progress < enter - 0.05 && done) { done = false; el.textContent = "0"; }
        },
      });
    });
  }

  function initMarquee() {
    document.querySelectorAll(".marquee-wrap").forEach((el) => {
      const speed = parseFloat(el.dataset.scrollSpeed) || -25;
      const enter = parseFloat(el.dataset.enter) / 100;
      const leave = parseFloat(el.dataset.leave) / 100;
      gsap.to(el.querySelector(".marquee-text"), {
        xPercent: speed, ease: "none",
        scrollTrigger: { trigger: scrollBox, start: "top top", end: "bottom bottom", scrub: true },
      });
      ScrollTrigger.create({
        trigger: scrollBox, start: "top top", end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress, f = 0.04;
          let o = 0;
          if (p >= enter - f && p <= enter) o = (p - (enter - f)) / f;
          else if (p > enter && p < leave) o = 1;
          else if (p >= leave && p <= leave + f) o = 1 - (p - leave) / f;
          el.style.opacity = o;
        },
      });
    });
  }

  function initDarkOverlay(enter, leave) {
    const f = 0.02; // Reduced to sync fade directly into 2% gaps
    ScrollTrigger.create({
      trigger: scrollBox, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let o = 0;
        if (p >= enter - f && p <= enter) o = (p - (enter - f)) / f;
        else if (p > enter && p < leave) o = 0.88; // 0.88-0.92 from skill
        else if (p >= leave && p <= leave + f) o = 0.88 * (1 - (p - leave) / f);
        darkOverlay.style.opacity = o;
      },
    });
  }

  preloadFrames();
})();

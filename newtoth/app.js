(() => {
  "use strict";

  // =========================
  // DOM
  // =========================
  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");

  const sequenceCanvas = document.getElementById("sequence-canvas");
  const sequenceCtx = sequenceCanvas?.getContext("2d");

  const revealEls = document.querySelectorAll(".reveal");
  const marquee = document.querySelector(".marquee-text");
  const casesTrack = document.getElementById("cases-track");
  const leadForm = document.getElementById("lead-form");

  const scrollSections = [...document.querySelectorAll(".scroll-section")];
  const statNumbers = [...document.querySelectorAll(".stat-number")];
  const videoSequenceSection = document.getElementById("video-sequence");

  // =========================
  // CONFIG
  // =========================
  const CONFIG = {
    frameCount: 120, // если кадров 60 — поменяй здесь на 60
    firstBatch: 12,
    framePath: (i) => `frames/frame_${String(i).padStart(4, "0")}.webp`,
    canvasScale: 1.02,

    sectionFadeWindow: 0.18,
    sectionMoveY: 38,
    sectionMoveX: 70,

    marqueeSpeed: 0.22,
    casesExtraShift: 120,
  };

  // =========================
  // STATE
  // =========================
  let frames = [];
  let currentFrame = 0;
  let loaderHidden = false;
  let rafPending = false;
  let statsAnimated = false;
  let ticking = false;

  // =========================
  // LOADER FALLBACK
  // =========================
  const forceHideLoaderTimeout = setTimeout(() => {
    hideLoader();
  }, 4500);

  // =========================
  // HELPERS
  // =========================
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function hideLoader() {
    if (loaderHidden) return;
    loaderHidden = true;
    loader.classList.add("hidden");
    clearTimeout(forceHideLoaderTimeout);
  }

  // =========================
  // CANVAS
  // =========================
  function resizeSequenceCanvas() {
    if (!sequenceCanvas || !sequenceCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = sequenceCanvas.getBoundingClientRect();

    sequenceCanvas.width = Math.round(rect.width * dpr);
    sequenceCanvas.height = Math.round(rect.height * dpr);

    sequenceCtx.setTransform(1, 0, 0, 1, 0, 0);
    sequenceCtx.scale(dpr, dpr);

    drawSequenceFrame(currentFrame);
  }

  function drawSequenceFrame(index) {
    if (!sequenceCanvas || !sequenceCtx) return;

    const img = frames[index];
    const rect = sequenceCanvas.getBoundingClientRect();

    const cw = rect.width;
    const ch = rect.height;

    sequenceCtx.clearRect(0, 0, cw, ch);

    if (!img || !img.complete) {
      drawFallbackVisual(cw, ch);
      return;
    }

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    const ratio = Math.max(cw / iw, ch / ih) * CONFIG.canvasScale;
    const dw = iw * ratio;
    const dh = ih * ratio;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    sequenceCtx.drawImage(img, dx, dy, dw, dh);
  }

  function requestSequenceDraw(index) {
    currentFrame = index;

    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      drawSequenceFrame(currentFrame);
      rafPending = false;
    });
  }

  function drawFallbackVisual(cw, ch) {
    if (!sequenceCtx) return;

    const gradient = sequenceCtx.createLinearGradient(0, 0, cw, ch);
    gradient.addColorStop(0, "#f8fbff");
    gradient.addColorStop(1, "#e2e8f0");

    sequenceCtx.fillStyle = gradient;
    sequenceCtx.fillRect(0, 0, cw, ch);

    const centerX = cw / 2;
    const centerY = ch / 2;

    sequenceCtx.save();
    sequenceCtx.translate(centerX, centerY);

    const time = currentFrame / CONFIG.frameCount;

    for (let i = 0; i < 5; i++) {
      const radius = 90 + i * 55 + time * 30;
      sequenceCtx.beginPath();
      sequenceCtx.arc(
        Math.sin(time * Math.PI * 2 + i * 0.7) * 18,
        Math.cos(time * Math.PI * 2 + i * 0.7) * 18,
        radius,
        0,
        Math.PI * 2
      );
      sequenceCtx.strokeStyle = `rgba(37,99,235,${0.09 - i * 0.014})`;
      sequenceCtx.lineWidth = 1.5;
      sequenceCtx.stroke();
    }

    sequenceCtx.beginPath();
    sequenceCtx.moveTo(-80, -120);
    sequenceCtx.bezierCurveTo(-130, -20, -100, 80, -40, 130);
    sequenceCtx.bezierCurveTo(-10, 150, 10, 150, 40, 130);
    sequenceCtx.bezierCurveTo(100, 80, 130, -20, 80, -120);
    sequenceCtx.bezierCurveTo(55, -165, -55, -165, -80, -120);
    sequenceCtx.closePath();

    sequenceCtx.fillStyle = "rgba(255,255,255,0.78)";
    sequenceCtx.fill();
    sequenceCtx.strokeStyle = "rgba(15,23,42,0.06)";
    sequenceCtx.lineWidth = 2;
    sequenceCtx.stroke();

    sequenceCtx.restore();
  }

  // =========================
  // PRELOAD
  // =========================
  function preloadFrames() {
    return new Promise((resolve) => {
      let loaded = 0;

      if (!sequenceCanvas) {
        hideLoader();
        resolve();
        return;
      }

      for (let i = 1; i <= CONFIG.frameCount; i++) {
        const img = new Image();

        img.onload = () => {
          frames[i - 1] = img;
          loaded++;
          updateLoader(loaded);

          if (!loaderHidden && loaded >= CONFIG.firstBatch && frames[0]) {
            hideLoader();
            drawSequenceFrame(0);
          }

          if (loaded === CONFIG.frameCount) {
            resolve();
          }
        };

        img.onerror = () => {
          loaded++;
          updateLoader(loaded);

          if (!loaderHidden && loaded >= CONFIG.firstBatch) {
            hideLoader();
          }

          if (loaded === CONFIG.frameCount) {
            resolve();
          }
        };

        img.src = CONFIG.framePath(i);
      }
    });
  }

  function updateLoader(loaded) {
    const visiblePercent = clamp(
      Math.round((loaded / CONFIG.firstBatch) * 100),
      0,
      100
    );

    loaderBar.style.width = `${visiblePercent}%`;
    loaderPercent.textContent = `${visiblePercent}%`;
  }

  // =========================
  // REVEALS
  // =========================
  function initRevealAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // =========================
  // VIDEO SEQUENCE
  // =========================
  function updateVideoSequence() {
    if (!videoSequenceSection) return;

    const rect = videoSequenceSection.getBoundingClientRect();
    const totalScrollable = videoSequenceSection.offsetHeight - window.innerHeight;

    const scrolled = clamp(-rect.top, 0, totalScrollable);
    const progress = totalScrollable > 0 ? scrolled / totalScrollable : 0;

    // frame progression
    const frameIndex = Math.floor(progress * (CONFIG.frameCount - 1));
    requestSequenceDraw(frameIndex);

    // scroll overlay sections
    updateScrollSections(progress);

    // stats
    if (!statsAnimated && progress >= 0.5) {
      statsAnimated = true;
      animateStats();
    }
  }

  function updateScrollSections(progress) {
    scrollSections.forEach((section) => {
      const enter = parseFloat(section.dataset.enter || "0");
      const leave = parseFloat(section.dataset.leave || "1");
      const animation = section.dataset.animation || "fade-up";
      const inner = section.querySelector(".section-inner");

      if (!inner) return;

      const range = leave - enter;
      const local = clamp((progress - enter) / range, 0, 1);
      const isActive = progress >= enter && progress <= leave;

      let opacity = 0;
      let moveX = 0;
      let moveY = CONFIG.sectionMoveY;
      let scale = 0.985;

      if (isActive) {
        const fadeIn = clamp(local / CONFIG.sectionFadeWindow, 0, 1);
        const fadeOut = clamp((1 - local) / CONFIG.sectionFadeWindow, 0, 1);
        opacity = Math.min(fadeIn, fadeOut);

        if (animation === "slide-left") {
          moveX = lerp(-CONFIG.sectionMoveX, 0, opacity);
          moveY = lerp(14, 0, opacity);
        } else if (animation === "slide-right") {
          moveX = lerp(CONFIG.sectionMoveX, 0, opacity);
          moveY = lerp(14, 0, opacity);
        } else if (animation === "stagger-up") {
          moveY = lerp(42, 0, opacity);
        } else {
          moveY = lerp(CONFIG.sectionMoveY, 0, opacity);
        }

        scale = lerp(0.985, 1, opacity);
      }

      section.style.opacity = opacity.toFixed(3);
      inner.style.opacity = opacity.toFixed(3);
      inner.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${scale})`;
    });
  }

  // =========================
  // STATS
  // =========================
  function animateStats() {
    statNumbers.forEach((el) => {
      const target = parseInt(el.dataset.value || "0", 10);
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        const eased = easeOutCubic(progress);
        el.textContent = Math.round(target * eased);

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
    });
  }

  // =========================
  // MARQUEE
  // =========================
  function updateMarquee() {
    if (!marquee) return;
    const y = window.scrollY || window.pageYOffset || 0;
    marquee.style.transform = `translateX(${-((y * CONFIG.marqueeSpeed) % 700)}px)`;
  }

  // =========================
  // CASES
  // =========================
  function updateCases() {
    if (!casesTrack) return;

    const section = document.getElementById("cases");
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const viewportH = window.innerHeight;

    const progress = clamp((viewportH - rect.top) / (viewportH + rect.height), 0, 1);
    const maxShift = Math.max(0, casesTrack.scrollWidth - window.innerWidth + CONFIG.casesExtraShift);

    casesTrack.style.transform = `translate3d(${-progress * maxShift}px, 0, 0)`;
  }

  // =========================
  // FORM
  // =========================
  function initForm() {
    if (!leadForm) return;

    leadForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(leadForm);
      const name = (formData.get("name") || "").toString().trim();
      const phone = (formData.get("phone") || "").toString().trim();
      const service = (formData.get("service") || "").toString().trim();

      if (!name || !phone || !service) {
        alert("Пожалуйста, заполните все поля.");
        return;
      }

      alert("Заявка отправлена. Здесь можно подключить Telegram / CRM / n8n.");
      leadForm.reset();
    });
  }

  // =========================
  // RAF SCROLL LOOP
  // =========================
  function handleScroll() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      updateVideoSequence();
      updateMarquee();
      updateCases();
      ticking = false;
    });
  }

  // =========================
  // INIT
  // =========================
  async function init() {
    resizeSequenceCanvas();

    window.addEventListener("resize", () => {
      resizeSequenceCanvas();
      updateVideoSequence();
      updateCases();
    });

    window.addEventListener("scroll", handleScroll, { passive: true });

    await preloadFrames();

    if (!loaderHidden) {
      hideLoader();
    }

    initRevealAnimations();
    initForm();

    updateVideoSequence();
    updateMarquee();
    updateCases();

    drawSequenceFrame(0);
  }

  init();
})();
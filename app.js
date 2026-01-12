(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // PWA: register service worker (safe, does not affect app logic)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // intentionally silent
      });
    });
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const setupInstallPromo = () => {
    const promo = document.getElementById("installPromo");
    if (!promo) return;

    const primaryBtn = document.getElementById("installPromoPrimary");
    const dismissBtn = document.getElementById("installPromoDismiss");

    if (!primaryBtn || !dismissBtn) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone || window.localStorage.getItem("installPromoDismissed") === "true") {
      return;
    }

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      if (window.localStorage.getItem("installPromoDismissed") === "true") {
        return;
      }
      deferredPrompt = event;
      promo.hidden = false;
    });

    primaryBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } finally {
        promo.hidden = true;
        deferredPrompt = null;
      }
    });

    dismissBtn.addEventListener("click", () => {
      window.localStorage.setItem("installPromoDismissed", "true");
      promo.hidden = true;
      deferredPrompt = null;
    });
  };

  const setupHome = () => {
    const map = document.getElementById("protocolMap");
    const splashOverlay = document.getElementById("splashOverlay");
    if (splashOverlay) {
      const splashShown = window.sessionStorage.getItem("coherenceSplashShown") === "1";
      if (splashShown) {
        splashOverlay.hidden = true;
        splashOverlay.classList.remove("is-visible");
        document.body.classList.remove("splash-active");
      } else {
        window.sessionStorage.setItem("coherenceSplashShown", "1");
        document.body.classList.add("splash-active");
        if (prefersReducedMotion) {
          splashOverlay.classList.add("is-visible");
        } else {
          requestAnimationFrame(() => splashOverlay.classList.add("is-visible"));
        }
        const splashDurationMs = 2300;
        window.setTimeout(() => {
          splashOverlay.classList.remove("is-visible");
          const finalize = () => {
            splashOverlay.hidden = true;
            document.body.classList.remove("splash-active");
            splashOverlay.removeEventListener("transitionend", finalize);
          };
          if (prefersReducedMotion) {
            finalize();
          } else {
            splashOverlay.addEventListener("transitionend", finalize);
          }
        }, splashDurationMs);
      }
    }
    if (!map) return;

    const phaseOverlay = document.getElementById("phaseOverlay");
    const phaseOverlayTitle = document.getElementById("phaseOverlayTitle");
    const phaseOverlayDescription = document.getElementById("phaseOverlayDescription");
    const phaseInstructionsToggle = document.getElementById("phaseInstructionsToggle");
    const phaseInstructionsContent = document.getElementById("phaseInstructionsContent");
    const onboardingOverlay = document.getElementById("onboardingOverlay");
    const onboardingTitle = document.getElementById("onboardingTitle");
    const onboardingBody = document.getElementById("onboardingBody");
    const onboardingNext = document.getElementById("onboardingNext");
    const onboardingSkip = document.getElementById("onboardingSkip");
    const orientationBtn = document.getElementById("orientationBtn");
    const banner = document.getElementById("protocolBanner");
    const bannerBegin = document.getElementById("bannerBegin");
    const bannerDismiss = document.getElementById("bannerDismiss");

    const PROTOCOL_PHASES = {
      0: {
        title: "Arrival",
        description: "Settling into the start of practice.",
        preparation: [
          "Choose neutral conditions (quiet helps, not required). Devices off / airplane mode.",
          "Sit upright or lie down. Spine long, chin slightly tucked, hands relaxed.",
          "Tongue rests lightly on the palate (behind upper front teeth). No pressure.",
          "Optional internal whisper: “I am preparing the field.”",
        ],
        instructions: [
          "Inhale (nose) 6s. Exhale (nose) 6s.",
          "Repeat 12–16 cycles (~2 minutes).",
          "Let the belly rise gently; chest stays soft.",
          "Lightly notice the exhale (softening as breath leaves).",
          "Don’t deepen the breath. Let rhythm do the work.",
        ],
      },
      1: {
        title: "Settling",
        description: "Body and attention begin to organize.",
        instructions: [
          "Inhale (nose) 4s.",
          "Exhale 6s with a gentle hum: “mmm”.",
          "Repeat 20–24 rounds (~4 minutes).",
          "Hum is low volume (barely audible is enough).",
          "Tongue stays resting on palate.",
          "Rest attention in resonance (no analysis, no story).",
        ],
      },
      2: {
        title: "Coherence",
        description: "Breath, body, and awareness align.",
        instructions: [
          "Inhale 4s. Exhale 6s.",
          "After exhale: gentle pause ~2s (not a hold—just the moment after the breath ends).",
          "Repeat 30 cycles (~6 minutes).",
          "During the pause: let breath dissolve; heartbeat goes peripheral; mind “hangs open”.",
          "If the pause feels strained, shorten it. If it disappears naturally, let it.",
        ],
      },
      3: {
        title: "Quieting",
        description: "Less interference; more stability.",
        instructions: [
          "Let breathing become natural (no counting).",
          "Move attention: Palate → Sinuses → Brow → Crown → Chest.",
          "1–2 seconds each point. Sense micro-resonance (vibration/warmth/pressure/spaciousness).",
          "Whisper internally: “open” → release immediately → move on.",
          "Don’t linger at “strong” points. If faint/unclear, continue anyway.",
        ],
      },
      4: {
        title: "Stillness",
        description: "Stillness becomes available without effort.",
        instructions: [
          "Drop effort.",
          "Rest attention in the subtle gap behind the palate (quieter space behind the contact point).",
          "Allow whatever arises without reaction.",
          "Don’t try to maintain stillness; don’t check if it’s working.",
          "Keep it brief: ~2 minutes if newer; up to ~6 if appropriate.",
        ],
        grounding: [
          "Return to a few soft exhales, optionally with gentle humming, for 10–15 cycles (~3 minutes).",
          "Wiggle hands/feet. Feel contact with chair/floor.",
          "Open eyes slowly. Re-enter activity without commentary.",
          "Grounding is not optional.",
        ],
      },
    };

    const onboardingScreens = [
      {
        title: "Welcome",
        body: "This app is for tracking coherence practice—\nnot for perfecting meditation.\n\nYou don’t need to learn anything here before you begin.\nThis orientation is simply to help you relate to the protocol and the app with less effort.",
      },
      {
        title: "About the protocol",
        body: "The coherence protocol is not a ladder and not a sequence to master.\n\nThe phases describe patterns that may appear as the nervous system settles.\nThey don’t need to unfold in order—and they don’t need to appear at all.",
      },
      {
        title: "About practice",
        body: "Practice is not about holding states, reaching stillness, or doing it right.\n\nWhat matters most is how practice shows up after the session—\nin daily life, transitions, and moments of pressure.\n\nThis app tracks those patterns quietly, without scoring or comparison.",
      },
      {
        title: "Using the protocol map",
        body: "The map shows all phases at once so you can orient without moving through them.\n\nYou can tap any phase to learn more—or ignore the map entirely and just practice.\nNothing here needs to be remembered.\n\nYou can revisit this orientation at any time.",
      },
    ];

    let onboardingIndex = 0;

    const getFlag = (key) => window.localStorage.getItem(key) === "true";
    const setFlag = (key, value) => window.localStorage.setItem(key, value ? "true" : "false");

    const setOverlayVisible = (overlay, visible) => {
      if (!overlay) return;
      if (visible) {
        overlay.hidden = false;
        if (prefersReducedMotion) {
          overlay.classList.add("is-visible");
        } else {
          requestAnimationFrame(() => overlay.classList.add("is-visible"));
        }
        return;
      }
      overlay.classList.remove("is-visible");
      if (prefersReducedMotion) {
        overlay.hidden = true;
        return;
      }
      const card = overlay.querySelector(".overlay-card");
      const onEnd = (event) => {
        if (event.target !== card) return;
        overlay.hidden = true;
        overlay.removeEventListener("transitionend", onEnd);
      };
      overlay.addEventListener("transitionend", onEnd);
    };

    const renderParagraphs = (container, text) => {
      container.innerHTML = "";
      text.split("\n\n").forEach((chunk) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = chunk.replace(/\n/g, " ");
        container.appendChild(paragraph);
      });
    };

    const renderInstructionSection = (title, items) => {
      const section = document.createElement("div");
      section.className = "phase-instructions__section";
      if (title) {
        const heading = document.createElement("h3");
        heading.className = "phase-instructions__title";
        heading.textContent = title;
        section.appendChild(heading);
      }
      const list = document.createElement("ul");
      list.className = "phase-instructions__list";
      items.forEach((item) => {
        const bullet = document.createElement("li");
        bullet.textContent = item;
        list.appendChild(bullet);
      });
      section.appendChild(list);
      return section;
    };

    const setInstructionsExpanded = (expanded) => {
      phaseInstructionsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      phaseInstructionsToggle.textContent = expanded ? "Hide instructions" : "Show instructions";
      phaseInstructionsContent.hidden = !expanded;
    };

    const openPhaseOverlay = (phase) => {
      const info = PROTOCOL_PHASES[phase];
      if (!info) return;
      phaseOverlayTitle.textContent = `Phase ${phase} — ${info.title}`;
      phaseOverlayDescription.textContent = info.description;
      phaseInstructionsContent.innerHTML = "";
      if (info.preparation) {
        phaseInstructionsContent.appendChild(renderInstructionSection("Preparation", info.preparation));
      }
      phaseInstructionsContent.appendChild(renderInstructionSection(info.title, info.instructions));
      if (info.grounding) {
        phaseInstructionsContent.appendChild(renderInstructionSection("Grounding", info.grounding));
      }
      setInstructionsExpanded(false);
      setOverlayVisible(phaseOverlay, true);
    };

    const closePhaseOverlay = () => setOverlayVisible(phaseOverlay, false);

    const updateOnboardingScreen = () => {
      const screen = onboardingScreens[onboardingIndex];
      if (!screen) return;
      onboardingTitle.textContent = screen.title;
      renderParagraphs(onboardingBody, screen.body);
      if (onboardingIndex === onboardingScreens.length - 1) {
        onboardingNext.textContent = "Close";
      } else {
        onboardingNext.textContent = "Next";
      }
    };

    const openOnboarding = () => {
      onboardingIndex = 0;
      updateOnboardingScreen();
      setOverlayVisible(onboardingOverlay, true);
    };

    const closeOnboarding = ({ completed = false } = {}) => {
      if (completed) {
        setFlag("protocolOnboardingCompleted", true);
      }
      setFlag("protocolOnboardingDismissed", true);
      banner.hidden = true;
      setOverlayVisible(onboardingOverlay, false);
    };

    map.addEventListener("click", (event) => {
      const node = event.target.closest(".protocol-node");
      if (!node) return;
      const phase = Number(node.dataset.phase);
      if (!Number.isFinite(phase)) return;
      openPhaseOverlay(phase);
    });

    phaseInstructionsToggle.addEventListener("click", () => {
      const expanded = phaseInstructionsToggle.getAttribute("aria-expanded") === "true";
      setInstructionsExpanded(!expanded);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-overlay-close]")) {
        closePhaseOverlay();
      }
      if (event.target.closest("[data-onboarding-close]")) {
        closeOnboarding();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.code === "Escape") {
        if (phaseOverlay && !phaseOverlay.hidden) {
          closePhaseOverlay();
        }
        if (onboardingOverlay && !onboardingOverlay.hidden) {
          closeOnboarding();
        }
      }
    });

    onboardingNext.addEventListener("click", () => {
      if (onboardingIndex < onboardingScreens.length - 1) {
        onboardingIndex += 1;
        updateOnboardingScreen();
      } else {
        closeOnboarding({ completed: true });
      }
    });

    onboardingSkip.addEventListener("click", () => {
      closeOnboarding();
    });

    orientationBtn.addEventListener("click", openOnboarding);
    bannerBegin.addEventListener("click", openOnboarding);
    bannerDismiss.addEventListener("click", () => {
      setFlag("protocolOnboardingDismissed", true);
      banner.hidden = true;
    });

    const dismissed = getFlag("protocolOnboardingDismissed");
    const completed = getFlag("protocolOnboardingCompleted");
    banner.hidden = dismissed || completed;
  };

  const setupPractice = () => {
    const viewButtons = document.querySelectorAll(".segmented__tab");
    const views = document.querySelectorAll(".view");
    const beginFlowBtn = document.getElementById("beginFlow");
    const entrySkipBtn = document.getElementById("entrySkip");
    const entryCancelBtn = document.getElementById("entryCancel");
    const readyCancelBtn = document.getElementById("readyCancel");
    const tagsContinueBtn = document.getElementById("tagsContinue");
    const saveBtn = document.getElementById("saveSession");
    const discardBtn = document.getElementById("discardSession");
    const reviewSummary = document.getElementById("reviewSummary");
    const phaseChips = document.getElementById("phaseChips");
    const tagChips = document.getElementById("tagChips");
    const entryStateChips = document.getElementById("entryStateChips");
    const interferenceChips = document.getElementById("interferenceChips");
    const phase4EstimateChips = document.getElementById("phase4EstimateChips");
    const somaticAnchorChips = document.getElementById("somaticAnchorChips");
    const reentryChips = document.getElementById("reentryChips");
    const historyList = document.getElementById("historyList");
    const phaseFilter = document.getElementById("phaseFilter");
    const tagFilter = document.getElementById("tagFilter");
    const exportBtn = document.getElementById("exportData");
    const importInput = document.getElementById("importData");
    const clearAllBtn = document.getElementById("clearAll");
    const sessionTitle = document.getElementById("sessionProgressTitle");
    const sessionPrompt = document.getElementById("sessionProgressPrompt");
    const sessionCircles = document.querySelectorAll("[data-session-circle]");

    const practiceView = document.querySelector('.view[data-view="practice"]');
    const practiceScreens = practiceView ? practiceView.querySelectorAll("[data-step]") : [];

    let sessionStartMs = null;
    let sessionEndMs = null;
    let frozenDurationSec = null;
    let selectedPhases = new Set();
    let allPhasesSelected = false;
    let selectedTags = [];
    let isActiveSession = false;
    let dbReady = false;
    let dbInitPromise = null;
    let entryState = null;
    let interferenceLevel = null;
    let phase4Estimate = null;
    let somaticAnchor = null;
    let reentryAbrupt = null;
    let sessionCache = new Map();
    let practiceStep = "idle";
    let pulseInterval = null;

    const contextFields = ["sleepQuality", "stressLevel", "dayType", "lifeSmoother", "harderThanUsual"];

    const dbState = {
      db: null,
    };

    const openDatabase = () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("ayvasa_coherence", 1);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
          store.createIndex("endedAt", "endedAt", { unique: false });
          store.createIndex("phases", "phases", { unique: false, multiEntry: true });
          store.createIndex("tags", "tags", { unique: false, multiEntry: true });
        };
        request.onsuccess = () => {
          dbState.db = request.result;
          resolve(request.result);
        };
        request.onerror = () => {
          console.error("IndexedDB open failed:", request.error);
          reject(request.error);
        };
      });
    };

    const getStore = (mode = "readonly") => {
      const tx = dbState.db.transaction("sessions", mode);
      return tx.objectStore("sessions");
    };

    const addSession = (session) => {
      return new Promise((resolve, reject) => {
        const store = getStore("readwrite");
        const request = store.add(session);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.error("IndexedDB add failed:", request.error);
          reject(request.error);
        };
      });
    };

    const updateSession = (session) => {
      return new Promise((resolve, reject) => {
        const store = getStore("readwrite");
        const request = store.put(session);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.error("IndexedDB update failed:", request.error);
          reject(request.error);
        };
      });
    };

    const deleteSession = (id) => {
      return new Promise((resolve, reject) => {
        const store = getStore("readwrite");
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    const clearSessions = () => {
      return new Promise((resolve, reject) => {
        const store = getStore("readwrite");
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    const getAllSessions = () => {
      return new Promise((resolve, reject) => {
        const store = getStore();
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    };

    const renderState = (state) => {
      practiceScreens.forEach((block) => {
        block.hidden = block.dataset.step !== state;
      });
      practiceStep = state;
      if (state === "review") {
        renderReview();
      }
      if (state === "post_phases") {
        updatePhaseChips();
      }
      if (state === "post_tags") {
        updateTagsButtonState();
      }
      if (state === "inSession" && sessionTitle && sessionPrompt) {
        if (isActiveSession) {
          sessionTitle.textContent = "Session in progress";
          sessionPrompt.textContent = "Tap the circle again to end the session.";
        } else {
          sessionTitle.textContent = "Session ended";
          sessionPrompt.textContent = "Tap the circle to return to check-in.";
        }
      }
      updateNextVisibilityForCurrentStep();
    };

    const setView = (view) => {
      views.forEach((section) => {
        section.hidden = section.dataset.view !== view;
      });
      viewButtons.forEach((button) => {
        const isActive = button.dataset.view === view;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
    };

    const clearChipRow = (row) => {
      if (!row) return;
      row.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("is-selected"));
    };

    const setSingleChoice = (row, key, value) => {
      if (!row) return;
      row.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset[key] === value);
      });
    };

    const clearCheckinSelections = () => {
      selectedPhases = new Set();
      allPhasesSelected = false;
      selectedTags = [];
      interferenceLevel = null;
      phase4Estimate = null;
      somaticAnchor = null;
      reentryAbrupt = null;
      clearChipRow(phaseChips);
      clearChipRow(tagChips);
      clearChipRow(interferenceChips);
      clearChipRow(phase4EstimateChips);
      clearChipRow(somaticAnchorChips);
      clearChipRow(reentryChips);
    };

    const clearEntryStateSelection = () => {
      entryState = null;
      clearChipRow(entryStateChips);
    };

    const getElapsedSeconds = () => {
      if (!sessionStartMs) return 0;
      const end = sessionEndMs ?? Date.now();
      return Math.max(0, Math.floor((end - sessionStartMs) / 1000));
    };

    const updateCirclePulse = () => {
      if (!isActiveSession || prefersReducedMotion) return;
      const elapsedMin = getElapsedSeconds() / 60;
      let duration = 4.5;
      if (elapsedMin >= 25) {
        duration = 12;
      } else if (elapsedMin >= 15) {
        duration = 8;
      } else if (elapsedMin >= 5) {
        duration = 6;
      }
      sessionCircles.forEach((circle) => {
        circle.style.setProperty("--pulse-duration", `${duration}s`);
      });
    };

    const setCirclePulsing = (on) => {
      sessionCircles.forEach((circle) => {
        circle.classList.toggle("is-pulsing", on && !prefersReducedMotion);
        if (!on) {
          circle.style.removeProperty("--pulse-duration");
        }
      });
    };

    const startPulseTimer = () => {
      if (prefersReducedMotion) return;
      updateCirclePulse();
      if (pulseInterval) {
        window.clearInterval(pulseInterval);
      }
      pulseInterval = window.setInterval(updateCirclePulse, 12000);
    };

    const stopPulseTimer = () => {
      if (pulseInterval) {
        window.clearInterval(pulseInterval);
        pulseInterval = null;
      }
      setCirclePulsing(false);
    };

    const startSession = ({ entryStateValue = null } = {}) => {
      sessionStartMs = Date.now();
      sessionEndMs = null;
      frozenDurationSec = null;
      entryState = entryStateValue;
      clearCheckinSelections();
      isActiveSession = true;
      setCirclePulsing(true);
      startPulseTimer();
      renderState("inSession");
    };

    const endSession = () => {
      if (!sessionStartMs) return;
      sessionEndMs = Date.now();
      frozenDurationSec = Math.max(0, Math.floor((sessionEndMs - sessionStartMs) / 1000));
      isActiveSession = false;
      stopPulseTimer();
      renderState("post_phases");
    };

    const resetSessionState = () => {
      sessionStartMs = null;
      sessionEndMs = null;
      frozenDurationSec = null;
      isActiveSession = false;
      clearCheckinSelections();
      clearEntryStateSelection();
      stopPulseTimer();
    };

    const cancelSession = ({ confirmActive = false } = {}) => {
      if (confirmActive && sessionStartMs && !sessionEndMs) {
        const elapsedSec = getElapsedSeconds();
        if (elapsedSec > 5) {
          const confirmed = window.confirm("Cancel this session? It won’t be saved.");
          if (!confirmed) return;
        }
      }
      resetSessionState();
      renderState("idle");
    };

    const saveSession = async () => {
      if (!sessionStartMs || !sessionEndMs || frozenDurationSec === null) {
        renderState("idle");
        return;
      }
      if (frozenDurationSec < 10) {
        window.alert("Session too short to save. Practice a bit longer and try again.");
        return;
      }
      await ensureDb();
      const session = {
        startedAt: new Date(sessionStartMs).toISOString(),
        endedAt: new Date(sessionEndMs).toISOString(),
        durationSec: frozenDurationSec,
        phases: allPhasesSelected ? [0, 1, 2, 3, 4] : Array.from(selectedPhases).sort(),
        tags: [...selectedTags],
      };
      if (entryState) {
        session.entryState = entryState;
      }
      if (interferenceLevel) {
        session.interferenceLevel = interferenceLevel;
      }
      if (phase4Estimate) {
        session.phase4Estimate = phase4Estimate;
      }
      if (somaticAnchor) {
        session.somaticAnchor = somaticAnchor;
      }
      if (reentryAbrupt !== null) {
        session.reentryAbrupt = reentryAbrupt;
      }
      await addSession(session);
      resetSessionState();
      renderState("idle");
      setView("history");
      await renderHistory();
    };

    const updatePhaseChips = () => {
      if (!phaseChips) return;
      phaseChips.querySelectorAll(".chip").forEach((chip) => {
        if (chip.dataset.phase === "all") {
          chip.classList.toggle("is-selected", allPhasesSelected);
        } else if (chip.dataset.phase) {
          chip.classList.toggle(
            "is-selected",
            !allPhasesSelected && selectedPhases.has(Number(chip.dataset.phase))
          );
        }
      });
    };

    const togglePhase = (phase) => {
      if (phase === "all") {
        allPhasesSelected = !allPhasesSelected;
        if (allPhasesSelected) {
          selectedPhases.clear();
        }
        updatePhaseChips();
      } else {
        if (allPhasesSelected) {
          allPhasesSelected = false;
          selectedPhases.clear();
        }
        const num = Number(phase);
        if (selectedPhases.has(num)) {
          selectedPhases.delete(num);
        } else {
          selectedPhases.add(num);
        }
        updatePhaseChips();
      }
      if (!shouldIncludePhase4()) {
        phase4Estimate = null;
        clearChipRow(phase4EstimateChips);
      }
    };

    const toggleTag = (tag) => {
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter((item) => item !== tag);
      } else {
        if (selectedTags.length >= 2) {
          return false;
        }
        selectedTags.push(tag);
      }
      tagChips.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", selectedTags.includes(chip.dataset.tag));
      });
      return true;
    };

    const applyFilters = (sessions) => {
      const phaseValue = phaseFilter.value;
      const tagValue = tagFilter.value;
      return sessions.filter((session) => {
        const phaseMatch = phaseValue
          ? session.phases.includes(Number(phaseValue))
          : true;
        const tagMatch = tagValue ? session.tags.includes(tagValue) : true;
        return phaseMatch && tagMatch;
      });
    };

    const buildExtraMeta = (session) => {
      const items = [];
      if (session.entryState) {
        items.push(`Entry: ${session.entryState}`);
      }
      if (session.interferenceLevel) {
        items.push(`Interference: ${session.interferenceLevel}`);
      }
      if (session.phase4Estimate) {
        items.push(`Phase 4: ${session.phase4Estimate}`);
      }
      if (session.somaticAnchor) {
        items.push(`Anchor: ${session.somaticAnchor}`);
      }
      if (session.reentryAbrupt !== undefined && session.reentryAbrupt !== null) {
        items.push(`Re-entry abrupt: ${session.reentryAbrupt ? "yes" : "no"}`);
      }
      if (session.carryover) {
        const delay = Number.isFinite(session.carryoverDelayMin)
          ? ` (${session.carryoverDelayMin} min)`
          : "";
        items.push(`Carryover: ${session.carryover}${delay}`);
      }
      if (session.sleepQuality) {
        items.push(`Sleep: ${session.sleepQuality}`);
      }
      if (session.stressLevel) {
        items.push(`Stress: ${session.stressLevel}`);
      }
      if (session.dayType) {
        items.push(`Day type: ${session.dayType}`);
      }
      if (session.lifeSmoother) {
        items.push(`Life smoother: ${session.lifeSmoother}`);
      }
      if (session.harderThanUsual !== undefined && session.harderThanUsual !== null) {
        items.push(`Harder than usual: ${session.harderThanUsual ? "yes" : "no"}`);
      }
      if (Number.isFinite(session.contextDelayMin)) {
        if (session.contextDelayMin < 60) {
          items.push(`Context delay: ${session.contextDelayMin} min`);
        } else {
          const hours = Math.round((session.contextDelayMin / 60) * 10) / 10;
          items.push(`Context delay: ${hours} hr`);
        }
      }
      return items;
    };

    const updateCarryoverSelection = (form, value) => {
      if (!form) return;
      form.dataset.carryoverValue = value || "";
      form.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset.carryover === value);
      });
    };

    const updateContextSelection = (form, field, value) => {
      if (!form) return;
      if (value === null || value === undefined || value === "") {
        delete form.dataset[field];
      } else {
        form.dataset[field] = value;
      }
      const row = form.querySelector(`[data-context-field=\"${field}\"]`);
      if (!row) return;
      row.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset.context === value);
      });
    };

    const shouldIncludePhase4 = () => allPhasesSelected || selectedPhases.has(4);

    const hasValidPhaseSelection = () => allPhasesSelected || selectedPhases.size > 0;

    const hasValidTagSelection = () => selectedTags.length > 0 && selectedTags.length <= 2;

    const updateNextVisibilityForCurrentStep = () => {
      if (practiceStep === "post_tags" && tagsContinueBtn) {
        const isValid = hasValidTagSelection();
        tagsContinueBtn.hidden = false;
        tagsContinueBtn.disabled = !isValid;
      }
    };

    const updateTagsButtonState = () => {
      updateNextVisibilityForCurrentStep();
    };

    const getPostSteps = () => {
      const steps = ["post_phases", "post_tags", "post_interference"];
      if (shouldIncludePhase4()) {
        steps.push("post_phase4");
      }
      steps.push("post_anchor", "post_reentry", "review");
      return steps;
    };

    const goToNextPostStep = (currentStep) => {
      const steps = getPostSteps();
      const index = steps.indexOf(currentStep);
      if (index >= 0 && index < steps.length - 1) {
        renderState(steps[index + 1]);
      }
    };

    const goToPrevPostStep = (currentStep) => {
      const steps = getPostSteps();
      const index = steps.indexOf(currentStep);
      if (index > 0) {
        renderState(steps[index - 1]);
      } else {
        renderState("inSession");
      }
    };

    const renderReview = () => {
      if (!reviewSummary) return;
      const phasesText = allPhasesSelected
        ? "All phases"
        : selectedPhases.size
          ? Array.from(selectedPhases).sort().join(", ")
          : "—";
      const tagsText = selectedTags.length ? selectedTags.join(", ") : "—";
      const interferenceText = interferenceLevel || "—";
      const phase4Text = phase4Estimate || "—";
      const anchorText = somaticAnchor || "—";
      const reentryText = reentryAbrupt === null ? "—" : reentryAbrupt ? "yes" : "no";
      const entryText = entryState || "—";
      const durationText = frozenDurationSec !== null ? formatDuration(frozenDurationSec) : "—";
      reviewSummary.innerHTML = `
        <div><dt>Duration</dt><dd>${durationText}</dd></div>
        <div><dt>Entry state</dt><dd>${entryText}</dd></div>
        <div><dt>Phases</dt><dd>${phasesText}</dd></div>
        <div><dt>Tags</dt><dd>${tagsText}</dd></div>
        <div><dt>Interference</dt><dd>${interferenceText}</dd></div>
        <div><dt>Phase 4 stillness</dt><dd>${phase4Text}</dd></div>
        <div><dt>Somatic anchor</dt><dd>${anchorText}</dd></div>
        <div><dt>Re-entry abrupt</dt><dd>${reentryText}</dd></div>
      `;
    };

    const renderHistory = async () => {
      await ensureDb();
      const sessions = await getAllSessions();
      const sorted = sessions.sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
      sessionCache = new Map(sorted.map((session) => [session.id, session]));
      const filtered = applyFilters(sorted);
      historyList.innerHTML = "";
      if (!filtered.length) {
        historyList.innerHTML = '<p class="muted">No sessions yet.</p>';
        return;
      }
      filtered.forEach((session) => {
        const card = document.createElement("div");
        card.className = "history-card";
        const date = new Date(session.endedAt).toLocaleString();
        const phasesText = session.phases.length === 5
          ? "All"
          : session.phases.length
            ? session.phases.join(",")
            : "—";
        const tagsText = session.tags.length ? session.tags.join(", ") : "—";
        const extraMeta = buildExtraMeta(session);
        const carryoverLabel = session.carryover ? "Edit carryover" : "Log carryover";
        const hasAllContext = contextFields.every(
          (field) => session[field] !== undefined && session[field] !== null
        );
        const contextLabel = hasAllContext ? "Edit context" : "Add context";
        const showToggle = extraMeta.length > 0;
        const toggleLabel = "View more";
        card.innerHTML = `
          <strong>${date}</strong>
          <div class="history-meta">
            <span>Duration: ${formatDuration(session.durationSec)}</span>
            <span>Phases: ${phasesText}</span>
            <span>Tags: ${tagsText}</span>
          </div>
          ${showToggle ? `
            <div class="history-meta history-meta--secondary" data-extra-meta="${session.id}" hidden>
              ${extraMeta.map((item) => `<span>${item}</span>`).join("")}
            </div>
          ` : ""}
          <div class="history-card__actions">
            ${showToggle ? `<button class="button ghost" data-meta-toggle="${session.id}">${toggleLabel}</button>` : ""}
            <button class="button ghost" data-carryover-toggle="${session.id}">${carryoverLabel}</button>
            <button class="button ghost" data-context-toggle="${session.id}">${contextLabel}</button>
            <button class="button ghost" data-delete="${session.id}">Delete</button>
          </div>
          <div class="carryover-form" data-carryover-form="${session.id}" hidden>
            <div class="field">
              <div class="chip-row">
                <button class="chip" data-carryover="unchanged">unchanged</button>
                <button class="chip" data-carryover="clearer">clearer</button>
                <button class="chip" data-carryover="steadier">steadier</button>
                <button class="chip" data-carryover="heavier">heavier</button>
                <button class="chip" data-carryover="slightly disorganized">slightly disorganized</button>
              </div>
            </div>
            <div class="history-card__actions">
              <button class="button primary" data-carryover-save="${session.id}">Save carryover</button>
              <button class="button ghost" data-carryover-cancel="${session.id}">Cancel</button>
            </div>
          </div>
          <div class="context-form" data-context-form="${session.id}" hidden>
            <div class="field">
              <h4>Sleep quality</h4>
              <div class="chip-row" data-context-field="sleepQuality">
                <button class="chip" data-context="good">good</button>
                <button class="chip" data-context="okay">okay</button>
                <button class="chip" data-context="poor / debt">poor / debt</button>
              </div>
            </div>
            <div class="field">
              <h4>Stress level</h4>
              <div class="chip-row" data-context-field="stressLevel">
                <button class="chip" data-context="low">low</button>
                <button class="chip" data-context="moderate">moderate</button>
                <button class="chip" data-context="high">high</button>
              </div>
            </div>
            <div class="field">
              <h4>Day type</h4>
              <div class="chip-row" data-context-field="dayType">
                <button class="chip" data-context="workday">workday</button>
                <button class="chip" data-context="recovery day">recovery day</button>
                <button class="chip" data-context="travel">travel</button>
                <button class="chip" data-context="illness">illness</button>
                <button class="chip" data-context="atypical day">atypical day</button>
              </div>
            </div>
            <div class="field">
              <h4>Daily life smoother?</h4>
              <div class="chip-row" data-context-field="lifeSmoother">
                <button class="chip" data-context="yes">yes</button>
                <button class="chip" data-context="neutral">neutral</button>
                <button class="chip" data-context="no">no</button>
                <button class="chip" data-context="unclear">unclear</button>
              </div>
            </div>
            <div class="field">
              <h4>Harder than usual?</h4>
              <div class="chip-row" data-context-field="harderThanUsual">
                <button class="chip" data-context="yes">yes</button>
                <button class="chip" data-context="no">no</button>
              </div>
            </div>
            <div class="history-card__actions">
              <button class="button primary" data-context-save="${session.id}">Save context</button>
              <button class="button ghost" data-context-cancel="${session.id}">Cancel</button>
            </div>
          </div>
        `;
        historyList.appendChild(card);
      });
    };

    const exportData = async () => {
      await ensureDb();
      const sessions = await getAllSessions();
      const data = JSON.stringify(sessions, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ayvasa-sessions.json";
      anchor.click();
      URL.revokeObjectURL(url);
    };

    const importData = async (file) => {
      await ensureDb();
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return;
      const existing = await getAllSessions();
      const merged = [...existing];
      data.forEach((session) => {
        const duplicate = existing.find((item) => item.startedAt === session.startedAt);
        if (duplicate) {
          const mergedSession = { ...duplicate };
          Object.entries(session).forEach(([key, value]) => {
            if (mergedSession[key] === undefined || mergedSession[key] === null) {
              mergedSession[key] = value;
            }
          });
          const idx = merged.findIndex((item) => item.startedAt === session.startedAt);
          if (idx >= 0) {
            merged[idx] = mergedSession;
          }
        } else {
          merged.push(session);
        }
      });
      await clearSessions();
      for (const session of merged) {
        const { id, ...rest } = session;
        await addSession(rest);
      }
      await renderHistory();
    };

    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetView = button.dataset.view;
        if (isActiveSession && targetView !== "practice") {
          const ok = window.confirm(
            "You’re about to leave your session. Do you want to proceed?"
          );
          if (!ok) return;
        }
        setView(targetView);
      });
    });

    beginFlowBtn.addEventListener("click", () => {
      clearEntryStateSelection();
      renderState("entryState");
    });
    entrySkipBtn.addEventListener("click", () => {
      clearEntryStateSelection();
      renderState("readyCircle");
    });
    entryCancelBtn.addEventListener("click", () => cancelSession());
    readyCancelBtn.addEventListener("click", () => cancelSession());
    saveBtn.addEventListener("click", saveSession);
    discardBtn.addEventListener("click", () => cancelSession());

    entryStateChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.entryState;
      entryState = value;
      setSingleChoice(entryStateChips, "entryState", entryState);
      renderState("readyCircle");
    });

    phaseChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      togglePhase(button.dataset.phase);
      if (hasValidPhaseSelection()) {
        goToNextPostStep("post_phases");
      }
    });

    tagChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const beforeCount = selectedTags.length;
      const didToggle = toggleTag(button.dataset.tag);
      if (!didToggle) return;
      updateTagsButtonState();
      if (selectedTags.length === 2 && beforeCount < 2) {
        goToNextPostStep("post_tags");
      }
    });

    interferenceChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.interference;
      interferenceLevel = interferenceLevel === value ? null : value;
      setSingleChoice(interferenceChips, "interference", interferenceLevel);
      if (interferenceLevel) {
        goToNextPostStep("post_interference");
      }
    });

    phase4EstimateChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.phase4Estimate;
      phase4Estimate = phase4Estimate === value ? null : value;
      setSingleChoice(phase4EstimateChips, "phase4Estimate", phase4Estimate);
      if (phase4Estimate) {
        goToNextPostStep("post_phase4");
      }
    });

    somaticAnchorChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.somaticAnchor;
      somaticAnchor = somaticAnchor === value ? null : value;
      setSingleChoice(somaticAnchorChips, "somaticAnchor", somaticAnchor);
      if (somaticAnchor) {
        goToNextPostStep("post_anchor");
      }
    });

    reentryChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.reentry;
      const next = value === "yes";
      reentryAbrupt = reentryAbrupt === next ? null : next;
      const selectedValue = reentryAbrupt === null ? null : reentryAbrupt ? "yes" : "no";
      setSingleChoice(reentryChips, "reentry", selectedValue);
      if (reentryAbrupt !== null) {
        goToNextPostStep("post_reentry");
      }
    });

    tagsContinueBtn.addEventListener("click", () => {
      if (!hasValidTagSelection()) return;
      goToNextPostStep("post_tags");
    });

    practiceView.addEventListener("click", (event) => {
      const backBtn = event.target.closest("[data-action=\"back\"]");
      if (backBtn) {
        goToPrevPostStep(practiceStep);
      }
    });

    sessionCircles.forEach((circle) => {
      circle.addEventListener("click", () => {
        if (!sessionStartMs) {
          startSession({ entryStateValue: entryState });
          return;
        }
        if (isActiveSession) {
          endSession();
          return;
        }
        if (sessionEndMs) {
          renderState("post_phases");
        }
      });
    });

    historyList.addEventListener("click", async (event) => {
      const metaToggleBtn = event.target.closest("button[data-meta-toggle]");
      if (metaToggleBtn) {
        const id = Number(metaToggleBtn.dataset.metaToggle);
        const meta = historyList.querySelector(`[data-extra-meta="${id}"]`);
        if (!meta) return;
        const willShow = meta.hidden;
        meta.hidden = !willShow;
        metaToggleBtn.textContent = willShow ? "View less" : "View more";
        return;
      }

      const deleteBtn = event.target.closest("button[data-delete]");
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.delete);
        if (Number.isNaN(id)) return;
        if (window.confirm("Delete this session?")) {
          await deleteSession(id);
          await renderHistory();
        }
        return;
      }

      const toggleBtn = event.target.closest("button[data-carryover-toggle]");
      if (toggleBtn) {
        const id = Number(toggleBtn.dataset.carryoverToggle);
        const form = historyList.querySelector(`[data-carryover-form="${id}"]`);
        const session = sessionCache.get(id);
        if (!form || !session) return;
        if (form.hidden) {
          updateCarryoverSelection(form, session.carryover || null);
          form.hidden = false;
        } else {
          form.hidden = true;
        }
        return;
      }

      const carryoverChip = event.target.closest("button[data-carryover]");
      if (carryoverChip) {
        const form = carryoverChip.closest("[data-carryover-form]");
        if (!form) return;
        const value = carryoverChip.dataset.carryover;
        const nextValue = form.dataset.carryoverValue === value ? null : value;
        updateCarryoverSelection(form, nextValue);
        return;
      }

      const saveCarryoverBtn = event.target.closest("button[data-carryover-save]");
      if (saveCarryoverBtn) {
        const id = Number(saveCarryoverBtn.dataset.carryoverSave);
        const form = historyList.querySelector(`[data-carryover-form="${id}"]`);
        const session = sessionCache.get(id);
        if (!form || !session) return;
        const value = form.dataset.carryoverValue;
        if (!value) {
          window.alert("Select a carryover state before saving.");
          return;
        }
        const endedAtMs = new Date(session.endedAt).getTime();
        const delayMin = Number.isFinite(endedAtMs)
          ? Math.max(0, Math.round((Date.now() - endedAtMs) / 60000))
          : 0;
        await ensureDb();
        await updateSession({
          ...session,
          carryover: value,
          carryoverDelayMin: delayMin,
        });
        await renderHistory();
        return;
      }

      const cancelCarryoverBtn = event.target.closest("button[data-carryover-cancel]");
      if (cancelCarryoverBtn) {
        const id = Number(cancelCarryoverBtn.dataset.carryoverCancel);
        const form = historyList.querySelector(`[data-carryover-form="${id}"]`);
        if (form) {
          form.hidden = true;
        }
        return;
      }

      const contextToggleBtn = event.target.closest("button[data-context-toggle]");
      if (contextToggleBtn) {
        const id = Number(contextToggleBtn.dataset.contextToggle);
        const form = historyList.querySelector(`[data-context-form="${id}"]`);
        const session = sessionCache.get(id);
        if (!form || !session) return;
        if (form.hidden) {
          contextFields.forEach((field) => {
            const value = session[field];
            if (field === "harderThanUsual") {
              const mapped = value === true ? "yes" : value === false ? "no" : null;
              updateContextSelection(form, field, mapped);
            } else {
              updateContextSelection(form, field, value ?? null);
            }
          });
          form.hidden = false;
        } else {
          form.hidden = true;
        }
        return;
      }

      const contextChip = event.target.closest("button[data-context]");
      if (contextChip) {
        const row = contextChip.closest("[data-context-field]");
        const form = contextChip.closest("[data-context-form]");
        if (!row || !form) return;
        const field = row.dataset.contextField;
        const value = contextChip.dataset.context;
        const currentValue = form.dataset[field] || "";
        const nextValue = currentValue === value ? null : value;
        updateContextSelection(form, field, nextValue);
        return;
      }

      const saveContextBtn = event.target.closest("button[data-context-save]");
      if (saveContextBtn) {
        const id = Number(saveContextBtn.dataset.contextSave);
        const form = historyList.querySelector(`[data-context-form=\"${id}\"]`);
        const session = sessionCache.get(id);
        if (!form || !session) return;
        const now = new Date();
        const endedAtMs = new Date(session.endedAt).getTime();
        const delayMin = Number.isFinite(endedAtMs)
          ? Math.max(0, Math.round((now.getTime() - endedAtMs) / 60000))
          : 0;
        const updates = {};
        contextFields.forEach((field) => {
          const value = form.dataset[field] || "";
          if (!value) {
            updates[field] = null;
          } else if (field === "harderThanUsual") {
            updates[field] = value === "yes";
          } else {
            updates[field] = value;
          }
        });
        await ensureDb();
        await updateSession({
          ...session,
          ...updates,
          contextLoggedAt: now.toISOString(),
          contextDelayMin: delayMin,
        });
        await renderHistory();
        return;
      }

      const cancelContextBtn = event.target.closest("button[data-context-cancel]");
      if (cancelContextBtn) {
        const id = Number(cancelContextBtn.dataset.contextCancel);
        const form = historyList.querySelector(`[data-context-form=\"${id}\"]`);
        if (form) {
          form.hidden = true;
        }
      }
    });

    phaseFilter.addEventListener("change", renderHistory);
    tagFilter.addEventListener("change", renderHistory);

    exportBtn.addEventListener("click", exportData);

    importInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      await importData(file);
      event.target.value = "";
    });

    clearAllBtn.addEventListener("click", async () => {
      await ensureDb();
      if (window.confirm("Clear all session data?")) {
        await clearSessions();
        await renderHistory();
      }
    });

    saveBtn.disabled = true;
    exportBtn.disabled = true;
    clearAllBtn.disabled = true;

    const ensureDb = async () => {
      if (dbReady) return;
      if (!dbInitPromise) {
        dbInitPromise = openDatabase().then(() => {
          dbReady = true;
          saveBtn.disabled = false;
          exportBtn.disabled = false;
          clearAllBtn.disabled = false;
        });
      }
      return dbInitPromise;
    };

    updateTagsButtonState();

    ensureDb()
      .then(renderHistory)
      .catch((error) => {
        console.error("IndexedDB init failed:", error);
      });
    renderState("idle");
    setCirclePulsing(false);

    window.addEventListener("beforeunload", (event) => {
      if (!isActiveSession) return;
      event.preventDefault();
      event.returnValue = "";
    });
  };

  const page = document.body.dataset.page;
  if (page === "home") {
    setupHome();
    setupInstallPromo();
  }
  if (page === "practice") {
    setupPractice();
    setupInstallPromo();
  }
})();

(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const setupHome = () => {
    const panels = Array.from(document.querySelectorAll(".panel"));
    if (!panels.length) return;

    const progressFill = document.getElementById("progressFill");
    const panelCount = document.getElementById("panelCount");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const stopBtn = document.getElementById("stopBtn");

    const totalPanels = panels.length;
    let currentIndex = 0;
    let autoplay = true;
    let stopped = false;
    let startTime = 0;
    let rafId = null;
    let timeoutId = null;

    const setButtonState = () => {
      playPauseBtn.classList.remove("is-playing", "is-paused", "is-replay");
      if (currentIndex === totalPanels - 1 && stopped) {
        playPauseBtn.classList.add("is-replay");
        playPauseBtn.setAttribute("aria-label", "Replay");
        return;
      }
      if (autoplay && !stopped) {
        playPauseBtn.classList.add("is-playing");
        playPauseBtn.setAttribute("aria-label", "Pause");
      } else {
        playPauseBtn.classList.add("is-paused");
        playPauseBtn.setAttribute("aria-label", "Play");
      }
    };

    const updateHash = () => {
      history.replaceState(null, "", `#panel-${currentIndex + 1}`);
    };

    const updatePanelDisplay = () => {
      panels.forEach((panel, index) => {
        const isActive = index === currentIndex;
        panel.style.display = isActive ? "block" : "none";
        panel.setAttribute("aria-hidden", String(!isActive));
      });
      panelCount.textContent = `${currentIndex + 1} of ${totalPanels}`;
      updateHash();
      resetProgress();
      setButtonState();
    };

    const resetProgress = () => {
      if (!progressFill) return;
      progressFill.style.width = "0%";
    };

    const setProgress = (ratio) => {
      if (!progressFill) return;
      progressFill.style.width = `${Math.min(ratio, 1) * 100}%`;
    };

    const stopAutoplay = () => {
      autoplay = false;
      stopped = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      resetProgress();
      setButtonState();
    };

    const pauseAutoplay = () => {
      autoplay = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setButtonState();
    };

    const startAutoplay = () => {
      if (stopped && currentIndex === totalPanels - 1) {
        currentIndex = 0;
        stopped = false;
        updatePanelDisplay();
      }
      autoplay = true;
      stopped = false;
      startTime = performance.now();
      setButtonState();
      if (prefersReducedMotion) {
        const panel = panels[currentIndex];
        const duration = Number(panel.dataset.duration) || 15000;
        timeoutId = setTimeout(() => goNext(false), duration);
      } else {
        rafId = requestAnimationFrame(step);
      }
    };

    const step = (timestamp) => {
      if (!autoplay) return;
      const panel = panels[currentIndex];
      const duration = Number(panel.dataset.duration) || 15000;
      const elapsed = timestamp - startTime;
      if (!prefersReducedMotion) {
        setProgress(elapsed / duration);
      }
      if (elapsed >= duration) {
        goNext();
        return;
      }
      rafId = requestAnimationFrame(step);
    };

    const goTo = (index, { manual = false } = {}) => {
      currentIndex = Math.max(0, Math.min(index, totalPanels - 1));
      updatePanelDisplay();
      if (manual) {
        pauseAutoplay();
      }
    };

    const goNext = (manual = false) => {
      if (currentIndex < totalPanels - 1) {
        currentIndex += 1;
        updatePanelDisplay();
        if (autoplay) {
          if (prefersReducedMotion) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            const panel = panels[currentIndex];
            const duration = Number(panel.dataset.duration) || 15000;
            timeoutId = setTimeout(() => goNext(false), duration);
          } else {
            startTime = performance.now();
            rafId = requestAnimationFrame(step);
          }
        }
      } else {
        stopAutoplay();
      }
      if (manual) {
        pauseAutoplay();
      }
    };

    const goPrev = (manual = false) => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        updatePanelDisplay();
      }
      if (manual) {
        pauseAutoplay();
      }
    };

    prevBtn.addEventListener("click", () => goPrev(true));
    nextBtn.addEventListener("click", () => goNext(true));
    stopBtn.addEventListener("click", () => stopAutoplay());
    playPauseBtn.addEventListener("click", () => {
      if (stopped && currentIndex === totalPanels - 1) {
        startAutoplay();
        return;
      }
      if (autoplay) {
        pauseAutoplay();
      } else {
        startAutoplay();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (event.code === "ArrowLeft") {
        goPrev(true);
      }
      if (event.code === "ArrowRight") {
        goNext(true);
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (autoplay) {
          pauseAutoplay();
        } else {
          startAutoplay();
        }
      }
      if (event.code === "KeyS") {
        stopAutoplay();
      }
    });

    window.addEventListener("hashchange", () => {
      const match = window.location.hash.match(/panel-(\d+)/);
      if (match) {
        const idx = Number(match[1]) - 1;
        goTo(idx, { manual: true });
      }
    });

    const initialHash = window.location.hash.match(/panel-(\d+)/);
    if (initialHash) {
      currentIndex = Math.max(0, Math.min(Number(initialHash[1]) - 1, totalPanels - 1));
      autoplay = false;
      stopped = false;
    }

    updatePanelDisplay();
    if (autoplay) {
      startAutoplay();
    } else {
      setButtonState();
    }
  };

  const setupPractice = () => {
    const viewButtons = document.querySelectorAll(".segmented__tab");
    const views = document.querySelectorAll(".view");
    const beginFlowBtn = document.getElementById("beginFlow");
    const entryBeginBtn = document.getElementById("entryBegin");
    const entrySkipBtn = document.getElementById("entrySkip");
    const entryCancelBtn = document.getElementById("entryCancel");
    const readyCancelBtn = document.getElementById("readyCancel");
    const tagsContinueBtn = document.getElementById("tagsContinue");
    const tagsSkipBtn = document.getElementById("tagsSkip");
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
      if (state === "inSession" && sessionTitle && sessionPrompt) {
        if (isActiveSession) {
          sessionTitle.textContent = "Session in progress";
          sessionPrompt.textContent = "Tap the circle again to end the session.";
        } else {
          sessionTitle.textContent = "Session ended";
          sessionPrompt.textContent = "Tap the circle to return to check-in.";
        }
      }
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
        phases: Array.from(selectedPhases).sort(),
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

    const togglePhase = (phase) => {
      if (phase === "all") {
        selectedPhases = new Set([0, 1, 2, 3, 4]);
        phaseChips.querySelectorAll(".chip").forEach((chip) => {
          chip.classList.toggle("is-selected", chip.dataset.phase !== undefined);
        });
        return;
      }
      const num = Number(phase);
      if (selectedPhases.has(num)) {
        selectedPhases.delete(num);
      } else {
        selectedPhases.add(num);
      }
      phaseChips.querySelectorAll(".chip").forEach((chip) => {
        if (chip.dataset.phase === "all") {
          chip.classList.toggle("is-selected", selectedPhases.size === 5);
        } else if (chip.dataset.phase) {
          chip.classList.toggle("is-selected", selectedPhases.has(Number(chip.dataset.phase)));
        }
      });
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
          selectedTags.shift();
        }
        selectedTags.push(tag);
      }
      tagChips.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", selectedTags.includes(chip.dataset.tag));
      });
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
      if (Number.isFinite(session.contextDelayHours)) {
        items.push(`Context delay: ${session.contextDelayHours} hr`);
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

    const shouldIncludePhase4 = () => selectedPhases.size === 5 || selectedPhases.has(4);

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
      const phasesText = selectedPhases.size === 5
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
        card.innerHTML = `
          <strong>${date}</strong>
          <div class="history-meta">
            <span>Duration: ${formatDuration(session.durationSec)}</span>
            <span>Phases: ${phasesText}</span>
            <span>Tags: ${tagsText}</span>
          </div>
          ${extraMeta.length ? `
            <div class="history-meta history-meta--secondary">
              ${extraMeta.map((item) => `<span>${item}</span>`).join("")}
            </div>
          ` : ""}
          <div class="history-card__actions">
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
              <p class="muted">Since this session, did daily life feel smoother?</p>
              <div class="chip-row" data-context-field="lifeSmoother">
                <button class="chip" data-context="yes">yes</button>
                <button class="chip" data-context="neutral">neutral</button>
                <button class="chip" data-context="no">no</button>
                <button class="chip" data-context="unclear">unclear</button>
              </div>
            </div>
            <div class="field">
              <h4>Harder than usual?</h4>
              <p class="muted">Did anything feel harder than usual today?</p>
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
    entryBeginBtn.addEventListener("click", () => renderState("readyCircle"));
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
      entryState = entryState === value ? null : value;
      setSingleChoice(entryStateChips, "entryState", entryState);
    });

    phaseChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      togglePhase(button.dataset.phase);
      if (selectedPhases.size) {
        goToNextPostStep("post_phases");
      }
    });

    tagChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      toggleTag(button.dataset.tag);
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
      goToNextPostStep("post_tags");
    });

    tagsSkipBtn.addEventListener("click", () => {
      selectedTags = [];
      clearChipRow(tagChips);
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
        const delayHours = Number.isFinite(endedAtMs)
          ? Math.max(0, Math.round((now.getTime() - endedAtMs) / 3600000))
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
          contextDelayHours: delayHours,
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
  }
  if (page === "practice") {
    setupPractice();
  }
})();

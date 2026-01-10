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
    const primaryBtn = document.getElementById("primarySessionBtn");
    const cancelBtn = document.getElementById("cancelSession");
    const beginBtn = document.getElementById("beginSession");
    const skipEntryBtn = document.getElementById("skipEntryState");
    const saveBtn = document.getElementById("saveSession");
    const discardBtn = document.getElementById("discardSession");
    const sessionSummary = document.getElementById("sessionSummary");
    const practiceStatus = document.getElementById("practiceStatus");
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
    const sessionIndicator = document.getElementById("sessionIndicator");

    const practiceView = document.querySelector('.view[data-view="practice"]');
    const stateBlocks = practiceView ? practiceView.querySelectorAll("[data-state]") : [];

    let sessionStartMs = null;
    let sessionEndMs = null;
    let frozenDurationSec = null;
    let selectedPhases = new Set();
    let selectedTags = [];
    let isActiveSession = false;
    let statusTimer = null;
    let dbReady = false;
    let dbInitPromise = null;
    let entryState = null;
    let interferenceLevel = null;
    let phase4Estimate = null;
    let somaticAnchor = null;
    let reentryAbrupt = null;
    let sessionCache = new Map();

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
      stateBlocks.forEach((block) => {
        block.hidden = block.dataset.state !== state;
      });
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

    const updatePrimaryBtn = () => {
      primaryBtn.textContent = isActiveSession ? "End Session" : "Start Session";
    };

    const setSessionIndicator = (on) => {
      if (!sessionIndicator) return;
      sessionIndicator.hidden = !on;
    };

    const setStatus = (message) => {
      practiceStatus.textContent = message;
      if (statusTimer) {
        window.clearTimeout(statusTimer);
      }
      if (message) {
        statusTimer = window.setTimeout(() => {
          practiceStatus.textContent = "";
        }, 4000);
      }
    };

    const showPrecheckin = () => {
      clearEntryStateSelection();
      renderState("precheckin");
      setStatus("");
    };

    const startSession = ({ entryStateValue = null } = {}) => {
      sessionStartMs = Date.now();
      sessionEndMs = null;
      frozenDurationSec = null;
      entryState = entryStateValue;
      clearCheckinSelections();
      isActiveSession = true;
      updatePrimaryBtn();
      setSessionIndicator(true);
      renderState("active");
      setStatus("Your practice session has started.");
    };

    const endSession = () => {
      if (!sessionStartMs) return;
      sessionEndMs = Date.now();
      frozenDurationSec = Math.max(0, Math.floor((sessionEndMs - sessionStartMs) / 1000));
      sessionSummary.textContent = `Session length: ${formatDuration(frozenDurationSec)}`;
      isActiveSession = false;
      updatePrimaryBtn();
      setSessionIndicator(false);
      renderState("checkin");
      setStatus("Your practice session has ended.");
    };

    const cancelSession = ({ confirmActive = false } = {}) => {
      if (confirmActive && sessionStartMs && !sessionEndMs) {
        const elapsedSec = getElapsedSeconds();
        if (elapsedSec > 5) {
          const confirmed = window.confirm("Cancel this session? It won’t be saved.");
          if (!confirmed) return;
        }
      }
      sessionStartMs = null;
      sessionEndMs = null;
      frozenDurationSec = null;
      isActiveSession = false;
      updatePrimaryBtn();
      setSessionIndicator(false);
      clearCheckinSelections();
      clearEntryStateSelection();
      renderState("idle");
      setStatus("");
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
      clearCheckinSelections();
      clearEntryStateSelection();
      sessionStartMs = null;
      sessionEndMs = null;
      frozenDurationSec = null;
      renderState("idle");
      setView("history");
      await renderHistory();
      setStatus("");
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
      return items;
    };

    const updateCarryoverSelection = (form, value) => {
      if (!form) return;
      form.dataset.carryoverValue = value || "";
      form.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset.carryover === value);
      });
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
        if (!duplicate) {
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

    primaryBtn.addEventListener("click", () => {
      if (isActiveSession) {
        endSession();
      } else {
        showPrecheckin();
      }
    });
    beginBtn.addEventListener("click", () => startSession({ entryStateValue: entryState }));
    skipEntryBtn.addEventListener("click", () => startSession({ entryStateValue: null }));
    cancelBtn.addEventListener("click", () => cancelSession({ confirmActive: true }));
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
    });

    phase4EstimateChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.phase4Estimate;
      phase4Estimate = phase4Estimate === value ? null : value;
      setSingleChoice(phase4EstimateChips, "phase4Estimate", phase4Estimate);
    });

    somaticAnchorChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.somaticAnchor;
      somaticAnchor = somaticAnchor === value ? null : value;
      setSingleChoice(somaticAnchorChips, "somaticAnchor", somaticAnchor);
    });

    reentryChips.addEventListener("click", (event) => {
      const button = event.target.closest(".chip");
      if (!button) return;
      const value = button.dataset.reentry;
      const next = value === "yes";
      reentryAbrupt = reentryAbrupt === next ? null : next;
      const selectedValue = reentryAbrupt === null ? null : reentryAbrupt ? "yes" : "no";
      setSingleChoice(reentryChips, "reentry", selectedValue);
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
    updatePrimaryBtn();
    setSessionIndicator(false);

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

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
      panelCount.textContent = `Panel ${currentIndex + 1} of ${totalPanels}`;
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
      resetProgress();
      setButtonState();
    };

    const pauseAutoplay = () => {
      autoplay = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
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
      if (!prefersReducedMotion) {
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
        if (autoplay && !prefersReducedMotion) {
          startTime = performance.now();
          rafId = requestAnimationFrame(step);
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
    const startBtn = document.getElementById("startSession");
    const endBtn = document.getElementById("endSession");
    const cancelBtn = document.getElementById("cancelSession");
    const saveBtn = document.getElementById("saveSession");
    const discardBtn = document.getElementById("discardSession");
    const sessionSummary = document.getElementById("sessionSummary");
    const phaseChips = document.getElementById("phaseChips");
    const tagChips = document.getElementById("tagChips");
    const historyList = document.getElementById("historyList");
    const phaseFilter = document.getElementById("phaseFilter");
    const tagFilter = document.getElementById("tagFilter");
    const exportBtn = document.getElementById("exportData");
    const importInput = document.getElementById("importData");
    const clearAllBtn = document.getElementById("clearAll");

    const practiceView = document.querySelector('.view[data-view="practice"]');
    const stateBlocks = practiceView ? practiceView.querySelectorAll("[data-state]") : [];

    let sessionStartMs = null;
    let sessionEndMs = null;
    let frozenDurationSec = null;
    let selectedPhases = new Set();
    let selectedTags = [];

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
        request.onerror = () => reject(request.error);
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
        request.onerror = () => reject(request.error);
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

    const clearSelections = () => {
      selectedPhases = new Set();
      selectedTags = [];
      phaseChips.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("is-selected"));
      tagChips.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("is-selected"));
    };

    const getElapsedSeconds = () => {
      if (!sessionStartMs) return 0;
      const end = sessionEndMs ?? Date.now();
      return Math.max(0, Math.floor((end - sessionStartMs) / 1000));
    };

    const startSession = () => {
      sessionStartMs = Date.now();
      sessionEndMs = null;
      frozenDurationSec = null;
      clearSelections();
      renderState("active");
    };

    const endSession = () => {
      if (!sessionStartMs) return;
      sessionEndMs = Date.now();
      frozenDurationSec = Math.max(0, Math.floor((sessionEndMs - sessionStartMs) / 1000));
      sessionSummary.textContent = `Session length: ${formatDuration(frozenDurationSec)}`;
      renderState("checkin");
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
      clearSelections();
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
      const session = {
        startedAt: new Date(sessionStartMs).toISOString(),
        endedAt: new Date(sessionEndMs).toISOString(),
        durationSec: frozenDurationSec,
        phases: Array.from(selectedPhases).sort(),
        tags: [...selectedTags],
      };
      await addSession(session);
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

    const renderHistory = async () => {
      const sessions = await getAllSessions();
      const sorted = sessions.sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
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
        card.innerHTML = `
          <strong>${date}</strong>
          <div class="history-meta">
            <span>Duration: ${formatDuration(session.durationSec)}</span>
            <span>Phases: ${phasesText}</span>
            <span>Tags: ${tagsText}</span>
          </div>
          <button class="button ghost" data-delete="${session.id}">Delete</button>
        `;
        historyList.appendChild(card);
      });
    };

    const exportData = async () => {
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
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    startBtn.addEventListener("click", startSession);
    endBtn.addEventListener("click", endSession);
    cancelBtn.addEventListener("click", () => cancelSession({ confirmActive: true }));
    saveBtn.addEventListener("click", saveSession);
    discardBtn.addEventListener("click", () => cancelSession());

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

    historyList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-delete]");
      if (!button) return;
      const id = Number(button.dataset.delete);
      if (Number.isNaN(id)) return;
      if (window.confirm("Delete this session?")) {
        await deleteSession(id);
        await renderHistory();
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
      if (window.confirm("Clear all session data?")) {
        await clearSessions();
        await renderHistory();
      }
    });

    openDatabase().then(renderHistory);
    renderState("idle");
  };

  const page = document.body.dataset.page;
  if (page === "home") {
    setupHome();
  }
  if (page === "practice") {
    setupPractice();
  }
})();

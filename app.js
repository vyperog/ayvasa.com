const config = {
  autoplayOnLoad: true,
  pauseOnUserInteraction: true,
  defaultDuration: 18000,
  selectors: {
    panel: ".panel",
    progressBar: "#progress-bar",
    panelCount: "#panel-count",
    backButton: "#back-button",
    nextButton: "#next-button",
    playButton: "#play-button",
    stopButton: "#stop-button",
  },
  hashPrefix: "panel-",
};

const panels = Array.from(document.querySelectorAll(config.selectors.panel));
const progressBar = document.querySelector(config.selectors.progressBar);
const panelCount = document.querySelector(config.selectors.panelCount);
const backButton = document.querySelector(config.selectors.backButton);
const nextButton = document.querySelector(config.selectors.nextButton);
const playButton = document.querySelector(config.selectors.playButton);
const stopButton = document.querySelector(config.selectors.stopButton);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion) {
  document.body.classList.add("reduced-motion");
}

let currentIndex = 0;
let autoplayActive = true;
let stoppedAtEnd = false;
let autoplayTimeoutId = null;
let progressRafId = null;
let progressStartTime = null;
let currentDuration = config.defaultDuration;

const panelCountText = () => `Panel ${currentIndex + 1} of ${panels.length}`;

const readDuration = (panel) => {
  const duration = Number(panel.dataset.duration);
  return Number.isFinite(duration) ? duration : config.defaultDuration;
};

const setPanelVisibility = (panel, isActive) => {
  panel.classList.toggle("active", isActive);
  panel.setAttribute("aria-hidden", isActive ? "false" : "true");
};

const updateHash = () => {
  const newHash = `#${config.hashPrefix}${currentIndex + 1}`;
  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  }
};

const updateControls = () => {
  if (stoppedAtEnd) {
    playButton.textContent = "Replay";
    playButton.classList.add("button--primary");
    return;
  }

  playButton.textContent = autoplayActive ? "Pause" : "Play";
  playButton.classList.toggle("button--primary", autoplayActive);
};

const updatePanelCount = () => {
  panelCount.textContent = panelCountText();
};

const resetProgress = () => {
  progressBar.style.width = "0%";
};

const stopProgressAnimation = () => {
  if (progressRafId) {
    cancelAnimationFrame(progressRafId);
    progressRafId = null;
  }
};

const startProgressAnimation = (duration) => {
  stopProgressAnimation();
  progressStartTime = performance.now();

  const animate = (time) => {
    const elapsed = time - progressStartTime;
    const progress = Math.min(elapsed / duration, 1);
    progressBar.style.width = `${progress * 100}%`;

    if (progress < 1 && autoplayActive) {
      progressRafId = requestAnimationFrame(animate);
    }
  };

  progressRafId = requestAnimationFrame(animate);
};

const clearAutoplayTimer = () => {
  if (autoplayTimeoutId) {
    clearTimeout(autoplayTimeoutId);
    autoplayTimeoutId = null;
  }
};

const stopAutoplay = () => {
  autoplayActive = false;
  clearAutoplayTimer();
  stopProgressAnimation();
  stoppedAtEnd = false;
  updateControls();
};

const pauseAutoplay = () => {
  if (!autoplayActive) {
    return;
  }
  autoplayActive = false;
  clearAutoplayTimer();
  stopProgressAnimation();
  updateControls();
};

const startAutoplay = () => {
  if (autoplayActive) {
    return;
  }
  autoplayActive = true;
  stoppedAtEnd = false;
  updateControls();
  scheduleNext();
};

const scheduleNext = () => {
  clearAutoplayTimer();
  if (!autoplayActive) {
    return;
  }

  if (prefersReducedMotion) {
    progressBar.style.width = "100%";
  } else {
    startProgressAnimation(currentDuration);
  }

  autoplayTimeoutId = setTimeout(() => {
    if (currentIndex === panels.length - 1) {
      autoplayActive = false;
      stoppedAtEnd = true;
      updateControls();
      stopProgressAnimation();
      return;
    }
    goToPanel(currentIndex + 1, { shouldPause: false });
  }, currentDuration);
};

const goToPanel = (index, { shouldPause = config.pauseOnUserInteraction } = {}) => {
  if (index < 0 || index >= panels.length) {
    return;
  }

  panels.forEach((panel, panelIndex) => {
    setPanelVisibility(panel, panelIndex === index);
  });

  currentIndex = index;
  currentDuration = readDuration(panels[currentIndex]);
  updatePanelCount();
  updateHash();
  resetProgress();

  if (shouldPause) {
    pauseAutoplay();
  }

  if (autoplayActive) {
    scheduleNext();
  }
};

const handlePlayPause = () => {
  if (stoppedAtEnd) {
    goToPanel(0, { shouldPause: false });
    autoplayActive = true;
    stoppedAtEnd = false;
    updateControls();
    scheduleNext();
    return;
  }

  if (autoplayActive) {
    pauseAutoplay();
  } else {
    startAutoplay();
  }
};

const handleStop = () => {
  stopAutoplay();
};

const handleBack = () => {
  goToPanel(currentIndex - 1);
};

const handleNext = () => {
  goToPanel(currentIndex + 1);
};

const handleKeydown = (event) => {
  if (event.target.matches("input, textarea, select")) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      handleBack();
      break;
    case "ArrowRight":
      event.preventDefault();
      handleNext();
      break;
    case " ":
      event.preventDefault();
      handlePlayPause();
      break;
    case "s":
    case "S":
      event.preventDefault();
      handleStop();
      break;
    default:
      break;
  }
};

const pauseOnFocus = () => {
  if (config.pauseOnUserInteraction) {
    pauseAutoplay();
  }
};

const getIndexFromHash = () => {
  const hash = window.location.hash.replace("#", "");
  if (!hash.startsWith(config.hashPrefix)) {
    return null;
  }
  const index = Number(hash.replace(config.hashPrefix, "")) - 1;
  if (Number.isNaN(index) || index < 0 || index >= panels.length) {
    return null;
  }
  return index;
};

const initialize = () => {
  const indexFromHash = getIndexFromHash();
  if (indexFromHash !== null) {
    currentIndex = indexFromHash;
    autoplayActive = false;
  } else {
    autoplayActive = config.autoplayOnLoad;
  }

  panels.forEach((panel, panelIndex) => {
    setPanelVisibility(panel, panelIndex === currentIndex);
  });

  currentDuration = readDuration(panels[currentIndex]);
  updatePanelCount();
  updateControls();
  resetProgress();
  updateHash();

  if (autoplayActive) {
    scheduleNext();
  }
};

backButton.addEventListener("click", handleBack);
nextButton.addEventListener("click", handleNext);
playButton.addEventListener("click", handlePlayPause);
stopButton.addEventListener("click", handleStop);

[backButton, nextButton, playButton, stopButton].forEach((button) => {
  button.addEventListener("focus", pauseOnFocus);
});

window.addEventListener("keydown", handleKeydown);
window.addEventListener("hashchange", () => {
  const indexFromHash = getIndexFromHash();
  if (indexFromHash !== null && indexFromHash !== currentIndex) {
    goToPanel(indexFromHash);
  }
});

initialize();

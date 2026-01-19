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

  const isIos = () => {
    const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;
    return (
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
    );
  };

  const isStandalone = () => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  };

  const setupInstallPromo = () => {
    const promo = document.getElementById("installPromo");
    const installBtn = document.getElementById("installPromoPrimary");
    const dismissBtn = document.getElementById("installPromoDismiss");
    const installOverlay = document.getElementById("installOverlay");
    const installOverlayTitle = document.getElementById("installOverlayTitle");
    const installOverlayBody = document.getElementById("installOverlayBody");

    if (!promo || !installBtn || !dismissBtn) return;

    let deferredInstallPrompt = null;
    let canPromptInstall = false;

    if (isStandalone()) {
      promo.hidden = true;
      return;
    }

    const isDismissed = () =>
      window.localStorage.getItem("installPromoDismissed") === "true";
    if (isDismissed()) {
      promo.hidden = true;
      return;
    }

    const renderInstallSteps = (title, steps) => {
      if (!installOverlayTitle || !installOverlayBody) return;
      installOverlayTitle.textContent = title;
      installOverlayBody.innerHTML = "";
      const list = document.createElement("ol");
      list.className = "install-steps";
      steps.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      });
      installOverlayBody.appendChild(list);
    };

    const openInstallOverlay = (title, steps) => {
      if (!installOverlay) return;
      renderInstallSteps(title, steps);
      setOverlayVisible(installOverlay, true);
    };

    promo.hidden = !isIos();

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      canPromptInstall = true;
      if (!isStandalone() && !isDismissed()) {
        promo.hidden = false;
      }
    });

    window.addEventListener("appinstalled", () => {
      window.localStorage.setItem("installPromoDismissed", "true");
      promo.hidden = true;
      deferredInstallPrompt = null;
      canPromptInstall = false;
    });

    installBtn.addEventListener("click", async () => {
      if (isIos()) {
        openInstallOverlay("Install Ayvasa on iOS", [
          "Tap the Share button (square with arrow).",
          "Scroll and tap Add to Home Screen.",
          "Tap Add to confirm.",
        ]);
        return;
      }

      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === "accepted") {
          window.localStorage.setItem("installPromoDismissed", "true");
          promo.hidden = true;
        }
        deferredInstallPrompt = null;
        canPromptInstall = false;
        return;
      }

      if (!canPromptInstall) {
        openInstallOverlay("Install Ayvasa", [
          "Open the browser menu (⋮ or …).",
          "Choose Install app or Add to Home Screen.",
          "Follow the prompt to finish.",
        ]);
      }
    });

    dismissBtn.addEventListener("click", () => {
      window.localStorage.setItem("installPromoDismissed", "true");
      promo.hidden = true;
    });

    if (installOverlay) {
      document.addEventListener("click", (event) => {
        if (event.target.closest("[data-install-close]")) {
          setOverlayVisible(installOverlay, false);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.code === "Escape" && !installOverlay.hidden) {
          setOverlayVisible(installOverlay, false);
        }
      });
    }
  };

  const setupFooterYear = () => {
    const year = new Date().getFullYear();
    document.querySelectorAll(".site-footer__year").forEach((node) => {
      node.textContent = year;
    });
  };

  const setupAoplModal = () => {
    const modal = document.getElementById("aopl-modal");
    const openBtn = document.getElementById("aoplOpenBtn");
    const closeBtn = document.getElementById("aoplCloseBtn");
    if (!modal || !openBtn || !closeBtn) return;

    let lastActive = null;
    let previousOverflow = "";

    const openModal = () => {
      if (!modal.classList.contains("is-hidden")) return;
      lastActive = document.activeElement;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      modal.classList.remove("is-hidden");
      closeBtn.focus();
    };

    const closeModal = () => {
      if (modal.classList.contains("is-hidden")) return;
      modal.classList.add("is-hidden");
      document.body.style.overflow = previousOverflow;
      if (lastActive && typeof lastActive.focus === "function") {
        lastActive.focus();
      }
    };

    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.code === "Escape" && !modal.classList.contains("is-hidden")) {
        closeModal();
      }
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
          "Keep it brief: 2 minutes if newer; up to 6 minutes if appropriate.",
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

  // --- Wiki Logic ---

  const renderMarkdownSafe = (md) => {
    if (!md) return "";

    // 1. Escape HTML
    let safe = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Headings
    safe = safe.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    safe = safe.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    safe = safe.replace(/^# (.*$)/gim, "<h2>$1</h2>");

    // 3. Lists (handle simple hyphen lists)
    safe = safe.replace(/^\- (.*$)/gim, "<li>$1</li>");

    // 4. Inline styles
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 5. Links
    safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const isInternal = url.startsWith("#") || url.startsWith("./");
      const target = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
      return `<a href="${url}"${target}>${text}</a>`;
    });

    // 6. Block processing (Paragraphs & Lists)
    const blocks = safe.split(/\n\n+/);
    return blocks
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("<h")) return trimmed;
        if (trimmed.includes("<li>")) {
          // Wrap list items in ul
          return `<ul>${trimmed}</ul>`;
        }
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");
  };

  const setupWiki = () => {
    const searchInput = document.getElementById("wikiSearch");
    const chipsContainer = document.getElementById("wikiChips");
    const resultsContainer = document.getElementById("wikiResults");
    const sortToggle = document.getElementById("wikiSortToggle");

    const overlay = document.getElementById("wikiOverlay");
    const overlayTitle = document.getElementById("wikiOverlayTitle");
    const overlayMeta = document.getElementById("wikiOverlayMeta");
    const overlayBody = document.getElementById("wikiOverlayBody");
    const overlayRelated = document.getElementById("wikiOverlayRelated");
    const closeButtons = document.querySelectorAll("[data-wiki-close]");

    let allEntries = [];
    let categories = [];
    let activeCategory = "all";
    let sortDirection = window.localStorage.getItem("wikiSortDirection") || "asc"; // "asc" | "desc"

    // --- Rendering ---
    const renderSortToggle = () => {
      if (!sortToggle) return;
      sortToggle.textContent = sortDirection === "asc" ? "A–Z ↓" : "Z–A ↑";
      sortToggle.setAttribute(
        "aria-label",
        sortDirection === "asc" ? "Sorted A to Z. Activate to sort Z to A." : "Sorted Z to A. Activate to sort A to Z."
      );
    };

    const renderChips = () => {
      chipsContainer.innerHTML = "";

      const makeChip = (id, label) => {
        const btn = document.createElement("button");
        btn.className = `chip ${activeCategory === id ? "active" : ""}`;
        btn.textContent = label;
        btn.addEventListener("click", () => {
          activeCategory = id;
          renderChips();
          filterAndRender();
        });
        return btn;
      };

      chipsContainer.appendChild(makeChip("all", "All"));
      categories.forEach(cat => {
        chipsContainer.appendChild(makeChip(cat.id, cat.title));
      });
    };

    const renderEntryCard = (entry) => {
      const cat = categories.find(c => c.id === entry.category);
      const div = document.createElement("button");
      div.className = "wiki-card";
      div.setAttribute("type", "button");
      div.innerHTML = `
        <div class="wiki-card__title">${entry.title}</div>
        <div class="wiki-card__category">${cat ? cat.title : entry.category}</div>
        <div class="wiki-card__summary">${entry.summary}</div>
      `;
      div.addEventListener("click", () => {
        openEntry(entry.slug);
      });
      return div;
    };

    const filterAndRender = () => {
      const query = searchInput.value.toLowerCase().trim();
      resultsContainer.innerHTML = "";

      const filtered = allEntries.filter(entry => {
        const matchesCategory = activeCategory === "all" || entry.category === activeCategory;
        const searchTarget = (entry.title + " " + entry.summary + " " + (entry.aliases || []).join(" ")).toLowerCase();
        const matchesSearch = !query || searchTarget.includes(query);
        return matchesCategory && matchesSearch;
      });

      filtered.sort((a, b) =>
        (a.title || "").localeCompare((b.title || ""), undefined, { sensitivity: "base" })
      );

      if (sortDirection === "desc") {
        filtered.reverse();
      }

      if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="wiki-empty">No entries found.</div>`;
        return;
      }

      filtered.forEach(entry => {
        resultsContainer.appendChild(renderEntryCard(entry));
      });
    };

    // --- Overlay / Entry Logic ---
    const openEntry = async (slug) => {
      const entry = allEntries.find(e => e.slug === slug);
      if (!entry) return;

      // Update URL hash
      window.location.hash = `/${slug}`;

      overlayTitle.textContent = entry.title;
      overlayMeta.innerHTML = "";
      overlayBody.innerHTML = "<p>Loading...</p>";
      overlayRelated.innerHTML = "";
      overlayRelated.hidden = true;

      // Meta chips (Category)
      const cat = categories.find(c => c.id === entry.category);
      if (cat) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = cat.title;
        overlayMeta.appendChild(chip);
      }

      setOverlayVisible(overlay, true);

      // Fetch MD
      try {
        const res = await fetch(entry.md);
        if (res.ok) {
          const text = await res.text();
          overlayBody.innerHTML = renderMarkdownSafe(text);

          // Wire up internal hash links in rendered content
          overlayBody.querySelectorAll('a[href^="#/"]').forEach(link => {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              const hash = link.getAttribute("href"); // #/slug
              const nextSlug = hash.replace("#/", "");
              openEntry(nextSlug);
            });
          });
        } else {
          overlayBody.innerHTML = "<p>Error loading content.</p>";
        }
      } catch (err) {
        overlayBody.innerHTML = "<p>Error loading content.</p>";
      }

      // Related
      if (entry.related && entry.related.length > 0) {
        overlayRelated.innerHTML = "";
        overlayRelated.hidden = false;
        entry.related.forEach(relSlug => {
          const relEntry = allEntries.find(e => e.slug === relSlug);
          if (relEntry) {
            const btn = document.createElement("button");
            btn.className = "chip";
            btn.textContent = relEntry.title;
            btn.addEventListener("click", () => openEntry(relSlug));
            overlayRelated.appendChild(btn);
          }
        });
      }
    };

    const closeOverlay = () => {
      setOverlayVisible(overlay, false);
      // Clear hash without scroll jump
      history.pushState("", document.title, window.location.pathname + window.location.search);
    };

    // --- Event Listeners ---
    searchInput.addEventListener("input", filterAndRender);

    if (sortToggle) {
      sortToggle.addEventListener("click", () => {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
        window.localStorage.setItem("wikiSortDirection", sortDirection);
        renderSortToggle();
        filterAndRender();
      });
    }

    closeButtons.forEach(btn => btn.addEventListener("click", closeOverlay));

    // Close on ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) closeOverlay();
    });

    // Handle back button / hash change
    window.addEventListener("hashchange", () => {
      processHash();
    });

    const processHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#/")) {
        const slug = hash.substring(2);
        if (slug) openEntry(slug);
      } else {
        if (!overlay.hidden) closeOverlay();
      }
    };

    // --- Init ---
    if (window.location.protocol === "file:") {
      resultsContainer.innerHTML = `
        <div class="wiki-empty">
          <p><strong>Local Filesystem Detected</strong></p>
          <p>Browsers block loading external data (JSON/Markdown) via <code>file://</code> protocol for security.</p>
          <p>To view the Wiki locally, please run a local web server (e.g., <code>python3 -m http.server</code>) or view via VS Code Live Server.</p>
        </div>
      `;
      return;
    }

    // Add cache busting to ensure fresh data
    fetch(`wiki/index.json?t=${new Date().getTime()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        categories = data.categories || [];
        allEntries = data.entries || [];
        renderSortToggle();
        renderChips();
        filterAndRender();
        processHash(); // Check initial hash
      })
      .catch(err => {
        console.error("Failed to load wiki index:", err);
        resultsContainer.innerHTML = `
          <div class="wiki-empty">
            <p>Unable to load Wiki data.</p>
            <p class="muted">${err.message}</p>
          </div>
        `;
      });
  };

  // --- IndexedDB & Shared Helpers ---

  const dbState = {
    db: null,
  };

  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      if (dbState.db) {
        resolve(dbState.db);
        return;
      }
      const request = indexedDB.open("ayvasa_coherence", 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("sessions")) {
          const store = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
          store.createIndex("endedAt", "endedAt", { unique: false });
          store.createIndex("phases", "phases", { unique: false, multiEntry: true });
          store.createIndex("tags", "tags", { unique: false, multiEntry: true });
        }
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

  // --- Sessions Heatmap Logic ---

  const setupSessionsGraph = (ensureDbFn) => {
    const container = document.querySelector(".sessions-graph");
    const heatmapEl = document.getElementById("sessionsHeatmap");
    const hints = document.querySelector(".sessions-graph__header");

    if (!container || !heatmapEl) return null;

    const rangeButtons = document.querySelectorAll("[data-heatmap-range]");
    let currentRangeDays = 30; // default

    const renderHeatmap = (sessions, rangeDays) => {
      heatmapEl.innerHTML = "";

      // Build map: YYYY-MM-DD -> count
      const counts = new Map();
      sessions.forEach(s => {
        if (!s.endedAt) return;
        const key = s.endedAt.split("T")[0];
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      // Calculate date range
      // End date = Today
      // Start date = Today - (rangeDays - 1)
      // Pad start date backwards to Sunday (or Monday) to square off the grid?
      // Actually, GitHub style usually fills columns left-to-right.
      // We'll prioritize filling N cols ending today.

      const today = new Date();
      // Reset time to end of day or just use date arithmetic carefully
      today.setHours(0, 0, 0, 0); // We only care about date key

      // Generate dates
      const dates = [];
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d);
      }
      dates.reverse(); // Oldest first

      // Calculate columns needed (rows fixed at 7)
      // We want strict 7-row grid (Sun-Sat).
      // Align the first date to its weekday.

      // 1. Determine start date
      // 2. Pad previous days with null placeholders to align to Sunday (0)

      const startDate = dates[0];
      const startDay = startDate.getDay(); // 0=Sun

      const gridCells = [];

      // Pad start
      for (let i = 0; i < startDay; i++) {
        gridCells.push(null);
      }

      // Add actual dates
      dates.forEach(d => gridCells.push(d));

      // Pad end if desired, or just let css grid auto-flow

      // Render
      gridCells.forEach(dateObj => {
        const cell = document.createElement("div");
        cell.className = "sessions-heatmap__cell";

        if (!dateObj) {
          cell.classList.add("is-empty");
          cell.style.background = "transparent";
        } else {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          const key = `${year}-${month}-${day}`;

          const count = counts.get(key) || 0;
          const level = Math.min(count, 4);
          cell.classList.add(`level-${level}`);

          // Tooltip
          const userDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const label = count === 1 ? "1 session" : `${count} sessions`;
          cell.title = `${userDate} — ${label}`;
        }
        heatmapEl.appendChild(cell);
      });

      // Update number of columns dynamically if using CSS Grid
      // But we set grid-auto-flow: column; grid-template-rows: repeat(7, 1fr)
      // This naturally flows top-down, left-right.
      // So standard array order (oldest -> newest) fills col 1 (S,M,T,W,T,F,S), then col 2...
      // This is exactly what we want.
    };

    const refresh = async () => {
      if (ensureDbFn) await ensureDbFn();
      const sessions = await getAllSessions();
      if (!sessions || sessions.length === 0) {
        container.hidden = true;
        return;
      }
      container.hidden = false;
      renderHeatmap(sessions, currentRangeDays);
    };

    // Events
    rangeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const days = Number(btn.dataset.heatmapRange);
        if (!days) return;
        currentRangeDays = days;

        // Toggle active class
        rangeButtons.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        // Persist
        window.localStorage.setItem("ayvasa_heatmap_range_days", String(days));

        refresh();
      });
    });

    // Init pref
    const saved = window.localStorage.getItem("ayvasa_heatmap_range_days");
    if (saved) {
      const d = Number(saved);
      if ([30, 84, 180].includes(d)) {
        currentRangeDays = d;
        rangeButtons.forEach(b => {
          b.classList.toggle("is-active", Number(b.dataset.heatmapRange) === d);
        });
      }
    }

    return { refresh };
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
    let entryState = null;
    let interferenceLevel = null;
    let phase4Estimate = null;
    let somaticAnchor = null;
    let reentryAbrupt = null;
    let sessionCache = new Map();
    let practiceStep = "idle";
    let pulseInterval = null;

    const contextFields = ["sleepQuality", "stressLevel", "dayType", "lifeSmoother", "harderThanUsual"];


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
      if (session.actionFeel) {
        const delay = Number.isFinite(session.actionFeelDelayMin)
          ? ` (${session.actionFeelDelayMin} min)`
          : "";
        items.push(`Action: ${session.actionFeel}${delay}`);
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

    const updateCarryoverSelection = (form, value, actionFeelValue) => {
      if (!form) return;
      form.dataset.carryoverValue = value || "";
      form.querySelectorAll(".chip[data-carryover]").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset.carryover === value);
      });

      if (actionFeelValue !== undefined) {
        form.dataset.actionFeelValue = actionFeelValue || "";
        form.querySelectorAll(".chip[data-action-feel]").forEach((chip) => {
          chip.classList.toggle("is-selected", actionFeelValue && chip.dataset.actionFeel === actionFeelValue);
        });
      }
    };

    const updateActionFeelSelection = (form, value) => {
      if (!form) return;
      form.dataset.actionFeelValue = value || "";
      form.querySelectorAll(".chip[data-action-feel]").forEach((chip) => {
        chip.classList.toggle("is-selected", value && chip.dataset.actionFeel === value);
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
              <span class="muted" style="font-size:0.85rem; display:block; margin-bottom:0.5rem;">Carryover quality</span>
              <div class="chip-row">
                <button class="chip" data-carryover="unchanged">unchanged</button>
                <button class="chip" data-carryover="clearer">clearer</button>
                <button class="chip" data-carryover="steadier">steadier</button>
                <button class="chip" data-carryover="heavier">heavier</button>
                <button class="chip" data-carryover="slightly disorganized">slightly disorganized</button>
              </div>
            </div>
            <div class="field">
              <span class="muted" style="font-size:0.85rem; display:block; margin-bottom:0.5rem;">Action felt</span>
              <div class="chip-row">
                <button class="chip" data-action-feel="more natural">more natural</button>
                <button class="chip" data-action-feel="neutral">neutral</button>
                <button class="chip" data-action-feel="more effortful">more effortful</button>
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
          if (heatmapGraph) heatmapGraph.refresh();
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
          updateCarryoverSelection(form, session.carryover || null, session.actionFeel || null);
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
      }

      const actionFeelChip = event.target.closest("button[data-action-feel]");
      if (actionFeelChip) {
        const form = actionFeelChip.closest("[data-carryover-form]");
        if (!form) return;
        const value = actionFeelChip.dataset.actionFeel;
        const nextValue = form.dataset.actionFeelValue === value ? null : value;
        updateActionFeelSelection(form, nextValue);
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
        const actionFeel = form.dataset.actionFeelValue || null;

        await ensureDb();
        await updateSession({
          ...session,
          carryover: value,
          carryoverDelayMin: delayMin,
          actionFeel: actionFeel,
          actionFeelDelayMin: actionFeel ? delayMin : null,
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
      if (heatmapGraph) heatmapGraph.refresh();
      event.target.value = "";
    });

    clearAllBtn.addEventListener("click", async () => {
      await ensureDb();
      if (window.confirm("Clear all session data?")) {
        await clearSessions();
        await clearSessions();
        await renderHistory();
        if (heatmapGraph) heatmapGraph.refresh();
      }
    });

    saveBtn.disabled = true;
    exportBtn.disabled = true;
    clearAllBtn.disabled = true;

    // Heatmap setup
    const heatmapGraph = setupSessionsGraph(ensureDb);

    updateTagsButtonState();

    ensureDb()
      .then(async () => {
        await renderHistory();
        if (heatmapGraph) heatmapGraph.refresh();
      })
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

  const safeCall = (label, fn) => {
    try {
      fn();
    } catch (error) {
      console.error(`${label} init failed:`, error);
    }
  };

  const page = document.body.dataset.page;
  if (page === "home") safeCall("home", setupHome);
  if (page === "practice") safeCall("practice", setupPractice);
  if (page === "wiki") safeCall("wiki", setupWiki);

  safeCall("install promo", setupInstallPromo);
  safeCall("footer year", setupFooterYear);
  safeCall("AOPL modal", setupAoplModal);
})();

(() => {
  const KIT_CONFIG = {
    publicApiKey: "N7cTYPZolOYFJ8SBR6W2pw",
    formId: "8246747",
  };

  const EMAIL_REGEX = /.+@.+\..+/;

  const isValidEmail = (value) => EMAIL_REGEX.test(value.trim());

  const setStatus = (statusEl, message, type) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    if (type) {
      statusEl.classList.add(type);
    }
  };

  const subscribe = async (email) => {
    const endpoint = `https://api.convertkit.com/v3/forms/${KIT_CONFIG.formId}/subscribe`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        api_key: KIT_CONFIG.publicApiKey,
        email,
      }),
    });

    return response.status === 200 || response.status === 201;
  };

  const initKitSignup = () => {
    const form = document.querySelector("[data-kit-signup]");
    if (!form) return;

    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".about-signup__status");
    const honeypot = form.querySelector('input[name="website"]');
    const buttonLabel = button ? button.textContent : "";

    if (!input || !button) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (button.disabled) return;

      if (honeypot && honeypot.value.trim()) {
        return;
      }

      const email = input.value.trim();

      if (!email || !isValidEmail(email)) {
        setStatus(status, "Please enter a valid email address.", "is-error");
        input.focus();
        return;
      }

      button.disabled = true;
      button.textContent = "Submitting…";
      setStatus(status, "Submitting…");

      try {
        const ok = await subscribe(email);
        if (ok) {
          input.value = "";
          setStatus(status, "You’re subscribed.", "is-success");
        } else {
          setStatus(status, "Couldn’t subscribe right now. Try again in a moment.", "is-error");
        }
      } catch (error) {
        setStatus(status, "Couldn’t subscribe right now. Try again in a moment.", "is-error");
      } finally {
        button.disabled = false;
        button.textContent = buttonLabel;
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKitSignup);
  } else {
    initKitSignup();
  }
})();

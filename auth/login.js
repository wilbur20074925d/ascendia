import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function getSupabase() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.__ENV__ || {};
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured. Add credentials to .env and restart the dev server."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const inputClass =
  "w-full px-4 py-3 rounded-lg font-body text-sm text-mist bg-obsidian border border-white/10 outline-none focus:border-cyan/50 transition-colors";
const labelClass =
  "block font-body text-ash text-xs uppercase tracking-wider mb-2";

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

function field(label, input) {
  return el("div", {}, [el("label", { className: labelClass, text: label }), input]);
}

function getPostLoginUrl() {
  const env = window.__ENV__ || {};
  if (env.MEDIAPIPE_APP_URL) return env.MEDIAPIPE_APP_URL;

  const base = window.location.pathname.replace(/\/login\/?$/, "");
  return `${window.location.origin}${base}/mediapipe-samples-web/`;
}

function message(text, type = "error") {
  const color =
    type === "success" ? "var(--cyan)" : type === "info" ? "var(--mist)" : "#f87171";
  return el("p", {
    className: "font-body text-sm mt-4 text-center",
    style: `color:${color}`,
    text,
  });
}

function mount(root) {
  root.replaceChildren();
  root.className =
    "min-h-[calc(100dvh-4rem)] flex items-center justify-center px-6 pt-16";
  root.style.background = "var(--obsidian)";

  let mode = "signin";
  let loading = false;

  const supabase = getSupabase();

  const wrapper = el("div", { className: "w-full max-w-md" });
  const card = el("div", {
    className: "w-full p-8 md:p-10 rounded-2xl",
    style:
      "background:var(--slate);border:1px solid rgba(232, 230, 227, 0.08)",
  });

  const title = el("h1", {
    className: "font-display text-2xl md:text-3xl font-medium text-mist mb-2",
    text: "Welcome back",
  });
  const subtitle = el("p", {
    className: "font-body text-ash text-sm mb-6",
    text: "Sign in to explore the Ascendia ecosystem.",
  });

  const tabRow = el("div", {
    className: "flex gap-2 mb-6 border-b border-white/10 pb-4",
  });
  const signInTab = el("button", {
    className: "font-body text-sm px-4 py-2 rounded-lg border-none cursor-pointer transition-colors",
    type: "button",
    text: "Sign In",
  });
  const signUpTab = el("button", {
    className: "font-body text-sm px-4 py-2 rounded-lg border-none cursor-pointer transition-colors",
    type: "button",
    text: "Sign Up",
  });
  tabRow.append(signInTab, signUpTab);

  const emailInput = el("input", {
    className: inputClass,
    type: "email",
    placeholder: "you@ascendia.climb",
    required: "true",
    autocomplete: "email",
  });
  const passwordInput = el("input", {
    className: inputClass,
    type: "password",
    placeholder: "Enter your password",
    required: "true",
    autocomplete: "current-password",
  });
  const confirmWrap = el("div", { className: "hidden flex flex-col gap-2" });
  const confirmInput = el("input", {
    className: inputClass,
    type: "password",
    placeholder: "Confirm your password",
    autocomplete: "new-password",
  });
  confirmWrap.append(
    el("label", { className: labelClass, text: "Confirm Password" }),
    confirmInput
  );

  const statusEl = el("div");
  const submitBtn = el("button", {
    className: "btn-primary w-full mt-2",
    type: "submit",
    text: "Sign In",
  });

  const form = el("form", { className: "flex flex-col gap-5" }, [
    field("Email", emailInput),
    field("Password", passwordInput),
    confirmWrap,
    submitBtn,
  ]);

  function setTabStyles() {
    const activeStyle =
      "background:rgba(0,212,255,0.12);color:var(--cyan)";
    const idleStyle = "background:transparent;color:var(--ash)";
    signInTab.style.cssText = mode === "signin" ? activeStyle : idleStyle;
    signUpTab.style.cssText = mode === "signup" ? activeStyle : idleStyle;
  }

  function setMode(next) {
    mode = next;
    title.textContent = mode === "signin" ? "Welcome back" : "Create account";
    subtitle.textContent =
      mode === "signin"
        ? "Sign in to explore the Ascendia ecosystem."
        : "Enter your email and password twice to sign up.";
    submitBtn.textContent = mode === "signin" ? "Sign In" : "Sign Up";
    confirmWrap.classList.toggle("hidden", mode !== "signup");
    confirmInput.required = mode === "signup";
    passwordInput.autocomplete =
      mode === "signup" ? "new-password" : "current-password";
    statusEl.replaceChildren();
    setTabStyles();
  }

  signInTab.addEventListener("click", () => setMode("signin"));
  signUpTab.addEventListener("click", () => setMode("signup"));
  setMode("signin");

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace(getPostLoginUrl());
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    statusEl.replaceChildren();

    if (!email || !password) {
      statusEl.append(message("Please enter your email and password."));
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        statusEl.append(message("Password must be at least 6 characters."));
        return;
      }
      if (password !== confirm) {
        statusEl.append(message("Passwords do not match."));
        return;
      }
    }

    loading = true;
    submitBtn.disabled = true;
    submitBtn.textContent = mode === "signin" ? "Signing in…" : "Creating account…";

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          statusEl.append(message("Account created. You're signed in!", "success"));
          setTimeout(() => {
            window.location.href = getPostLoginUrl();
          }, 800);
        } else {
          statusEl.append(
            message(
              "Account created. Check your email to confirm, then sign in.",
              "info"
            )
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        statusEl.append(message("Signed in successfully!", "success"));
        setTimeout(() => {
          window.location.href = getPostLoginUrl();
        }, 800);
      }
    } catch (err) {
      statusEl.append(message(err.message || "Something went wrong."));
    } finally {
      loading = false;
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "signin" ? "Sign In" : "Sign Up";
    }
  });

  card.append(title, subtitle, tabRow, form, statusEl);
  wrapper.append(card);
  root.append(wrapper);
}

window.AscendiaAuth = { mount };

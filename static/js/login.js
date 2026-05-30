/**
 * login.js — UnknownBooks
 * Validasi form + animasi slide ke register + fetch ke Flask
 */

const FLASK_LOGIN_URL = "/auth/login";

// ── Elements ─────────────────────────────────────────────────────────────────
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const pwInput = document.getElementById("password");
const togglePw = document.getElementById("togglePw");
const eyeIcon = document.getElementById("eyeIcon");
const btnSubmit = document.getElementById("btnSubmit");
const btnText = btnSubmit.querySelector(".btn-text");
const btnLoader = document.getElementById("btnLoader");
const formAlert = document.getElementById("formAlert");
const linkDaftar = document.getElementById("linkDaftar");

// ── Eye SVG ───────────────────────────────────────────────────────────────────
const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

// ── Toggle Password ───────────────────────────────────────────────────────────
togglePw.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  eyeIcon.innerHTML = show ? eyeClosed : eyeOpen;
  pwInput.focus();
});

// ── Validasi ──────────────────────────────────────────────────────────────────
emailInput.addEventListener("blur", validateEmail);
pwInput.addEventListener("blur", validatePassword);
emailInput.addEventListener("input", () =>
  clearError("group-email", "email-error"),
);
pwInput.addEventListener("input", () =>
  clearError("group-password", "password-error"),
);

function validateEmail() {
  const v = emailInput.value.trim();
  if (!v)
    return setError("group-email", "email-error", "Email tidak boleh kosong.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return setError("group-email", "email-error", "Format email tidak valid.");
  clearError("group-email", "email-error");
  return true;
}

function validatePassword() {
  const v = pwInput.value;
  if (!v)
    return setError(
      "group-password",
      "password-error",
      "Kata sandi tidak boleh kosong.",
    );
  if (v.length < 6)
    return setError(
      "group-password",
      "password-error",
      "Kata sandi minimal 6 karakter.",
    );
  clearError("group-password", "password-error");
  return true;
}

function setError(gid, eid, msg) {
  document.getElementById(gid).classList.add("has-error");
  document.getElementById(eid).textContent = msg;
  return false;
}

function clearError(gid, eid) {
  document.getElementById(gid).classList.remove("has-error");
  document.getElementById(eid).textContent = "";
}

// ── Alert ─────────────────────────────────────────────────────────────────────
function showAlert(msg, type = "error") {
  formAlert.textContent = msg;
  formAlert.className = `alert ${type}`;
  formAlert.hidden = false;
  if (type === "success")
    setTimeout(() => {
      formAlert.hidden = true;
    }, 3000);
}

function hideAlert() {
  formAlert.hidden = true;
  formAlert.className = "alert";
}

// ── Loading State ─────────────────────────────────────────────────────────────
function setLoading(on) {
  btnSubmit.disabled = on;
  btnText.hidden = on;
  btnLoader.hidden = !on;
}

// ── Animasi Slide Keluar → Register ──────────────────────────────────────────
const SLIDE_DUR = 600; // ms — harus sama dengan --slide-dur di CSS

linkDaftar.addEventListener("click", (e) => {
  e.preventDefault();
  const target = linkDaftar.href;

  // Tambah class animasi keluar
  document.body.classList.add("slide-to-register");

  // Setelah animasi selesai, pindah halaman
  setTimeout(() => {
    window.location.href = target;
  }, SLIDE_DUR);
});

// ── Form Submit ───────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const emailOk = validateEmail();
  const pwOk = validatePassword();
  if (!emailOk || !pwOk) return;

  setLoading(true);

  try {
    const res = await fetch(FLASK_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: pwInput.value,
        remember: document.getElementById("remember").checked,
      }),
      credentials: "same-origin",
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAlert("Berhasil masuk! Mengalihkan...", "success");
      setTimeout(() => {
        window.location.href = data.redirect || "/dashboard";
      }, 800);
    } else {
      showAlert(data.message || "Email atau kata sandi salah.");
    }
  } catch {
    showAlert("Gagal terhubung ke server. Coba lagi.");
  } finally {
    setLoading(false);
  }
});

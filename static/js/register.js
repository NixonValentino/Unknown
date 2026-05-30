/**
 * register.js — UnknownBooks
 * Validasi form register + animasi slide ke login + fetch ke Flask
 */

const FLASK_REGISTER_URL = "/auth/register";

// ── Elements ─────────────────────────────────────────────────────────────────
const form = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const pwInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm");
const togglePw = document.getElementById("togglePw");
const toggleConfirm = document.getElementById("toggleConfirm");
const eyeIcon = document.getElementById("eyeIcon");
const eyeIconC = document.getElementById("eyeIconConfirm");
const btnSubmit = document.getElementById("btnSubmit");
const btnText = btnSubmit.querySelector(".btn-text");
const btnLoader = document.getElementById("btnLoader");
const formAlert = document.getElementById("formAlert");
const linkMasuk = document.getElementById("linkMasuk");

// ── Eye SVG ───────────────────────────────────────────────────────────────────
const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

// ── Toggle Password ───────────────────────────────────────────────────────────
function makeToggle(btn, input, icon) {
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.innerHTML = show ? eyeClosed : eyeOpen;
    input.focus();
  });
}

makeToggle(togglePw, pwInput, eyeIcon);
makeToggle(toggleConfirm, confirmInput, eyeIconC);

// ── Validasi ──────────────────────────────────────────────────────────────────
nameInput.addEventListener("blur", validateName);
emailInput.addEventListener("blur", validateEmail);
pwInput.addEventListener("blur", validatePassword);
confirmInput.addEventListener("blur", validateConfirm);

nameInput.addEventListener("input", () =>
  clearError("group-name", "name-error"),
);
emailInput.addEventListener("input", () =>
  clearError("group-email", "email-error"),
);
pwInput.addEventListener("input", () =>
  clearError("group-password", "password-error"),
);
confirmInput.addEventListener("input", () =>
  clearError("group-confirm", "confirm-error"),
);

function validateName() {
  const v = nameInput.value.trim();
  if (!v)
    return setError("group-name", "name-error", "Nama tidak boleh kosong.");
  if (v.length < 2)
    return setError("group-name", "name-error", "Nama minimal 2 karakter.");
  clearError("group-name", "name-error");
  return true;
}

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
  // Re-validasi konfirmasi jika sudah diisi
  if (confirmInput.value) validateConfirm();
  return true;
}

function validateConfirm() {
  const v = confirmInput.value;
  if (!v)
    return setError(
      "group-confirm",
      "confirm-error",
      "Konfirmasi kata sandi tidak boleh kosong.",
    );
  if (v !== pwInput.value)
    return setError(
      "group-confirm",
      "confirm-error",
      "Kata sandi tidak cocok.",
    );
  clearError("group-confirm", "confirm-error");
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

// ── Animasi Slide Keluar → Login ─────────────────────────────────────────────
const SLIDE_DUR = 600;

linkMasuk.addEventListener("click", (e) => {
  e.preventDefault();
  const target = linkMasuk.href;

  document.body.classList.add("slide-to-login");

  setTimeout(() => {
    window.location.href = target;
  }, SLIDE_DUR);
});

// ── Form Submit ───────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const nameOk = validateName();
  const emailOk = validateEmail();
  const pwOk = validatePassword();
  const confirmOk = validateConfirm();
  if (!nameOk || !emailOk || !pwOk || !confirmOk) return;

  setLoading(true);

  try {
    const res = await fetch(FLASK_REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: pwInput.value,
      }),
      credentials: "same-origin",
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showAlert("Akun berhasil dibuat! Mengalihkan...", "success");
      setTimeout(() => {
        window.location.href = data.redirect || "/dashboard";
      }, 800);
    } else {
      showAlert(data.message || "Gagal membuat akun. Coba lagi.");
    }
  } catch {
    showAlert("Gagal terhubung ke server. Coba lagi.");
  } finally {
    setLoading(false);
  }
});

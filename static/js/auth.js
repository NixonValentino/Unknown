/**
 * auth.js — UnknownBooks
 * Login + Register dalam satu halaman, toggle pakai CSS class
 */

const container = document.getElementById("authContainer");

// ── Teks branding per mode ────────────────────────────────────────────────────

const BRAND = {
  login: {
    tagline: "Baca lebih banyak.<br>Tahu lebih banyak.",
    sub: "Platform digital untuk membaca buku-buku tentang pengetahuan menarik, ilmu berguna, dan ide-ide yang relevan.",
  },
  register: {
    tagline: "Ribuan buku.<br>Satu tempat.",
    sub: "Daftarkan akunmu dan nikmati koleksi buku pengetahuan, ilmu, dan ide dari seluruh dunia.",
  },
};

function applyBrand(mode) {
  document.getElementById("brandTagline").innerHTML = BRAND[mode].tagline;
  document.getElementById("brandSub").textContent = BRAND[mode].sub;
}

function switchTo(mode, animate = true) {
  if (!animate) {
    // Matikan transisi sementara agar langsung tanpa animasi
    container.style.setProperty("--dur", "0s");
  }
  if (mode === "register") {
    container.classList.add("is-register");
  } else {
    container.classList.remove("is-register");
  }
  applyBrand(mode);
  if (!animate) {
    // Kembalikan durasi setelah satu frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.removeProperty("--dur");
      });
    });
  }
  // Update URL tanpa reload
  history.replaceState(null, "", mode === "register" ? "/register" : "/login");
}

// ── Deteksi URL saat halaman pertama dibuka ───────────────────────────────────
// Jika user buka /register langsung, tampilkan form register tanpa animasi

if (window.location.pathname === "/register") {
  switchTo("register", false);
}

// ── Toggle Login ↔ Register ───────────────────────────────────────────────────

document.getElementById("goDaftar").addEventListener("click", (e) => {
  e.preventDefault();
  switchTo("register", true);
});

document.getElementById("goMasuk").addEventListener("click", (e) => {
  e.preventDefault();
  switchTo("login", true);
});

// ── Toggle Password Visibility ────────────────────────────────────────────────

const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

document.querySelectorAll(".toggle-pw").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = document.getElementById(btn.dataset.icon);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.innerHTML = show ? eyeClosed : eyeOpen;
    input.focus();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setError(groupId, errorId, msg) {
  document.getElementById(groupId).classList.add("has-error");
  document.getElementById(errorId).textContent = msg;
  return false;
}

function clearError(groupId, errorId) {
  document.getElementById(groupId).classList.remove("has-error");
  document.getElementById(errorId).textContent = "";
}

function showAlert(id, msg, type = "error") {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `alert ${type}`;
  el.hidden = false;
  if (type === "success")
    setTimeout(() => {
      el.hidden = true;
    }, 3000);
}

function hideAlert(id) {
  const el = document.getElementById(id);
  el.hidden = true;
  el.className = "alert";
}

function setLoading(btnId, on) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");
  btn.disabled = on;
  text.hidden = on;
  loader.hidden = !on;
}

// ── Validasi Login ────────────────────────────────────────────────────────────

const lgEmail = document.getElementById("lg-email");
const lgPw = document.getElementById("lg-password");

function lgValidateEmail() {
  const v = lgEmail.value.trim();
  if (!v)
    return setError(
      "lg-group-email",
      "lg-email-error",
      "Email tidak boleh kosong.",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return setError(
      "lg-group-email",
      "lg-email-error",
      "Format email tidak valid.",
    );
  clearError("lg-group-email", "lg-email-error");
  return true;
}
function lgValidatePw() {
  const v = lgPw.value;
  if (!v)
    return setError(
      "lg-group-password",
      "lg-password-error",
      "Kata sandi tidak boleh kosong.",
    );
  if (v.length < 6)
    return setError(
      "lg-group-password",
      "lg-password-error",
      "Minimal 6 karakter.",
    );
  clearError("lg-group-password", "lg-password-error");
  return true;
}

lgEmail.addEventListener("blur", lgValidateEmail);
lgPw.addEventListener("blur", lgValidatePw);
lgEmail.addEventListener("input", () =>
  clearError("lg-group-email", "lg-email-error"),
);
lgPw.addEventListener("input", () =>
  clearError("lg-group-password", "lg-password-error"),
);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("lg-alert");
  if (!lgValidateEmail() | !lgValidatePw()) return; // | bukan || agar keduanya dicek
  setLoading("lg-btn", true);
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: lgEmail.value.trim(),
        password: lgPw.value,
        remember: document.getElementById("lg-remember").checked,
      }),
      credentials: "same-origin",
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showAlert("lg-alert", "Berhasil masuk! Mengalihkan...", "success");
      setTimeout(() => {
        window.location.href = data.redirect || "/dashboard";
      }, 700);
    } else {
      showAlert("lg-alert", data.message || "Email atau kata sandi salah.");
    }
  } catch {
    showAlert("lg-alert", "Gagal terhubung ke server.");
  } finally {
    setLoading("lg-btn", false);
  }
});

// ── Validasi Register ─────────────────────────────────────────────────────────

const rgName = document.getElementById("rg-name");
const rgEmail = document.getElementById("rg-email");
const rgPw = document.getElementById("rg-password");
const rgConfirm = document.getElementById("rg-confirm");

function rgValidateName() {
  const v = rgName.value.trim();
  if (!v)
    return setError(
      "rg-group-name",
      "rg-name-error",
      "Nama tidak boleh kosong.",
    );
  if (v.length < 2)
    return setError("rg-group-name", "rg-name-error", "Minimal 2 karakter.");
  clearError("rg-group-name", "rg-name-error");
  return true;
}
function rgValidateEmail() {
  const v = rgEmail.value.trim();
  if (!v)
    return setError(
      "rg-group-email",
      "rg-email-error",
      "Email tidak boleh kosong.",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    return setError(
      "rg-group-email",
      "rg-email-error",
      "Format email tidak valid.",
    );
  clearError("rg-group-email", "rg-email-error");
  return true;
}
function rgValidatePw() {
  const v = rgPw.value;
  if (!v)
    return setError(
      "rg-group-password",
      "rg-password-error",
      "Kata sandi tidak boleh kosong.",
    );
  if (v.length < 6)
    return setError(
      "rg-group-password",
      "rg-password-error",
      "Minimal 6 karakter.",
    );
  clearError("rg-group-password", "rg-password-error");
  if (rgConfirm.value) rgValidateConfirm();
  return true;
}
function rgValidateConfirm() {
  const v = rgConfirm.value;
  if (!v)
    return setError(
      "rg-group-confirm",
      "rg-confirm-error",
      "Konfirmasi tidak boleh kosong.",
    );
  if (v !== rgPw.value)
    return setError(
      "rg-group-confirm",
      "rg-confirm-error",
      "Kata sandi tidak cocok.",
    );
  clearError("rg-group-confirm", "rg-confirm-error");
  return true;
}

rgName.addEventListener("blur", rgValidateName);
rgEmail.addEventListener("blur", rgValidateEmail);
rgPw.addEventListener("blur", rgValidatePw);
rgConfirm.addEventListener("blur", rgValidateConfirm);
rgName.addEventListener("input", () =>
  clearError("rg-group-name", "rg-name-error"),
);
rgEmail.addEventListener("input", () =>
  clearError("rg-group-email", "rg-email-error"),
);
rgPw.addEventListener("input", () =>
  clearError("rg-group-password", "rg-password-error"),
);
rgConfirm.addEventListener("input", () =>
  clearError("rg-group-confirm", "rg-confirm-error"),
);

document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("rg-alert");
    const ok =
      rgValidateName() &
      rgValidateEmail() &
      rgValidatePw() &
      rgValidateConfirm();
    if (!ok) return;
    setLoading("rg-btn", true);
    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rgName.value.trim(),
          email: rgEmail.value.trim(),
          password: rgPw.value,
        }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert("rg-alert", "Akun dibuat! Mengalihkan...", "success");
        setTimeout(() => {
          window.location.href = data.redirect || "/dashboard";
        }, 700);
      } else {
        showAlert("rg-alert", data.message || "Gagal membuat akun.");
      }
    } catch {
      showAlert("rg-alert", "Gagal terhubung ke server.");
    } finally {
      setLoading("rg-btn", false);
    }
  });

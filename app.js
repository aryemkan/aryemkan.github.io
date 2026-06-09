/* =========================================================
   United States of Liberty (USL) — RP portal
   Pure client-side app. Data stored in localStorage.
   ========================================================= */

const STORE_KEY = "usl_users_v1";
const SESSION_KEY = "usl_session_v1";

/* ---- Admin seed account ---- */
const ADMIN_USERNAME = "aryemkan";
const ADMIN_DEFAULT_PASSWORD = "usl2024"; // change after first login

/* ---------- tiny hash (NOT real security, just RP) ---------- */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return "h" + (h >>> 0).toString(16);
}

/* ---------- storage helpers ---------- */
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}
function getSession() {
  return localStorage.getItem(SESSION_KEY);
}
function setSession(username) {
  localStorage.setItem(SESSION_KEY, username);
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ---------- seed admin once ---------- */
function seedAdmin() {
  const users = loadUsers();
  if (!users.find((u) => u.username.toLowerCase() === ADMIN_USERNAME)) {
    users.push({
      username: ADMIN_USERNAME,
      displayName: "Aryemkan",
      password: hash(ADMIN_DEFAULT_PASSWORD),
      role: "admin",
      status: "active",
      passportId: makePassportId(),
      balance: 1000000,
      job: "Президент USL",
      vehicle: "Federal One",
      property: "Белый дом, Liberty City",
      bio: "Основатель и глава государства United States of Liberty.",
      createdAt: Date.now(),
    });
    saveUsers(users);
  }
}

function makePassportId() {
  const n = Math.floor(100000 + Math.random() * 899999);
  return "USL-" + n;
}

function findUser(username) {
  return loadUsers().find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
}

function currentUser() {
  const s = getSession();
  return s ? findUser(s) : null;
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, type) {
  let el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show " + (type || "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast " + (type || "");
  }, 2600);
}

/* =========================================================
   ROUTER / VIEWS
   ========================================================= */
const views = ["home", "auth", "profile", "registry", "admin"];

function navigate(view) {
  const user = currentUser();

  // guard protected views
  if ((view === "profile" || view === "registry") && !user) {
    view = "auth";
  }
  if (view === "admin" && (!user || user.role !== "admin")) {
    view = user ? "home" : "auth";
  }
  if (view === "auth" && user) {
    view = "profile";
  }

  views.forEach((v) => {
    document.getElementById("view-" + v).classList.toggle("hidden", v !== view);
  });

  document.querySelectorAll(".nav button[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });

  // render dynamic views
  if (view === "profile") renderProfile();
  if (view === "registry") renderRegistry();
  if (view === "admin") renderAdmin();
  if (view === "home") renderHomeStats();

  window.scrollTo({ top: 0, behavior: "smooth" });
  location.hash = view;
}

/* =========================================================
   AUTH UI
   ========================================================= */
let authMode = "login";

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("tab-login").classList.toggle("active", mode === "login");
  document.getElementById("tab-register").classList.toggle("active", mode === "register");
  document.getElementById("register-fields").classList.toggle("hidden", mode !== "register");
  document.getElementById("auth-submit").textContent =
    mode === "login" ? "Войти" : "Зарегистрироваться";
  clearAuthMsg();
}

function showAuthMsg(text, type) {
  const el = document.getElementById("auth-msg");
  el.textContent = text;
  el.className = "form-msg " + (type || "error");
  el.classList.remove("hidden");
}
function clearAuthMsg() {
  document.getElementById("auth-msg").classList.add("hidden");
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("au-username").value.trim();
  const password = document.getElementById("au-password").value;

  if (!username || !password) {
    showAuthMsg("Заполните никнейм и пароль.");
    return;
  }

  if (authMode === "login") {
    const u = findUser(username);
    if (!u || u.password !== hash(password)) {
      showAuthMsg("Неверный никнейм или пароль.");
      return;
    }
    if (u.status === "banned") {
      showAuthMsg("Этот аккаунт заблокирован администрацией USL.");
      return;
    }
    setSession(u.username);
    afterAuth();
  } else {
    // register
    const displayName = document.getElementById("au-display").value.trim() || username;
    if (username.length < 3) {
      showAuthMsg("Никнейм должен быть не короче 3 символов.");
      return;
    }
    if (password.length < 4) {
      showAuthMsg("Пароль должен быть не короче 4 символов.");
      return;
    }
    if (findUser(username)) {
      showAuthMsg("Такой никнейм уже занят.");
      return;
    }
    const users = loadUsers();
    users.push({
      username,
      displayName,
      password: hash(password),
      role: "citizen",
      status: "active",
      passportId: makePassportId(),
      balance: 5000,
      job: "Безработный",
      vehicle: "—",
      property: "—",
      bio: "",
      createdAt: Date.now(),
    });
    saveUsers(users);
    setSession(username);
    afterAuth();
  }
}

function afterAuth() {
  document.getElementById("auth-form").reset();
  refreshHeader();
  toast("Добро пожаловать в USL!", "ok");
  navigate("profile");
}

function logout() {
  clearSession();
  refreshHeader();
  toast("Вы вышли из аккаунта.", "");
  navigate("home");
}

/* =========================================================
   HEADER
   ========================================================= */
function refreshHeader() {
  const user = currentUser();
  const chip = document.getElementById("userchip");
  const loginBtn = document.getElementById("nav-login");
  const adminLink = document.getElementById("nav-admin");
  const profileLink = document.getElementById("nav-profile");
  const registryLink = document.getElementById("nav-registry");

  if (user) {
    chip.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    profileLink.classList.remove("hidden");
    registryLink.classList.remove("hidden");
    adminLink.classList.toggle("hidden", user.role !== "admin");

    document.getElementById("chip-initial").textContent = (user.displayName || user.username)
      .charAt(0)
      .toUpperCase();
    document.getElementById("chip-name").textContent = user.displayName || user.username;
    const badge = document.getElementById("chip-badge");
    badge.textContent = user.role === "admin" ? "Админ" : "Гражданин";
    badge.className = "badge " + (user.role === "admin" ? "admin" : "citizen");
  } else {
    chip.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    profileLink.classList.add("hidden");
    registryLink.classList.add("hidden");
    adminLink.classList.add("hidden");
  }
}

/* =========================================================
   HOME STATS
   ========================================================= */
function renderHomeStats() {
  const users = loadUsers();
  document.getElementById("stat-citizens").textContent = users.length;
  const money = users.reduce((s, u) => s + (u.balance || 0), 0);
  document.getElementById("stat-money").textContent = "$" + money.toLocaleString("en-US");
  document.getElementById("stat-admins").textContent = users.filter(
    (u) => u.role === "admin"
  ).length;
}

/* =========================================================
   PROFILE
   ========================================================= */
function renderProfile() {
  const u = currentUser();
  if (!u) return;
  document.getElementById("pf-initial").textContent = (u.displayName || u.username)
    .charAt(0)
    .toUpperCase();
  document.getElementById("pf-name").textContent = u.displayName || u.username;
  document.getElementById("pf-username").textContent = "@" + u.username;
  document.getElementById("pf-pid").textContent = u.passportId;

  const statusBadge = document.getElementById("pf-status");
  statusBadge.textContent =
    u.status === "banned" ? "Заблокирован" : u.role === "admin" ? "Администрация" : "Активен";
  statusBadge.className =
    "badge " + (u.status === "banned" ? "banned" : u.role === "admin" ? "admin" : "citizen");

  document.getElementById("pf-balance").textContent = "$" + (u.balance || 0).toLocaleString("en-US");
  document.getElementById("pf-job").textContent = u.job || "—";
  document.getElementById("pf-vehicle").textContent = u.vehicle || "—";
  document.getElementById("pf-property").textContent = u.property || "—";
  document.getElementById("pf-bio").textContent = u.bio || "Биография не заполнена.";
  document.getElementById("pf-joined").textContent = new Date(u.createdAt).toLocaleDateString("ru-RU");

  // edit form prefills
  document.getElementById("ed-display").value = u.displayName || "";
  document.getElementById("ed-job").value = u.job || "";
  document.getElementById("ed-vehicle").value = u.vehicle || "";
  document.getElementById("ed-property").value = u.property || "";
  document.getElementById("ed-bio").value = u.bio || "";
}

function toggleEdit() {
  document.getElementById("profile-view").classList.toggle("hidden");
  document.getElementById("profile-edit").classList.toggle("hidden");
}

function saveProfile(e) {
  e.preventDefault();
  const u = currentUser();
  if (!u) return;
  const users = loadUsers();
  const idx = users.findIndex((x) => x.username === u.username);
  users[idx].displayName = document.getElementById("ed-display").value.trim() || u.username;
  users[idx].job = document.getElementById("ed-job").value.trim();
  users[idx].vehicle = document.getElementById("ed-vehicle").value.trim();
  users[idx].property = document.getElementById("ed-property").value.trim();
  users[idx].bio = document.getElementById("ed-bio").value.trim();
  saveUsers(users);
  toggleEdit();
  renderProfile();
  refreshHeader();
  toast("Профиль обновлён.", "ok");
}

/* =========================================================
   REGISTRY (gov database / MDT)
   ========================================================= */
function renderRegistry(filter) {
  const tbody = document.getElementById("registry-body");
  const q = (filter || "").toLowerCase().trim();
  const users = loadUsers().filter((u) => {
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName || "").toLowerCase().includes(q) ||
      u.passportId.toLowerCase().includes(q) ||
      (u.vehicle || "").toLowerCase().includes(q) ||
      (u.property || "").toLowerCase().includes(q)
    );
  });

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Ничего не найдено по запросу.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const statusBadge =
        u.status === "banned"
          ? `<span class="badge banned">Розыск/Блок</span>`
          : u.role === "admin"
          ? `<span class="badge admin">Гос. служба</span>`
          : `<span class="badge citizen">Чист</span>`;
      return `<tr>
        <td>${escapeHtml(u.passportId)}</td>
        <td><strong>${escapeHtml(u.displayName || u.username)}</strong><br><span style="color:var(--muted);font-size:.8rem">@${escapeHtml(u.username)}</span></td>
        <td>${escapeHtml(u.job || "—")}</td>
        <td>${escapeHtml(u.vehicle || "—")}</td>
        <td>${escapeHtml(u.property || "—")}</td>
        <td>${statusBadge}</td>
      </tr>`;
    })
    .join("");
}

/* =========================================================
   ADMIN PANEL
   ========================================================= */
function renderAdmin() {
  const me = currentUser();
  if (!me || me.role !== "admin") return;
  const tbody = document.getElementById("admin-body");
  const users = loadUsers();

  tbody.innerHTML = users
    .map((u) => {
      const isSelf = u.username === me.username;
      const roleBadge =
        u.role === "admin"
          ? `<span class="badge admin">Админ</span>`
          : `<span class="badge citizen">Гражданин</span>`;
      const statusBadge =
        u.status === "banned"
          ? `<span class="badge banned">Бан</span>`
          : `<span class="badge citizen">Активен</span>`;
      return `<tr>
        <td><strong>${escapeHtml(u.displayName || u.username)}</strong><br><span style="color:var(--muted);font-size:.8rem">@${escapeHtml(u.username)}</span></td>
        <td>${escapeHtml(u.passportId)}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td class="money">$${(u.balance || 0).toLocaleString("en-US")}</td>
        <td>
          <div style="display:flex;gap:.35rem;flex-wrap:wrap">
            <button class="btn small" onclick="adminToggleRole('${u.username}')" ${isSelf ? "disabled" : ""}>${u.role === "admin" ? "Снять админа" : "Сделать админом"}</button>
            <button class="btn small ${u.status === "banned" ? "" : "danger"}" onclick="adminToggleBan('${u.username}')" ${isSelf ? "disabled" : ""}>${u.status === "banned" ? "Разбан" : "Бан"}</button>
            <button class="btn small" onclick="adminPay('${u.username}')">Деньги</button>
            <button class="btn small danger" onclick="adminDelete('${u.username}')" ${isSelf ? "disabled" : ""}>Удалить</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  document.getElementById("admin-count").textContent = users.length;
}

function adminGuard() {
  const me = currentUser();
  return me && me.role === "admin";
}

function adminToggleRole(username) {
  if (!adminGuard()) return;
  const users = loadUsers();
  const i = users.findIndex((u) => u.username === username);
  users[i].role = users[i].role === "admin" ? "citizen" : "admin";
  saveUsers(users);
  renderAdmin();
  toast("Роль обновлена для @" + username, "ok");
}

function adminToggleBan(username) {
  if (!adminGuard()) return;
  const users = loadUsers();
  const i = users.findIndex((u) => u.username === username);
  users[i].status = users[i].status === "banned" ? "active" : "banned";
  saveUsers(users);
  renderAdmin();
  toast((users[i].status === "banned" ? "Забанен" : "Разбанен") + " @" + username, users[i].status === "banned" ? "err" : "ok");
}

function adminPay(username) {
  if (!adminGuard()) return;
  const amount = prompt("Сумма для @" + username + " (можно отрицательную):", "1000");
  if (amount === null) return;
  const n = parseInt(amount, 10);
  if (isNaN(n)) {
    toast("Некорректная сумма.", "err");
    return;
  }
  const users = loadUsers();
  const i = users.findIndex((u) => u.username === username);
  users[i].balance = (users[i].balance || 0) + n;
  saveUsers(users);
  renderAdmin();
  toast("Баланс @" + username + " изменён на $" + n.toLocaleString("en-US"), "ok");
}

function adminDelete(username) {
  if (!adminGuard()) return;
  if (!confirm("Удалить аккаунт @" + username + " без возможности восстановления?")) return;
  let users = loadUsers().filter((u) => u.username !== username);
  saveUsers(users);
  renderAdmin();
  toast("Аккаунт @" + username + " удалён.", "err");
}

/* =========================================================
   UTIL
   ========================================================= */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  seedAdmin();
  refreshHeader();

  // nav buttons
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.addEventListener("click", () => navigate(b.dataset.view));
  });

  document.getElementById("tab-login").addEventListener("click", () => setAuthMode("login"));
  document.getElementById("tab-register").addEventListener("click", () => setAuthMode("register"));
  document.getElementById("auth-form").addEventListener("submit", handleAuthSubmit);
  document.getElementById("logout-btn").addEventListener("click", logout);

  document.getElementById("edit-toggle").addEventListener("click", toggleEdit);
  document.getElementById("edit-cancel").addEventListener("click", toggleEdit);
  document.getElementById("profile-edit-form").addEventListener("submit", saveProfile);

  document.getElementById("registry-search").addEventListener("input", (e) => {
    renderRegistry(e.target.value);
  });

  setAuthMode("login");

  // initial route from hash
  const hash = location.hash.replace("#", "");
  navigate(views.includes(hash) ? hash : "home");
});


// ===== USL EXTENSIONS =====
const USL_POLICE_ROLES = ["CPD","FBI","admin"];

function canViewRegistry(user){
 return user && USL_POLICE_ROLES.includes(user.role);
}

document.addEventListener("DOMContentLoaded",()=>{
 const oldUpdate = window.updateAuthUI;
 if(oldUpdate){
   const orig=oldUpdate;
   window.updateAuthUI=function(){
     orig();
     const u=currentUser();
     const reg=document.getElementById("nav-registry");
     const laws=document.getElementById("nav-laws");
     if(reg) reg.classList.toggle("hidden", !canViewRegistry(u));
     if(laws) laws.classList.remove("hidden");
   }
 }
});

const offers = [
  { title: "Hotel Tour Khalef", price: "21000 DA", image: "offer-khalef.jpg" },
  { title: "Hotel Occidental Marhaba", price: "17000 DA", image: "offer-occidental-marhaba.jpg" },
  { title: "Hotel Marhaba Beach", price: "13000 DA", image: "offer-marhaba-beach.jpg" },
  { title: "El Mouradi Club Kantaoui", price: "6600 DA", image: "offer-kantaoui.jpg" },
  { title: "Hotel Marabout Sousse", price: "6900 DA", image: "offer-marabout.jpg" },
  { title: "Sol Palmeras Beach", price: "4500 DA", image: "offer-sol-palmeras.jpg" },
];

const $ = (sel) => document.querySelector(sel);
const slider = $("#offersSlider");
const dots = $("#offerDots");

let firebaseReady = false;
let firestoreDb = null;
let firebaseFns = {};

async function initFirebase() {
  const cfg = window.REDX_FIREBASE_CONFIG || {};
  if (!cfg.apiKey || !cfg.projectId) return;
  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const dbModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const app = appModule.initializeApp(cfg);
    firestoreDb = dbModule.getFirestore(app);
    firebaseFns = dbModule;
    firebaseReady = true;
    console.log("Firebase connecté");
  } catch (error) {
    console.warn("Firebase non connecté:", error);
  }
}

function renderOffers() {
  slider.innerHTML = offers.map((offer, index) => `
    <article class="offerCard" data-index="${index}">
      <img src="${offer.image}" alt="${offer.title}">
      <div class="offerCaption">
        <div>
          <h3>${offer.title}</h3>
          <p>Offre publiée par Red X Travel</p>
        </div>
        <span class="offerBadge">À partir de ${offer.price}</span>
      </div>
    </article>
  `).join("");

  dots.innerHTML = offers.map((_, index) => `<button aria-label="Aller à l'offre ${index + 1}" data-dot="${index}"></button>`).join("");
  updateDots();
  renderAdminOffers();
}

function updateDots() {
  const cards = [...document.querySelectorAll(".offerCard")];
  if (!cards.length) return;
  const sliderRect = slider.getBoundingClientRect();
  let active = 0;
  let closest = Infinity;
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const dist = Math.abs((rect.left + rect.width / 2) - (sliderRect.left + sliderRect.width / 2));
    if (dist < closest) { closest = dist; active = i; }
  });
  document.querySelectorAll("[data-dot]").forEach((dot, i) => dot.classList.toggle("active", i === active));
}

$("#prevOffer").addEventListener("click", () => slider.scrollBy({ left: -700, behavior: "smooth" }));
$("#nextOffer").addEventListener("click", () => slider.scrollBy({ left: 700, behavior: "smooth" }));
slider.addEventListener("scroll", () => window.requestAnimationFrame(updateDots));
dots.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-dot]");
  if (!dot) return;
  const card = document.querySelector(`.offerCard[data-index="${dot.dataset.dot}"]`);
  card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
});

function localRequests() {
  return JSON.parse(localStorage.getItem("redx_requests") || "[]");
}
function saveLocalRequest(data) {
  const all = localRequests();
  all.unshift(data);
  localStorage.setItem("redx_requests", JSON.stringify(all));
}

$("#travelForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.createdAt = new Date().toISOString();
  data.status = "Nouveau";

  try {
    if (firebaseReady) {
      await firebaseFns.addDoc(firebaseFns.collection(firestoreDb, "requests"), data);
    }
    saveLocalRequest(data);
    $("#formStatus").textContent = "Demande envoyée avec succès. Red X Travel vous contactera rapidement.";
    form.reset();
    renderRequests();
  } catch (error) {
    console.error(error);
    saveLocalRequest(data);
    $("#formStatus").textContent = "Demande enregistrée localement. Firebase sera connecté ensuite.";
    form.reset();
  }
});

function renderRequests(rows = localRequests()) {
  const table = $("#requestsTable");
  if (!table) return;
  $("#totalRequests").textContent = rows.length;
  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="5">Aucune demande pour le moment.</td></tr>`;
    return;
  }
  table.innerHTML = rows.map(r => `
    <tr>
      <td>${r.name || "-"}</td>
      <td>${r.phone || "-"}</td>
      <td>${[r.country, r.city].filter(Boolean).join(", ") || "-"}</td>
      <td>${r.serviceType || "-"}</td>
      <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString("fr-FR") : "-"}</td>
    </tr>
  `).join("");
}

async function loadFirebaseRequests() {
  if (!firebaseReady) return renderRequests();
  try {
    const q = firebaseFns.query(firebaseFns.collection(firestoreDb, "requests"), firebaseFns.orderBy("createdAt", "desc"));
    const snap = await firebaseFns.getDocs(q);
    const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRequests(rows);
  } catch (err) {
    console.warn(err);
    renderRequests();
  }
}

function renderAdminOffers() {
  const grid = $("#adminOffersGrid");
  if (!grid) return;
  $("#totalOffers").textContent = offers.length;
  grid.innerHTML = offers.map(o => `
    <div class="adminOffer">
      <img src="${o.image}" alt="${o.title}">
      <div><strong>${o.title}</strong><p>À partir de ${o.price}</p></div>
    </div>
  `).join("");
}

function showAdminIfNeeded() {
  const path = window.location.pathname.toLowerCase();
  if (path !== "/admin") return;
  $("#publicSite").hidden = true;
  $("#adminSite").hidden = false;
  document.body.style.background = "#f3f7fb";
}

$("#adminLoginBtn")?.addEventListener("click", async () => {
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value.trim();
  const admin = window.REDX_ADMIN || {};
  if (email === admin.email && password === admin.password) {
    $("#adminLogin").hidden = true;
    $("#adminDashboard").hidden = false;
    await loadFirebaseRequests();
  } else {
    alert("Email ou mot de passe incorrect.");
  }
});

$("#logoutBtn")?.addEventListener("click", () => {
  $("#adminLogin").hidden = false;
  $("#adminDashboard").hidden = true;
});

document.querySelectorAll("aside [data-panel]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("aside [data-panel]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel").forEach(p => p.hidden = true);
    $("#" + btn.dataset.panel).hidden = false;
  });
});

await initFirebase();
renderOffers();
renderRequests();
showAdminIfNeeded();

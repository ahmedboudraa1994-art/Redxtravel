const offers = [
  { title: "Hotel Tour Khalef", price: "21000 DA", image: "offer-khalef.jpg" },
  { title: "Hotel Occidental Marhaba", price: "17000 DA", image: "offer-occidental-marhaba.jpg" },
  { title: "Hotel Marhaba Beach", price: "13000 DA", image: "offer-marhaba-beach.jpg" },
  { title: "El Mouradi Club Kantaoui", price: "6600 DA", image: "offer-kantaoui.jpg" },
  { title: "Hotel Marabout Sousse", price: "6900 DA", image: "offer-marabout.jpg" },
  { title: "Sol Palmeras Beach", price: "4500 DA", image: "offer-sol-palmeras.jpg" }
];

const $ = (s) => document.querySelector(s);

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
  } catch (e) {
    console.warn("Firebase non connecté", e);
  }
}

function renderOffers() {
  const track = $("#offersTrack");
  const dots = $("#offerDots");
  if (!track) return;
  track.innerHTML = offers.map((o, i) => `
    <article class="offer-card" data-index="${i}">
      <img src="${o.image}" alt="${o.title}">
      <div class="offer-meta">
        <div><h3>${o.title}</h3><p>Offre Red X Travel</p></div>
        <span class="price-chip">À partir de ${o.price}</span>
      </div>
    </article>
  `).join("");
  dots.innerHTML = offers.map((_, i) => `<button data-dot="${i}" aria-label="Offre ${i+1}"></button>`).join("");
  updateDots();
  renderAdminOffers();
}

function updateDots() {
  const track = $("#offersTrack");
  const cards = [...document.querySelectorAll(".offer-card")];
  if (!track || !cards.length) return;
  const center = track.getBoundingClientRect().left + track.getBoundingClientRect().width / 2;
  let active = 0, dist = Infinity;
  cards.forEach((card, i) => {
    const r = card.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - center);
    if (d < dist) { dist = d; active = i; }
  });
  document.querySelectorAll("[data-dot]").forEach((dot, i) => dot.classList.toggle("active", i === active));
}

$("#prevOffer")?.addEventListener("click", () => $("#offersTrack").scrollBy({ left: -700, behavior: "smooth" }));
$("#nextOffer")?.addEventListener("click", () => $("#offersTrack").scrollBy({ left: 700, behavior: "smooth" }));
$("#offersTrack")?.addEventListener("scroll", () => requestAnimationFrame(updateDots));
$("#offerDots")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-dot]");
  if (!b) return;
  document.querySelector(`.offer-card[data-index="${b.dataset.dot}"]`)?.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
});

function getLocalRequests(){ return JSON.parse(localStorage.getItem("redx_requests") || "[]"); }
function saveLocalRequest(data){
  const all = getLocalRequests();
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
    $("#formStatus").textContent = "Votre demande a été envoyée avec succès.";
    form.reset();
    renderRequests();
  } catch (err) {
    console.error(err);
    saveLocalRequest(data);
    $("#formStatus").textContent = "Demande enregistrée. Connexion Firebase à finaliser.";
    form.reset();
  }
});

function renderRequests(rows = getLocalRequests()) {
  const body = $("#requestsTable");
  if (!body) return;
  $("#totalRequests").textContent = rows.length;
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5">Aucune demande pour le moment.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(r => `
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
    renderRequests(snap.docs.map(d => ({ id:d.id, ...d.data() })));
  } catch {
    renderRequests();
  }
}

function renderAdminOffers() {
  const grid = $("#adminOffersGrid");
  if (!grid) return;
  $("#totalOffers").textContent = offers.length;
  grid.innerHTML = offers.map(o => `
    <div class="admin-offer"><img src="${o.image}" alt="${o.title}"><div><strong>${o.title}</strong><p>${o.price}</p></div></div>
  `).join("");
}

function showAdminIfNeeded() {
  if (location.pathname.toLowerCase() !== "/admin") return;
  document.querySelector("main")?.remove();
  document.querySelector(".site-header")?.remove();
  document.querySelector(".footer")?.remove();
  document.querySelector(".floating-cta")?.remove();
  $("#adminSite").hidden = false;
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
    alert("Accès refusé.");
  }
});

$("#logoutBtn")?.addEventListener("click", () => {
  $("#adminLogin").hidden = false;
  $("#adminDashboard").hidden = true;
});

document.querySelectorAll("[data-panel]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-panel]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-panel").forEach(p => p.hidden = true);
    $("#" + btn.dataset.panel).hidden = false;
  });
});

await initFirebase();
renderOffers();
renderRequests();
showAdminIfNeeded();

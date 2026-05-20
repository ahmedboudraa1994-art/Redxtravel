
const fallbackOffers=[]
let offers=[...fallbackOffers],requestsCache=[],firebaseReady=false,firestoreDb=null,storageBucket=null,firebaseFns={},storageFns={};
const $=s=>document.querySelector(s);

async function initFirebase(){
 const cfg=window.REDX_FIREBASE_CONFIG||{};
 if(!cfg.apiKey||!cfg.projectId)return;
 try{
  const appModule=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const dbModule=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const stModule=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js");
  const app=appModule.initializeApp(cfg);
  firestoreDb=dbModule.getFirestore(app);
  storageBucket=stModule.getStorage(app);
  firebaseFns=dbModule; storageFns=stModule; firebaseReady=true;
 }catch(e){console.warn("Firebase non connecté:",e)}
}
function localRequests(){return JSON.parse(localStorage.getItem("redx_requests")||"[]")}
function saveLocalRequest(data){const r=localRequests();r.unshift(data);localStorage.setItem("redx_requests",JSON.stringify(r))}

async function loadOffers(){
 if(!firebaseReady){offers=[...fallbackOffers];renderOffers();renderAdminOffers();return}
 try{
  const q=firebaseFns.query(firebaseFns.collection(firestoreDb,"offers"),firebaseFns.orderBy("createdAt","desc"));
  const snap=await firebaseFns.getDocs(q);
  const dynamic=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
   const ao=Number(a.order||9999), bo=Number(b.order||9999);
   if(ao!==bo) return ao-bo;
   return String(b.createdAt||"").localeCompare(String(a.createdAt||""));
  });
  offers=dynamic.length?dynamic:[...fallbackOffers];
 }catch(e){console.warn(e);offers=[...fallbackOffers]}
 renderOffers();renderAdminOffers();
}
function renderOffers(){
 const track=$("#offerTrack"),dots=$("#offerDots"); if(!track||!dots)return;
 if(!offers.length){
  track.innerHTML=`<article class="offer-card empty-offer-card"><div><span class="section-label">Offres en préparation</span><h3>Aucune offre publiée pour le moment.</h3><p>L’agence Red X Travel ajoutera bientôt ses nouvelles offres depuis l’espace admin.</p></div></article>`;
  dots.innerHTML="";
  return;
 }
 track.innerHTML=offers.map((o,i)=>`<article class="offer-card" data-index="${i}"><div class="poster"><img src="${o.image||o.imageUrl}" alt="${o.title||"Offre"}"></div><div class="offer-info"><div><h3>${o.title||"Offre Red X Travel"}</h3><small>${o.detail||"Offre publiée par l’agence"}</small></div><span class="price">${o.price?"À partir de "+o.price:"Prix sur demande"}</span></div></article>`).join("");
 dots.innerHTML=offers.map((_,i)=>`<button data-dot="${i}" aria-label="Offre ${i+1}"></button>`).join("");
 updateDots();
}
function updateDots(){
 const track=$("#offerTrack"),cards=[...document.querySelectorAll(".offer-card")]; if(!track||!cards.length)return;
 const r=track.getBoundingClientRect(),center=r.left+r.width/2;let active=0,best=Infinity;
 cards.forEach((c,i)=>{const cr=c.getBoundingClientRect(),d=Math.abs(cr.left+cr.width/2-center);if(d<best){best=d;active=i}});
 document.querySelectorAll("[data-dot]").forEach((d,i)=>d.classList.toggle("active",i===active));
}
$("#prevOffer")?.addEventListener("click",()=>$("#offerTrack").scrollBy({left:-680,behavior:"smooth"}));
$("#nextOffer")?.addEventListener("click",()=>$("#offerTrack").scrollBy({left:680,behavior:"smooth"}));
$("#offerTrack")?.addEventListener("scroll",()=>requestAnimationFrame(updateDots));
$("#offerDots")?.addEventListener("click",e=>{const dot=e.target.closest("[data-dot]");if(!dot)return;document.querySelector(`.offer-card[data-index="${dot.dataset.dot}"]`)?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})});

$("#travelForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget,btn=form.querySelector("button[type='submit']"),data=Object.fromEntries(new FormData(form).entries());
 data.createdAt=new Date().toISOString(); data.status="Nouveau";
 if(btn){btn.disabled=true;btn.textContent=(translations[currentLang()]||translations.fr).sentBtn}
 const t=translations[currentLang()]||translations.fr;
 $("#formStatus").innerHTML=`<span class="success-title">${t.successTitle}</span><span class="success-text">${t.successText}</span>`;
 $("#formStatus").classList.add("success-box");
 saveLocalRequest(data);
 try{if(firebaseReady)await firebaseFns.addDoc(firebaseFns.collection(firestoreDb,"requests"),data)}catch(e){console.warn(e)}
 form.reset();
 setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent=(translations[currentLang()]||translations.fr).submit}},2500);
});

async function loadRequests(){
 if(!firebaseReady){requestsCache=localRequests();renderRequests();return}
 try{
  const q=firebaseFns.query(firebaseFns.collection(firestoreDb,"requests"),firebaseFns.orderBy("createdAt","desc"));
  const snap=await firebaseFns.getDocs(q);
  requestsCache=snap.docs.map(d=>({id:d.id,...d.data()}));
 }catch(e){console.warn(e);requestsCache=localRequests()}
 renderRequests();
}
function renderRequests(){
 const list=$("#requestsList"),total=$("#totalRequests"); if(!list)return;
 if(total)total.textContent=requestsCache.length;
 if(!requestsCache.length){list.innerHTML=`<div class="empty-admin">Aucune demande pour le moment.</div>`;return}
 list.innerHTML=requestsCache.map(r=>`<article class="request-card"><div class="request-main"><div><h3>${r.name||"Client"}</h3><p>${[r.country,r.city].filter(Boolean).join(", ")||"Destination non précisée"}</p></div><span class="status-pill">${r.status||"Nouveau"}</span></div><div class="request-details"><p><strong>Téléphone:</strong> ${r.phone||"-"}</p><p><strong>Email:</strong> ${r.email||"-"}</p><p><strong>Service:</strong> ${r.serviceType||"-"}</p><p><strong>Billet:</strong> ${r.ticketType||"-"}</p><p><strong>Voyageurs:</strong> ${r.travelers||"-"}</p><p><strong>Dates:</strong> ${r.departureDate||"-"} → ${r.returnDate||"-"}</p><p><strong>Budget:</strong> ${r.budget||"-"}</p><p><strong>Message:</strong> ${r.message||"-"}</p></div><div class="request-actions"><select data-status="${r.id||""}"><option ${r.status==="Nouveau"?"selected":""}>Nouveau</option><option ${r.status==="Contacté"?"selected":""}>Contacté</option><option ${r.status==="Confirmé"?"selected":""}>Confirmé</option><option ${r.status==="Annulé"?"selected":""}>Annulé</option></select><a class="admin-whatsapp" href="https://wa.me/${String(r.phone||"").replace(/[^0-9]/g,"")}" target="_blank" rel="noreferrer">WhatsApp</a><button class="danger-btn" data-delete-request="${r.id||""}">Supprimer</button></div></article>`).join("");
}
async function updateRequestStatus(id,status){if(!id||!firebaseReady)return;await firebaseFns.updateDoc(firebaseFns.doc(firestoreDb,"requests",id),{status});await loadRequests()}
async function deleteRequest(id){if(!id||!firebaseReady)return;if(!confirm("Supprimer cette demande ?"))return;await firebaseFns.deleteDoc(firebaseFns.doc(firestoreDb,"requests",id));await loadRequests()}
document.addEventListener("change",async e=>{const s=e.target.closest("[data-status]");if(s)await updateRequestStatus(s.dataset.status,s.value)});
document.addEventListener("click",async e=>{const dr=e.target.closest("[data-delete-request]");if(dr)await deleteRequest(dr.dataset.deleteRequest);const of=e.target.closest("[data-delete-offer]");if(of)await deleteOffer(of.dataset.deleteOffer,of.dataset.storagePath)});
$("#refreshRequestsBtn")?.addEventListener("click",loadRequests);

$("#offerForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!firebaseReady){alert("Firebase n’est pas encore connecté.");return}
 const form=e.currentTarget,status=$("#offerStatus"),btn=$("#addOfferBtn"),data=Object.fromEntries(new FormData(form).entries()),file=form.image.files[0];
 if(!file){alert("Ajoutez une photo.");return}
 try{
  btn.disabled=true;btn.textContent="Upload en cours...";status.textContent="Publication de l’offre...";
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),storagePath=`offers/${Date.now()}-${safe}`,fileRef=storageFns.ref(storageBucket,storagePath);
  await storageFns.uploadBytes(fileRef,file);
  const imageUrl=await storageFns.getDownloadURL(fileRef);
  await firebaseFns.addDoc(firebaseFns.collection(firestoreDb,"offers"),{title:data.title||"",detail:data.detail||"",price:data.price||"",order:Number(data.order||9999),image:imageUrl,imageUrl,storagePath,createdAt:new Date().toISOString()});
  form.reset();status.textContent="Offre ajoutée avec succès.";await loadOffers();
 }catch(err){console.error(err);status.textContent="Erreur pendant l’ajout. Vérifiez les règles Storage."}
 finally{btn.disabled=false;btn.textContent="Ajouter l’offre"}
});
async function deleteOffer(id,storagePath){
 if(!id||!firebaseReady)return;if(!confirm("Supprimer cette offre ?"))return;
 try{
  await firebaseFns.deleteDoc(firebaseFns.doc(firestoreDb,"offers",id));
  if(storagePath&&storagePath!=="undefined"){try{await storageFns.deleteObject(storageFns.ref(storageBucket,storagePath))}catch(e){console.warn(e)}}
  await loadOffers();
 }catch(e){console.error(e);alert("Impossible de supprimer l’offre.")}
}
function renderAdminOffers(){
 const grid=$("#adminOffersGrid"),total=$("#totalOffers"); if(!grid)return;
 const dynamic=offers.filter(o=>!o.local); if(total)total.textContent=offers.length;
 if(!dynamic.length){grid.innerHTML=`<div class="empty-admin">Aucune offre publiée pour le moment. Ajoutez la première offre avec une photo pour l’afficher sur le site.</div>`;return}
 grid.innerHTML=dynamic.map(o=>`<div class="admin-offer-card"><img src="${o.image||o.imageUrl}" alt="${o.title||"Offre"}"><div><h3>${o.title||"Offre"}</h3><p>${o.detail||""}</p><strong>${o.price||"Prix sur demande"}</strong><span class="order-badge">Position ${o.order||"-"}</span><button class="danger-btn full" data-delete-offer="${o.id}" data-storage-path="${o.storagePath||""}">Supprimer l’offre</button></div></div>`).join("");
}
function showAdminLogin(){
 const login=$("#adminLogin"),dashboard=$("#adminDashboard");
 if(login) login.hidden=false;
 if(dashboard) dashboard.hidden=true;
}

async function showAdminDashboard(){
 const login=$("#adminLogin"),dashboard=$("#adminDashboard");
 if(login) login.hidden=true;
 if(dashboard) dashboard.hidden=false;
 await loadRequests();
 await loadOffers();
}

function loadRememberedAdmin(){
 const saved=localStorage.getItem("redx_admin_remember")==="true";
 const savedEmail=localStorage.getItem("redx_admin_email")||"";
 const savedPassword=localStorage.getItem("redx_admin_password")||"";

 if($("#rememberAdminLogin")) $("#rememberAdminLogin").checked=saved;
 if(savedEmail && $("#adminEmail")) $("#adminEmail").value=savedEmail;
 if(savedPassword && $("#adminPassword")) $("#adminPassword").value=savedPassword;

 return saved && savedEmail && savedPassword;
}

function showAdminIfNeeded(){
 if(location.pathname.toLowerCase()!=="/admin")return;
 $("#publicSite")?.remove();$(".lux-header")?.remove();$(".site-footer")?.remove();$(".floating-whatsapp")?.remove();
 $("#adminSite").hidden=false;

 const isLoggedIn=sessionStorage.getItem("redx_admin_logged_in")==="true";
 const hasRememberedAccess=loadRememberedAdmin();

 if(isLoggedIn || hasRememberedAccess){
   const admin=window.REDX_ADMIN||{};
   const email=localStorage.getItem("redx_admin_email")||"";
   const password=localStorage.getItem("redx_admin_password")||"";
   if(isLoggedIn || (email===admin.email && password===admin.password)){
     sessionStorage.setItem("redx_admin_logged_in","true");
     showAdminDashboard();
     return;
   }
 }
 showAdminLogin();
}
$("#adminLoginBtn")?.addEventListener("click",async()=>{
 const email=$("#adminEmail").value.trim(),password=$("#adminPassword").value.trim(),admin=window.REDX_ADMIN||{};
 if(email===admin.email&&password===admin.password){
   sessionStorage.setItem("redx_admin_logged_in","true");

   if($("#rememberAdminLogin")?.checked){
     localStorage.setItem("redx_admin_remember","true");
     localStorage.setItem("redx_admin_email",email);
     localStorage.setItem("redx_admin_password",password);
   }else{
     localStorage.removeItem("redx_admin_remember");
     localStorage.removeItem("redx_admin_email");
     localStorage.removeItem("redx_admin_password");
   }

   await showAdminDashboard();
 }else{
   alert("Email ou mot de passe incorrect.");
 }
});

$("#adminPassword")?.addEventListener("keydown",async(e)=>{
 if(e.key==="Enter") $("#adminLoginBtn")?.click();
});

$("#logoutBtn")?.addEventListener("click",()=>{
 sessionStorage.removeItem("redx_admin_logged_in");
 localStorage.removeItem("redx_admin_remember");
 localStorage.removeItem("redx_admin_email");
 localStorage.removeItem("redx_admin_password");
 if($("#adminEmail")) $("#adminEmail").value="";
 if($("#adminPassword")) $("#adminPassword").value="";
 if($("#rememberAdminLogin")) $("#rememberAdminLogin").checked=false;
 showAdminLogin();
});
document.querySelectorAll("[data-panel]").forEach(b=>b.addEventListener("click",async()=>{
 document.querySelectorAll("[data-panel]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(p=>p.hidden=true);$("#"+b.dataset.panel).hidden=false;
 if(b.dataset.panel==="requestsPanel")await loadRequests(); if(b.dataset.panel==="offersPanel")await loadOffers();
}));

const translations = {
  fr: {
    dir: "ltr",
    tagline: "Agence touristique · Alger",
    offersTitle: "Nos Offres",
    offersSubtitle: "Faites défiler les photos à gauche ou à droite pour découvrir les offres actuelles.",
    requestLabel: "Demande personnalisée",
    requestTitle: "Demandez votre devis voyage.",
    requestSubtitle: "Remplissez les informations essentielles. L’équipe Red X Travel vous contactera rapidement avec une proposition adaptée.",
    fullName: "Nom complet *",
    fullNamePh: "Ex: Mohamed Amine",
    phone: "Téléphone / WhatsApp *",
    email: "Email",
    serviceType: "Type de service *",
    chooseService: "Choisir un service",
    country: "Pays de destination *",
    countryPh: "Ex: Tunisie",
    city: "Ville de destination *",
    cityPh: "Ex: Sousse",
    departure: "Date aller",
    returnDate: "Date retour",
    ticketType: "Type de billet",
    notSpecified: "Non précisé",
    travelers: "Nombre de voyageurs",
    budget: "Budget approximatif",
    budgetPh: "Ex: 100000 DA",
    message: "Message complémentaire",
    messagePh: "Ajoutez les détails importants : hôtel souhaité, enfants, dates flexibles, etc.",
    submit: "Envoyer ma demande",
    sentBtn: "Demande envoyée",
    successTitle: "Votre demande a bien été envoyée.",
    successText: "Notre équipe Red X Travel vous contactera rapidement par téléphone ou WhatsApp afin de vous proposer les meilleures offres disponibles.",
    contact: "Contact",
    social: "Réseaux sociaux",
    adminPrivate: "Espace privé Red X Travel",
    loginTitle: "Accès Admin",
    loginBtn: "Se connecter",
    saveAccess: "Sauvegarder l’accès sur cet appareil",
    dashboard: "Tableau de bord",
    dashboardSub: "Gérez les demandes clients et les offres depuis votre téléphone.",
    adminRequests: "Demandes",
    adminOffers: "Offres",
    logout: "Déconnexion",
    requestsTitle: "Demandes clients",
    requestsSub: "Consultez, changez le statut ou supprimez les demandes traitées.",
    refresh: "Actualiser",
    offersManage: "Gestion des offres",
    offersManageSub: "Ajoutez une nouvelle affiche ou supprimez une ancienne offre.",
    offerTitle: "Titre de l’offre *",
    offerDetail: "Détail / formule",
    offerPrice: "Prix",
    offerOrder: "Position d’affichage",
    offerPhoto: "Photo de l’offre *",
    addOffer: "Ajouter l’offre",
    noOffers: "Aucune offre publiée pour le moment. Ajoutez la première offre avec une photo pour l’afficher sur le site."
  },
  en: {
    dir: "ltr",
    tagline: "Travel agency · Algiers",
    offersTitle: "Our Offers",
    offersSubtitle: "Swipe left or right to explore the latest travel offers.",
    requestLabel: "Custom request",
    requestTitle: "Request your travel quote.",
    requestSubtitle: "Fill in the essential details. Red X Travel will contact you quickly with a tailored proposal.",
    fullName: "Full name *",
    fullNamePh: "Ex: Mohamed Amine",
    phone: "Phone / WhatsApp *",
    email: "Email",
    serviceType: "Service type *",
    chooseService: "Choose a service",
    country: "Destination country *",
    countryPh: "Ex: Tunisia",
    city: "Destination city *",
    cityPh: "Ex: Sousse",
    departure: "Departure date",
    returnDate: "Return date",
    ticketType: "Ticket type",
    notSpecified: "Not specified",
    travelers: "Number of travelers",
    budget: "Approximate budget",
    budgetPh: "Ex: 100000 DZD",
    message: "Additional message",
    messagePh: "Add important details: preferred hotel, children, flexible dates, etc.",
    submit: "Send my request",
    sentBtn: "Request sent",
    successTitle: "Your request has been sent successfully.",
    successText: "The Red X Travel team will contact you shortly by phone or WhatsApp to offer you the best available options.",
    contact: "Contact",
    social: "Social media",
    adminPrivate: "Private Red X Travel area",
    loginTitle: "Admin Access",
    loginBtn: "Sign in",
    saveAccess: "Save access on this device",
    dashboard: "Dashboard",
    dashboardSub: "Manage client requests and offers from your phone.",
    adminRequests: "Requests",
    adminOffers: "Offers",
    logout: "Log out",
    requestsTitle: "Client requests",
    requestsSub: "Review, update status, or delete processed requests.",
    refresh: "Refresh",
    offersManage: "Offer management",
    offersManageSub: "Add a new poster or delete an old offer.",
    offerTitle: "Offer title *",
    offerDetail: "Details / package",
    offerPrice: "Price",
    offerOrder: "Display position",
    offerPhoto: "Offer photo *",
    addOffer: "Add offer",
    noOffers: "No offers published yet. Add the first offer with a photo to display it on the website."
  },
  ar: {
    dir: "rtl",
    tagline: "وكالة سياحية · الجزائر",
    offersTitle: "عروضنا",
    offersSubtitle: "مرّر الصور يمينًا أو يسارًا للاطلاع على أحدث العروض المتاحة.",
    requestLabel: "طلب مخصّص",
    requestTitle: "اطلب عرض سعر لرحلتك.",
    requestSubtitle: "املأ المعلومات الأساسية، وسيتواصل معك فريق Red X Travel سريعًا لاقتراح العرض الأنسب.",
    fullName: "الاسم الكامل *",
    fullNamePh: "مثال: محمد أمين",
    phone: "رقم الهاتف / واتساب *",
    email: "البريد الإلكتروني",
    serviceType: "نوع الخدمة *",
    chooseService: "اختر الخدمة",
    country: "بلد الوجهة *",
    countryPh: "مثال: تونس",
    city: "مدينة الوجهة *",
    cityPh: "مثال: سوسة",
    departure: "تاريخ الذهاب",
    returnDate: "تاريخ العودة",
    ticketType: "نوع التذكرة",
    notSpecified: "غير محدد",
    travelers: "عدد المسافرين",
    budget: "الميزانية التقريبية",
    budgetPh: "مثال: 100000 دج",
    message: "ملاحظات إضافية",
    messagePh: "أضف التفاصيل المهمة: الفندق المفضل، الأطفال، مرونة التواريخ، وغيرها.",
    submit: "إرسال الطلب",
    sentBtn: "تم إرسال الطلب",
    successTitle: "تم إرسال طلبك بنجاح.",
    successText: "سيتواصل معك فريق Red X Travel قريبًا عبر الهاتف أو واتساب لاقتراح أفضل العروض المتاحة.",
    contact: "معلومات التواصل",
    social: "وسائل التواصل الاجتماعي",
    adminPrivate: "المساحة الخاصة بـ Red X Travel",
    loginTitle: "دخول المسؤول",
    loginBtn: "تسجيل الدخول",
    saveAccess: "حفظ الدخول على هذا الجهاز",
    dashboard: "لوحة التحكم",
    dashboardSub: "إدارة طلبات العملاء والعروض من الهاتف.",
    adminRequests: "الطلبات",
    adminOffers: "العروض",
    logout: "تسجيل الخروج",
    requestsTitle: "طلبات العملاء",
    requestsSub: "اطّلع على الطلبات، غيّر حالتها أو احذف الطلبات التي تمت معالجتها.",
    refresh: "تحديث",
    offersManage: "إدارة العروض",
    offersManageSub: "أضف إعلانًا جديدًا أو احذف عرضًا قديمًا.",
    offerTitle: "عنوان العرض *",
    offerDetail: "التفاصيل / الصيغة",
    offerPrice: "السعر",
    offerOrder: "ترتيب الظهور",
    offerPhoto: "صورة العرض *",
    addOffer: "إضافة العرض",
    noOffers: "لا توجد عروض منشورة حاليًا. أضف أول عرض مع صورة ليظهر في الموقع."
  }
};

function setTextByContains(selector, oldText, newText){
  document.querySelectorAll(selector).forEach(el=>{
    if((el.textContent||"").trim().includes(oldText)) el.textContent=newText;
  });
}

function setPlaceholderByName(name, value){
  const el=document.querySelector(`[name="${name}"]`);
  if(el) el.placeholder=value;
}

function applyLanguage(lang){
  const t=translations[lang]||translations.fr;
  localStorage.setItem("redx_lang",lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=t.dir;
  document.body.classList.toggle("rtl",lang==="ar");

  document.querySelectorAll("[data-lang]").forEach(btn=>btn.classList.toggle("active",btn.dataset.lang===lang));

  setTextByContains("*","Agence touristique · Alger",t.tagline);
  setTextByContains("*","Nos Offres",t.offersTitle);
  setTextByContains("*","Faites défiler les photos à gauche ou à droite pour découvrir les offres actuelles.",t.offersSubtitle);
  setTextByContains(".section-label","Demande personnalisée",t.requestLabel);
  setTextByContains("h2","Demandez votre devis voyage.",t.requestTitle);
  setTextByContains("p","Remplissez les informations essentielles. L’équipe Red X Travel vous contactera rapidement avec une proposition adaptée.",t.requestSubtitle);
  setTextByContains("label","Nom complet *",t.fullName);
  setTextByContains("label","Téléphone / WhatsApp *",t.phone);
  setTextByContains("label","Email",t.email);
  setTextByContains("label","Type de service *",t.serviceType);
  setTextByContains("label","Pays de destination *",t.country);
  setTextByContains("label","Ville de destination *",t.city);
  setTextByContains("label","Date aller",t.departure);
  setTextByContains("label","Date retour",t.returnDate);
  setTextByContains("label","Type de billet",t.ticketType);
  setTextByContains("label","Nombre de voyageurs",t.travelers);
  setTextByContains("label","Budget approximatif",t.budget);
  setTextByContains("label","Message complémentaire",t.message);
  setTextByContains("button","Envoyer ma demande",t.submit);
  setTextByContains("*","Contact",t.contact);
  setTextByContains("*","Réseaux sociaux",t.social);

  setTextByContains("h1","Accès Admin",t.loginTitle);
  setTextByContains("p","Espace privé Red X Travel",t.adminPrivate);
  setTextByContains(".remember-login span","Sauvegarder l’accès sur cet appareil",t.saveAccess);
  setTextByContains("button","Se connecter",t.loginBtn);
  setTextByContains("h1","Tableau de bord",t.dashboard);
  setTextByContains("p","Gérez les demandes clients et les offres depuis votre téléphone.",t.dashboardSub);
  setTextByContains("button","Demandes",t.adminRequests);
  setTextByContains("button","Offres",t.adminOffers);
  setTextByContains("button","Déconnexion",t.logout);
  setTextByContains("h2","Demandes clients",t.requestsTitle);
  setTextByContains("p","Consultez, changez le statut ou supprimez les demandes traitées.",t.requestsSub);
  setTextByContains("button","Actualiser",t.refresh);
  setTextByContains("h2","Gestion des offres",t.offersManage);
  setTextByContains("p","Ajoutez une nouvelle affiche ou supprimez une ancienne offre.",t.offersManageSub);
  setTextByContains("label","Titre de l’offre *",t.offerTitle);
  setTextByContains("label","Détail / formule",t.offerDetail);
  setTextByContains("label","Prix",t.offerPrice);
  setTextByContains("label","Position d’affichage",t.offerOrder);
  setTextByContains("label","Photo de l’offre *",t.offerPhoto);
  setTextByContains("button","Ajouter l’offre",t.addOffer);

  setPlaceholderByName("name",t.fullNamePh);
  setPlaceholderByName("country",t.countryPh);
  setPlaceholderByName("city",t.cityPh);
  setPlaceholderByName("budget",t.budgetPh);
  const msg=document.querySelector('[name="message"]'); if(msg) msg.placeholder=t.messagePh;

  const firstOption=document.querySelector('[name="serviceType"] option[value=""]'); if(firstOption) firstOption.textContent=t.chooseService;
  const ticketOption=document.querySelector('[name="ticketType"] option[value=""]'); if(ticketOption) ticketOption.textContent=t.notSpecified;
}

document.addEventListener("click",(event)=>{
  const btn=event.target.closest("[data-lang]");
  if(!btn)return;
  applyLanguage(btn.dataset.lang);
});

function currentLang(){
  return localStorage.getItem("redx_lang")||"fr";
}

setTimeout(()=>applyLanguage(currentLang()),50);

await initFirebase();await loadOffers();showAdminIfNeeded();

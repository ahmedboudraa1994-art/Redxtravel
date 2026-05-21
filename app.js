
/* V17 robust logout handler - runs before all other app code */
document.addEventListener("click", function(event){
  const logoutButton = event.target.closest && event.target.closest("#logoutBtn");
  if(!logoutButton) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  try{
    sessionStorage.removeItem("redx_admin_session");
    sessionStorage.removeItem("redx_admin_logged_in");
    localStorage.removeItem("redx_admin_remember");
    localStorage.removeItem("redx_admin_email");
    localStorage.removeItem("redx_admin_password");
  }catch(e){}

  window.location.replace("/admin-login");
}, true);


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
 const destination=(data.destination||"").trim();
 if(destination){
  data.country=destination;
  data.city=destination;
  data.message=data.message || `Destination souhaitée: ${destination}`;
 }
 data.createdAt=new Date().toISOString(); data.status="Nouveau";
 if(btn){btn.disabled=true;btn.textContent=langData().sentBtn}
 const lt=langData();
 $("#formStatus").innerHTML=`<span class="success-title">${lt.successTitle}</span><span class="success-text">${lt.successText}</span>`;
 $("#formStatus").classList.add("success-box");
 saveLocalRequest(data);
 try{if(firebaseReady)await firebaseFns.addDoc(firebaseFns.collection(firestoreDb,"requests"),data)}catch(e){console.warn(e)}
 form.reset();
 setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent=langData().submit}},2500);
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

 list.innerHTML=requestsCache.map(r=>{
  const destination = r.destination || r.country || r.city || "Destination non précisée";
  const phone = r.phone || "-";
  const rawMessage = r.message || "";
  const showMessage = rawMessage && !String(rawMessage).startsWith("Destination souhaitée:");

  return `<article class="request-card clean-request-card">
   <div class="request-main">
    <div>
     <h3>${r.name||"Client"}</h3>
     <p class="request-destination">${destination}</p>
    </div>
    <span class="status-pill">${r.status||"Nouveau"}</span>
   </div>

   <div class="request-details clean-request-details">
    <p><strong>Téléphone:</strong> ${phone}</p>
    <p><strong>Destination:</strong> ${destination}</p>
    ${showMessage ? `<p><strong>Message:</strong> ${rawMessage}</p>` : ""}
   </div>

   <div class="request-actions">
    <select data-status="${r.id||""}">
     <option ${r.status==="Nouveau"?"selected":""}>Nouveau</option>
     <option ${r.status==="Contacté"?"selected":""}>Contacté</option>
     <option ${r.status==="Confirmé"?"selected":""}>Confirmé</option>
     <option ${r.status==="Annulé"?"selected":""}>Annulé</option>
    </select>
    <a class="admin-whatsapp" href="https://wa.me/${String(r.phone||"").replace(/[^0-9]/g,"")}" target="_blank" rel="noreferrer">WhatsApp</a>
    <button class="danger-btn" data-delete-request="${r.id||""}">Supprimer</button>
   </div>
  </article>`
 }).join("");
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
 if($("#adminSite")) $("#adminSite").hidden=false; else return; // separate admin pages handled by bootSeparatedAdmin

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


$("#adminPassword")?.addEventListener("keydown",async(e)=>{
 if(e.key==="Enter") $("#adminLoginBtn")?.click();
});


document.querySelectorAll("[data-panel]").forEach(b=>b.addEventListener("click",async()=>{
 document.querySelectorAll("[data-panel]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(p=>p.hidden=true);$("#"+b.dataset.panel).hidden=false;
 if(b.dataset.panel==="requestsPanel")await loadRequests(); if(b.dataset.panel==="offersPanel")await loadOffers();
}));







const I18N = {
  fr: {
    dir:"ltr", tagline:"Agence touristique · Alger",
    navOffers:"Offres", navRequest:"Devis", navTrust:"Pourquoi nous", navContact:"Contact",
    heroTitle:"Votre prochain voyage commence ici.",
    heroSubtitle:"Envoyez une demande rapide, puis découvrez les offres disponibles. Red X Travel vous accompagne avec des propositions claires et adaptées.",
    seeOffers:"Voir les offres", quoteBtn:"Demander un devis",
    hotels:"Séjours & hôtels", hotelsSub:"Des adresses choisies selon votre budget",
    flights:"Billets d’avion", flightsSub:"Aller simple, retour et itinéraires flexibles",
    packs:"Voyages sur mesure", packsSub:"Des programmes adaptés à chaque client",
    currentOffers:"OFFRES ACTUELLES", offersHeading:"Découvrez ensuite les offres disponibles.",
    offersText:"Les affiches regroupent les informations essentielles pour comparer rapidement avant de confirmer votre demande.",
    requestLabel:"Demande personnalisée", requestTitle:"Dites-nous où vous souhaitez partir.",
    requestSubtitle:"Nom, téléphone et destination suffisent. Un conseiller Red X Travel vous contacte rapidement avec les meilleures options.",
    fullName:"Nom & prénom *", fullNamePh:"Ex: Mohamed Amine", destination:"Destination souhaitée *", phone:"Numéro de téléphone *", email:"Email",
    serviceType:"Type de service *", chooseService:"Choisir un service",
    country:"Pays de destination *", countryPh:"Ex: Istanbul, Dubaï, Tunisie...", city:"Ville de destination *", cityPh:"Ex: Sousse",
    departure:"Date aller", returnDate:"Date retour", ticketType:"Type de billet", notSpecified:"Non précisé",
    travelers:"Nombre de voyageurs", budget:"Budget approximatif", budgetPh:"Ex: 100000 DA",
    message:"Message complémentaire", messagePh:"Ajoutez les détails importants : hôtel souhaité, enfants, dates flexibles, etc.",
    submit:"Envoyer ma demande", sentBtn:"Demande envoyée",
    successTitle:"Votre demande a bien été envoyée.",
    successText:"Notre équipe Red X Travel vous contactera rapidement par téléphone ou WhatsApp afin de vous proposer les meilleures offres disponibles.",
    trustLabel:"POURQUOI NOUS CHOISIR", trustTitle:"Une agence proche, réactive et fiable.",
    trust1Title:"Offres vérifiées", trust1Text:"Les offres publiées sont suivies directement par l’agence.",
    trust2Title:"Réponse rapide", trust2Text:"Contact direct par téléphone ou WhatsApp.",
    trust3Title:"Accompagnement réel", trust3Text:"Conseil, réservation et suivi selon le besoin du client.",
    contactInfo:"INFORMATIONS", contactIntro:"Agence touristique basée à Ouled Fayet, Alger. Contact direct pour devis, réservations et accompagnement voyage.",
    contactWhatsApp:"Contacter sur WhatsApp", contact:"Coordonnées", social:"Réseaux sociaux",
    loginTitle:"Accès Admin", adminPrivate:"Espace privé Red X Travel", loginBtn:"Se connecter", saveAccess:"Sauvegarder l’accès sur cet appareil",
    dashboard:"Tableau de bord", dashboardSub:"Gérez les demandes clients et les offres depuis votre téléphone.",
    adminRequests:"Demandes", adminOffers:"Offres", logout:"Déconnexion", requestsStat:"Demandes reçues", offersStat:"Offres publiées",
    requestsTitle:"Demandes clients", requestsSub:"Consultez, changez le statut ou supprimez les demandes traitées.", refresh:"Actualiser",
    offersManage:"Gestion des offres", offersManageSub:"Ajoutez une nouvelle affiche ou supprimez une ancienne offre.",
    offerTitle:"Titre de l’offre *", offerDetail:"Détail / formule", offerPrice:"Prix", offerOrder:"Position d’affichage", offerPhoto:"Photo de l’offre *", addOffer:"Ajouter l’offre",
    noOffers:"Aucune offre publiée pour le moment. Ajoutez la première offre avec une photo pour l’afficher sur le site."
  },
  en: {
    dir:"ltr", tagline:"Travel agency · Algiers",
    navOffers:"Offers", navRequest:"Quote", navTrust:"Why us", navContact:"Contact",
    heroTitle:"Your next trip starts here.",
    heroSubtitle:"Send a quick request, then browse the available offers. Red X Travel supports you with clear, tailored options.",
    seeOffers:"View offers", quoteBtn:"Request a quote",
    hotels:"Stays & hotels", hotelsSub:"Selected options for every budget",
    flights:"Flight tickets", flightsSub:"One-way, return and flexible routes",
    packs:"Tailor-made trips", packsSub:"Travel plans built around each client",
    currentOffers:"CURRENT OFFERS", offersHeading:"Then explore the available offers.",
    offersText:"Each poster includes the key details, making it easy to compare before confirming your request.",
    requestLabel:"Personalized request", requestTitle:"Tell us where you want to go.",
    requestSubtitle:"Name, phone number and destination are enough. A Red X Travel advisor will contact you shortly with the best options.",
    fullName:"Full name *", fullNamePh:"Ex: Mohamed Amine", destination:"Desired destination *", phone:"Phone number *", email:"Email",
    serviceType:"Service type *", chooseService:"Choose a service",
    country:"Destination country *", countryPh:"Ex: Istanbul, Dubai, Tunisia...", city:"Destination city *", cityPh:"Ex: Sousse",
    departure:"Departure date", returnDate:"Return date", ticketType:"Ticket type", notSpecified:"Not specified",
    travelers:"Number of travelers", budget:"Approximate budget", budgetPh:"Ex: 100000 DZD",
    message:"Additional message", messagePh:"Add important details: preferred hotel, children, flexible dates, etc.",
    submit:"Send my request", sentBtn:"Request sent",
    successTitle:"Your request has been sent successfully.",
    successText:"The Red X Travel team will contact you shortly by phone or WhatsApp to offer you the best available options.",
    trustLabel:"WHY CHOOSE US", trustTitle:"A responsive and reliable travel partner.",
    trust1Title:"Verified offers", trust1Text:"Published offers are managed directly by the agency.",
    trust2Title:"Fast response", trust2Text:"Direct contact by phone or WhatsApp.",
    trust3Title:"Real support", trust3Text:"Advice, booking support and follow-up based on each client’s needs.",
    contactInfo:"INFORMATION", contactIntro:"Travel agency based in Ouled Fayet, Algiers. Direct contact for quotes, reservations and travel assistance.",
    contactWhatsApp:"Contact on WhatsApp", contact:"Contact details", social:"Social media",
    loginTitle:"Admin Access", adminPrivate:"Private Red X Travel area", loginBtn:"Sign in", saveAccess:"Save access on this device",
    dashboard:"Dashboard", dashboardSub:"Manage client requests and offers from your phone.",
    adminRequests:"Requests", adminOffers:"Offers", logout:"Log out", requestsStat:"Requests received", offersStat:"Published offers",
    requestsTitle:"Client requests", requestsSub:"Review, update status, or delete processed requests.", refresh:"Refresh",
    offersManage:"Offer management", offersManageSub:"Add a new poster or delete an old offer.",
    offerTitle:"Offer title *", offerDetail:"Details / package", offerPrice:"Price", offerOrder:"Display position", offerPhoto:"Offer photo *", addOffer:"Add offer",
    noOffers:"No offers published yet. Add the first offer with a photo to display it on the website."
  },
  ar: {
    dir:"rtl", tagline:"وكالة سياحية · الجزائر",
    navOffers:"العروض", navRequest:"طلب سعر", navTrust:"لماذا نحن", navContact:"تواصل",
    heroTitle:"رحلتك القادمة تبدأ من هنا.",
    heroSubtitle:"أرسل طلبًا سريعًا، ثم تصفّح العروض المتاحة. فريق Red X Travel يرافقك باقتراحات واضحة ومناسبة.",
    seeOffers:"عرض العروض", quoteBtn:"اطلب عرض سعر",
    hotels:"إقامات وفنادق", hotelsSub:"خيارات مناسبة لمختلف الميزانيات",
    flights:"تذاكر الطيران", flightsSub:"ذهاب فقط، ذهاب وعودة ومسارات مرنة",
    packs:"رحلات حسب الطلب", packsSub:"برامج سفر مصممة حسب احتياج كل عميل",
    currentOffers:"العروض الحالية", offersHeading:"ثم تصفّح العروض المتاحة.",
    offersText:"كل صورة تجمع أهم تفاصيل العرض لتسهيل المقارنة قبل تأكيد طلبك.",
    requestLabel:"طلب مخصّص", requestTitle:"أخبرنا إلى أين تريد السفر.",
    requestSubtitle:"الاسم، رقم الهاتف والوجهة تكفي. سيتواصل معك مستشار من Red X Travel قريبًا بأفضل الخيارات.",
    fullName:"الاسم واللقب *", fullNamePh:"مثال: محمد أمين", destination:"الوجهة المطلوبة *", phone:"رقم الهاتف *", email:"البريد الإلكتروني",
    serviceType:"نوع الخدمة *", chooseService:"اختر الخدمة",
    country:"بلد الوجهة *", countryPh:"مثال: إسطنبول، دبي، تونس...", city:"مدينة الوجهة *", cityPh:"مثال: سوسة",
    departure:"تاريخ الذهاب", returnDate:"تاريخ العودة", ticketType:"نوع التذكرة", notSpecified:"غير محدد",
    travelers:"عدد المسافرين", budget:"الميزانية التقريبية", budgetPh:"مثال: 100000 دج",
    message:"ملاحظات إضافية", messagePh:"أضف التفاصيل المهمة: الفندق المفضل، الأطفال، مرونة التواريخ، وغيرها.",
    submit:"إرسال الطلب", sentBtn:"تم إرسال الطلب",
    successTitle:"تم إرسال طلبك بنجاح.",
    successText:"سيتواصل معك فريق Red X Travel قريبًا عبر الهاتف أو واتساب لاقتراح أفضل العروض المتاحة.",
    trustLabel:"لماذا تختارنا", trustTitle:"وكالة قريبة، سريعة وموثوقة.",
    trust1Title:"عروض موثوقة", trust1Text:"العروض المنشورة تتم متابعتها مباشرة من طرف الوكالة.",
    trust2Title:"رد سريع", trust2Text:"تواصل مباشر عبر الهاتف أو واتساب.",
    trust3Title:"مرافقة حقيقية", trust3Text:"استشارة، حجز ومتابعة حسب حاجة كل عميل.",
    contactInfo:"معلومات التواصل", contactIntro:"وكالة سياحية مقرها أولاد فايت، الجزائر. تواصل مباشر لطلبات الأسعار، الحجوزات ومرافقة السفر.",
    contactWhatsApp:"تواصل عبر واتساب", contact:"بيانات التواصل", social:"وسائل التواصل",
    loginTitle:"دخول المسؤول", adminPrivate:"المساحة الخاصة بـ Red X Travel", loginBtn:"تسجيل الدخول", saveAccess:"حفظ الدخول على هذا الجهاز",
    dashboard:"لوحة التحكم", dashboardSub:"إدارة طلبات العملاء والعروض من الهاتف.",
    adminRequests:"الطلبات", adminOffers:"العروض", logout:"تسجيل الخروج", requestsStat:"الطلبات المستلمة", offersStat:"العروض المنشورة",
    requestsTitle:"طلبات العملاء", requestsSub:"اطّلع على الطلبات، غيّر حالتها أو احذف الطلبات التي تمت معالجتها.", refresh:"تحديث",
    offersManage:"إدارة العروض", offersManageSub:"أضف إعلانًا جديدًا أو احذف عرضًا قديمًا.",
    offerTitle:"عنوان العرض *", offerDetail:"التفاصيل / الصيغة", offerPrice:"السعر", offerOrder:"ترتيب الظهور", offerPhoto:"صورة العرض *", addOffer:"إضافة العرض",
    noOffers:"لا توجد عروض منشورة حاليًا. أضف أول عرض مع صورة ليظهر في الموقع."
  }
};

function langData(){ return I18N[localStorage.getItem("redx_lang") || "fr"] || I18N.fr; }

function applyLanguage(lang){
  const t=I18N[lang] || I18N.fr;
  localStorage.setItem("redx_lang",lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=t.dir;
  document.body.classList.toggle("rtl", lang==="ar");
  document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key=el.dataset.i18n;
    if(t[key]) el.textContent=t[key];
  });
  const setPH=(name,val)=>{ const el=document.querySelector(`[name="${name}"]`); if(el) el.placeholder=val; };
  setPH("name",t.fullNamePh); setPH("destination",t.countryPh); setPH("country",t.countryPh); setPH("city",t.cityPh); setPH("budget",t.budgetPh);
  const msg=document.querySelector('[name="message"]'); if(msg) msg.placeholder=t.messagePh;
  const svc=document.querySelector('[name="serviceType"] option[value=""]'); if(svc) svc.textContent=t.chooseService;
  const ticket=document.querySelector('[name="ticketType"] option[value=""]'); if(ticket) ticket.textContent=t.notSpecified;
  const submit=$("#travelForm button[type='submit']"); if(submit && !submit.disabled) submit.textContent=t.submit;
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-lang]");
  if(btn) applyLanguage(btn.dataset.lang);
});

$(".menu-toggle")?.addEventListener("click",()=>{
  const menu=$("#mobileMenu");
  const btn=$(".menu-toggle");
  menu?.classList.toggle("open");
  btn?.setAttribute("aria-expanded", menu?.classList.contains("open") ? "true" : "false");
});

document.querySelectorAll(".mobile-menu a").forEach(a=>a.addEventListener("click",()=>{
  $("#mobileMenu")?.classList.remove("open");
  $(".menu-toggle")?.setAttribute("aria-expanded","false");
}));

setTimeout(()=>applyLanguage(localStorage.getItem("redx_lang") || "fr"),40);

await initFirebase();
if(!isAdminPath() && !isAdminLoginPath()) await loadOffers();
showAdminIfNeeded();


/* V16 separated admin security flow */
const ADMIN_SESSION_KEY = "redx_admin_session";
const ADMIN_REMEMBER_KEY = "redx_admin_remember";
const ADMIN_EMAIL_KEY = "redx_admin_email";
const ADMIN_PASSWORD_KEY = "redx_admin_password";

function isAdminPath(){
  return location.pathname === "/admin" || location.pathname.endsWith("/admin.html");
}
function isAdminLoginPath(){
  return location.pathname === "/admin-login" || location.pathname.endsWith("/admin-login.html");
}
function adminLoginUrl(){
  return "/admin-login";
}
function adminDashboardUrl(){
  return "/admin";
}
function isSessionValid(){
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "active";
}
function hasRememberedAdmin(){
  const admin = window.REDX_ADMIN || {};
  const remembered = localStorage.getItem(ADMIN_REMEMBER_KEY) === "true";
  const email = localStorage.getItem(ADMIN_EMAIL_KEY) || "";
  const password = localStorage.getItem(ADMIN_PASSWORD_KEY) || "";
  return remembered && email === admin.email && password === admin.password;
}
function activateAdminSession(){
  sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
  sessionStorage.setItem("redx_admin_logged_in", "true");
}
function clearAdminSession(){
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem("redx_admin_logged_in");
}
function clearRememberedAdmin(){
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
  localStorage.removeItem(ADMIN_EMAIL_KEY);
  localStorage.removeItem(ADMIN_PASSWORD_KEY);
  localStorage.removeItem("redx_admin_remember");
  localStorage.removeItem("redx_admin_email");
  localStorage.removeItem("redx_admin_password");
}
function fillRememberedLogin(){
  const saved = localStorage.getItem(ADMIN_REMEMBER_KEY) === "true";
  const email = localStorage.getItem(ADMIN_EMAIL_KEY) || "";
  const password = localStorage.getItem(ADMIN_PASSWORD_KEY) || "";
  if($("#rememberAdminLogin")) $("#rememberAdminLogin").checked = saved;
  if(saved && $("#adminEmail")) $("#adminEmail").value = email;
  if(saved && $("#adminPassword")) $("#adminPassword").value = password;
}

async function bootSeparatedAdmin(){
  if(isAdminLoginPath()){
    fillRememberedLogin();
    if(hasRememberedAdmin()){
      activateAdminSession();
      location.replace(adminDashboardUrl());
      return;
    }
  }

  if(isAdminPath()){
    if(!isSessionValid() && !hasRememberedAdmin()){
      location.replace(adminLoginUrl());
      return;
    }
    activateAdminSession();
    await loadRequests();
    await loadOffers();
  }
}

setTimeout(bootSeparatedAdmin, 80);

$("#adminLoginBtn")?.addEventListener("click", async ()=>{
  const email = $("#adminEmail")?.value.trim() || "";
  const password = $("#adminPassword")?.value.trim() || "";
  const admin = window.REDX_ADMIN || {};

  if(email === admin.email && password === admin.password){
    activateAdminSession();

    if($("#rememberAdminLogin")?.checked){
      localStorage.setItem(ADMIN_REMEMBER_KEY, "true");
      localStorage.setItem(ADMIN_EMAIL_KEY, email);
      localStorage.setItem(ADMIN_PASSWORD_KEY, password);
    }else{
      clearRememberedAdmin();
    }

    location.replace(adminDashboardUrl());
  }else{
    alert("Email ou mot de passe incorrect.");
  }
});

$("#adminPassword")?.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") $("#adminLoginBtn")?.click();
});

$("#logoutBtn")?.addEventListener("click", ()=>{
  clearAdminSession();
  clearRememberedAdmin();
  location.replace(adminLoginUrl());
});


/* V28 close mobile menu on outside tap */
document.addEventListener("click", function(event){
  const menu = document.querySelector("#mobileMenu");
  const toggle = document.querySelector(".menu-toggle");
  if(!menu || !toggle || !menu.classList.contains("open")) return;
  if(menu.contains(event.target) || toggle.contains(event.target)) return;
  menu.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", function(event){
  if(event.key !== "Escape") return;
  const menu = document.querySelector("#mobileMenu");
  const toggle = document.querySelector(".menu-toggle");
  if(menu) menu.classList.remove("open");
  if(toggle) toggle.setAttribute("aria-expanded", "false");
});

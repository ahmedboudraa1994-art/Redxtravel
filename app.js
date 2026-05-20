
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
 if(btn){btn.disabled=true;btn.textContent="Demande envoyée"}
 $("#formStatus").innerHTML=`<span class="success-title">Votre demande a bien été envoyée.</span><span class="success-text">Notre équipe Red X Travel vous contactera rapidement par téléphone ou WhatsApp afin de vous proposer les meilleures offres disponibles.</span>`;
 $("#formStatus").classList.add("success-box");
 saveLocalRequest(data);
 try{if(firebaseReady)await firebaseFns.addDoc(firebaseFns.collection(firestoreDb,"requests"),data)}catch(e){console.warn(e)}
 form.reset();
 setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent="Envoyer ma demande"}},2500);
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

function showAdminIfNeeded(){
 if(location.pathname.toLowerCase()!=="/admin")return;
 $("#publicSite")?.remove();$(".lux-header")?.remove();$(".site-footer")?.remove();$(".floating-whatsapp")?.remove();
 $("#adminSite").hidden=false;
 const isLoggedIn=sessionStorage.getItem("redx_admin_logged_in")==="true";
 if(isLoggedIn){showAdminDashboard()}else{showAdminLogin()}
}
$("#adminLoginBtn")?.addEventListener("click",async()=>{
 const email=$("#adminEmail").value.trim(),password=$("#adminPassword").value.trim(),admin=window.REDX_ADMIN||{};
 if(email===admin.email&&password===admin.password){
   sessionStorage.setItem("redx_admin_logged_in","true");
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
 showAdminLogin();
});
document.querySelectorAll("[data-panel]").forEach(b=>b.addEventListener("click",async()=>{
 document.querySelectorAll("[data-panel]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-panel").forEach(p=>p.hidden=true);$("#"+b.dataset.panel).hidden=false;
 if(b.dataset.panel==="requestsPanel")await loadRequests(); if(b.dataset.panel==="offersPanel")await loadOffers();
}));
await initFirebase();await loadOffers();showAdminIfNeeded();

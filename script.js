const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);const today=new Date().toISOString().slice(0,10);const dateInput=$('#data');if(dateInput&&!dateInput.value)dateInput.value=today;
const accountBtn=$('#accountBtn'),accountMenu=$('#accountMenu');if(accountBtn&&accountMenu){accountBtn.addEventListener('click',e=>{e.stopPropagation();accountMenu.classList.toggle('open');accountBtn.setAttribute('aria-expanded',accountMenu.classList.contains('open'))});document.addEventListener('click',()=>accountMenu.classList.remove('open'))}
const stations=['Savona','Varazze','Albenga','Alassio','Finale Ligure Marina','Spotorno-Noli','Genova Piazza Principe','Genova Brignole','Genova Sestri Ponente','Genova Sampierdarena','Genova Nervi','Genova Voltri','Genova Cornigliano','Milano Centrale','Milano Porta Garibaldi','Torino Porta Nuova','Torino Porta Susa','Roma Termini','Roma Tiburtina','Firenze Santa Maria Novella','Bologna Centrale','Venezia Santa Lucia','Napoli Centrale','La Spezia Centrale','Pisa Centrale'];
const coords={'Savona':0,'Varazze':20,'Genova Voltri':32,'Genova Sestri Ponente':40,'Genova Sampierdarena':48,'Genova Piazza Principe':52,'Genova Brignole':56,'Genova Nervi':66,'Genova Cornigliano':43,'Spotorno-Noli':13,'Finale Ligure Marina':29,'Albenga':47,'Alassio':55,'La Spezia Centrale':150,'Pisa Centrale':230,'Milano Centrale':185,'Milano Porta Garibaldi':188,'Torino Porta Nuova':140,'Torino Porta Susa':137,'Bologna Centrale':300,'Firenze Santa Maria Novella':340,'Roma Termini':570,'Roma Tiburtina':565,'Venezia Santa Lucia':410,'Napoli Centrale':790};
const classMult={Standard:1,Premium:1.28,Business:1.65,Executive:2.25};
function stationSlug(name){return encodeURIComponent(String(name||'').trim())}
function trenitaliaLink(from,to,date,time){
  // Link sicuro: porta al sito ufficiale. Senza API partner non si può aprire il checkout già compilato in modo affidabile.
  return `https://www.trenitalia.com/it.html?utm_source=onerail_demo&from=${stationSlug(from)}&to=${stationSlug(to)}&date=${stationSlug(date)}&time=${stationSlug(time)}`;
}
function rfiMonitorLink(station){return `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?place=${stationSlug(station)}`}
function viaggiaTrenoLink(){return 'https://www.viaggiatreno.it/infomobilita/index.jsp'}
function officialActions(from,to,date,time,label='Continua su Trenitalia'){
  return `<div class="official-actions"><a class="btn official" href="${trenitaliaLink(from,to,date,time)}" target="_blank" rel="noopener">${label}</a><a class="btn secondary" href="${rfiMonitorLink(from)}" target="_blank" rel="noopener">Monitor RFI partenza</a><a class="btn secondary" href="${rfiMonitorLink(to)}" target="_blank" rel="noopener">Monitor RFI arrivo</a></div>`
}
function setupAutocomplete(){ $$('.autocomplete-wrap').forEach(w=>{const input=w.querySelector('.station-input');const box=w.querySelector('.suggestions');if(!input||!box)return;function render(){const v=input.value.trim().toLowerCase();const matches=stations.filter(s=>s.toLowerCase().includes(v)).slice(0,8);box.innerHTML=matches.map(s=>`<button type="button">${s}</button>`).join('');box.classList.toggle('open',matches.length>0&&document.activeElement===input);box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{input.value=b.textContent;box.classList.remove('open')}));}input.addEventListener('input',render);input.addEventListener('focus',render);document.addEventListener('click',e=>{if(!w.contains(e.target))box.classList.remove('open')});});}setupAutocomplete();
const searchForm=$('#searchForm');if(searchForm){searchForm.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(searchForm);const params=new URLSearchParams();for(const [k,v]of data.entries())params.set(k,v);location.href=`risultati.html?${params.toString()}`})}
function addMinutes(hhmm,mins){const [h,m]=hhmm.split(':').map(Number);const d=new Date();d.setHours(h||0,m||0,0,0);d.setMinutes(d.getMinutes()+mins);return d.toTimeString().slice(0,5)}
function passengerCount(label){const n=parseInt(String(label||'1').match(/\d+/)?.[0]||'1',10);return Math.max(1,n)}
function routeKm(from,to){const a=coords[from]??0,b=coords[to]??52;return Math.max(8,Math.abs(b-a))}
function basePrice(km,trainType){let perKm=trainType.includes('Regionale')?.115:trainType.includes('Intercity')?.155:.21;let min=trainType.includes('Regionale')?3.2:7.9;return Math.max(min,km*perKm)}
function classPrice(base,classe){return base*(classMult[classe]||1)}
function eur(n){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n)}
function aiScoreTrain(t,single,km){
 const durationScore=Math.max(0,100-t.duration);
 const priceScore=Math.max(0,80-single*3);
 const reliability=t.delay<=0?28:Math.max(0,24-t.delay*2);
 const changeScore=t.changes===0?18:6;
 return Math.round(durationScore*.38+priceScore*.30+reliability+changeScore+t.comfort);
}
function aiReason(t,single){
 const reasons=[];
 if(t.changes===0)reasons.push('diretto');
 if(t.delay<=0)reasons.push('più affidabile');
 if(single<12)reasons.push('prezzo basso');
 if(t.duration<60)reasons.push('rapido');
 if(!reasons.length)reasons.push('buon equilibrio');
 return reasons.slice(0,3).join(' · ');
}
function buildTrainRow(t,from,to,date,time,classe,pax,km,isRecommended=false){
 const single=classPrice(basePrice(km,t.type),classe)*t.priceFactor;
 const total=single*pax;
 const arrive=addMinutes(t.depart,t.duration);
 const score=aiScoreTrain(t,single,km);
 const params=new URLSearchParams({treno:t.name,parte:t.depart,arriva:arrive,durata:`${t.duration} min`,prezzo:eur(total),prezzoBase:single.toFixed(2),da:from,a:to,data:date,ora:time,classe:classe,passeggeri:String(pax),km:String(km)});
 const badges=`${isRecommended?'<span class="recommended-badge">Consigliato</span>':''}<span class="score-badge">AI ${score}/100</span>`;
 return `<tr class="${isRecommended?'recommended-row':''}"><td><strong>${t.name}</strong><br><small>${km} km circa · ${t.changes===0?'diretto':t.changes+' cambio'}</small></td><td>${t.depart}</td><td>${arrive}</td><td>${t.duration} min</td><td><strong>${eur(total)}</strong><br><small>${eur(single)} cad. prima degli sconti</small></td><td>${badges}<br><small>${aiReason(t,single)}</small></td><td><div class="row-actions"><a class="btn" href="biglietto.html?${params.toString()}">Acquista demo</a><a class="ghost small" href="${trenitaliaLink(from,to,date,time)}" target="_blank" rel="noopener">Trenitalia</a></div></td></tr>`;
}
function buildRecommendedCard(t,from,to,date,time,classe,pax,km,rank){
 const single=classPrice(basePrice(km,t.type),classe)*t.priceFactor;
 const total=single*pax;
 const arrive=addMinutes(t.depart,t.duration);
 const score=aiScoreTrain(t,single,km);
 const params=new URLSearchParams({treno:t.name,parte:t.depart,arriva:arrive,durata:`${t.duration} min`,prezzo:eur(total),prezzoBase:single.toFixed(2),da:from,a:to,data:date,ora:time,classe:classe,passeggeri:String(pax),km:String(km)});
 return `<article class="ai-card"><div class="ai-card-top"><span class="recommended-badge">#${rank} Consigliato</span><span class="score-badge">AI ${score}/100</span></div><h3>${t.name}</h3><p>${from} → ${to}</p><div class="ai-metrics"><span>${t.depart} → ${arrive}</span><span>${t.duration} min</span><span>${t.changes===0?'Diretto':t.changes+' cambio'}</span></div><div class="ai-reason">Perché: ${aiReason(t,single)}</div><div class="ai-price">${eur(total)} <small>totale</small></div><div class="row-actions"><a class="btn" href="biglietto.html?${params.toString()}">Acquista demo</a><a class="ghost small" href="${trenitaliaLink(from,to,date,time)}" target="_blank" rel="noopener">Trenitalia</a></div></article>`;
}
function fillResults(){const box=$('#resultsBox');if(!box)return;const q=new URLSearchParams(location.search);const from=q.get('da')||'Savona',to=q.get('a')||'Genova Piazza Principe',date=q.get('data')||today,time=q.get('ora')||'14:00',pass=q.get('passeggeri')||'1 adulto',classe=q.get('classe')||'Standard';const pax=passengerCount(pass);const km=routeKm(from,to);$('#routeTitle').textContent=`${from} → ${to}`;$('#routeMeta').textContent=`${date} dalle ${time} · ${pax} passegger${pax===1?'o':'i'} · ${classe} · circa ${km} km`;
 const officialBox=$('#officialSearchBox');if(officialBox)officialBox.innerHTML=officialActions(from,to,date,time,'Apri ricerca su Trenitalia');
 const trainDefs=[
  {name:'Regionale Veloce 3015',type:'Regionale Veloce',depart:time,duration:Math.round(24+km*.62),delay:0,changes:0,comfort:4,priceFactor:.92},
  {name:'Intercity 659',type:'Intercity',depart:addMinutes(time,18),duration:Math.round(20+km*.48),delay:8,changes:0,comfort:9,priceFactor:1.04},
  {name:'Frecciabianca 8621',type:'Frecciabianca',depart:addMinutes(time,37),duration:Math.round(18+km*.38),delay:3,changes:0,comfort:13,priceFactor:1.18},
  {name:'Regionale 1248',type:'Regionale',depart:addMinutes(time,52),duration:Math.round(30+km*.72),delay:2,changes:1,comfort:2,priceFactor:.78},
  {name:'Intercity 505',type:'Intercity',depart:addMinutes(time,74),duration:Math.round(22+km*.52),delay:12,changes:0,comfort:8,priceFactor:.98},
  {name:'Regionale Veloce 3367',type:'Regionale Veloce',depart:addMinutes(time,96),duration:Math.round(26+km*.60),delay:0,changes:0,comfort:5,priceFactor:.89},
  {name:'Frecciarossa Link',type:'Frecciabianca',depart:addMinutes(time,118),duration:Math.round(16+km*.34),delay:5,changes:1,comfort:15,priceFactor:1.35},
  {name:'Regionale 2294',type:'Regionale',depart:addMinutes(time,145),duration:Math.round(35+km*.76),delay:0,changes:1,comfort:1,priceFactor:.72}
 ];
 const ranked=[...trainDefs].sort((a,b)=>aiScoreTrain(b,classPrice(basePrice(km,b.type),classe)*b.priceFactor,km)-aiScoreTrain(a,classPrice(basePrice(km,a.type),classe)*a.priceFactor,km));
 const recommended=ranked.slice(0,3);const recBox=$('#recommendedBox');if(recBox)recBox.innerHTML=recommended.map((t,i)=>buildRecommendedCard(t,from,to,date,time,classe,pax,km,i+1)).join('');
 box.innerHTML=trainDefs.map(t=>buildTrainRow(t,from,to,date,time,classe,pax,km,recommended.includes(t))).join('')}
fillResults();
function getTickets(){try{return JSON.parse(localStorage.getItem('onerailTickets')||'[]')}catch{return[]}}function setTickets(t){localStorage.setItem('onerailTickets',JSON.stringify(t))}function validTickets(){const t=getTickets().filter(x=>(x.data||'9999-12-31')>=today);setTickets(t);return t}
function ageFromBirth(birth,travelDate){if(!birth)return 99;const b=new Date(birth+'T00:00:00'),d=new Date((travelDate||today)+'T00:00:00');let age=d.getFullYear()-b.getFullYear();const m=d.getMonth()-b.getMonth();if(m<0||(m===0&&d.getDate()<b.getDate()))age--;return age}
function ticketHtml(t){const pax=t.passengerDetails||[];return `<div class="ticket-route">${t.da} → ${t.a}</div><div class="ticket-meta">${t.data} · ${t.parte}–${t.arriva} · ${t.treno} · ${t.km||''} km</div><div class="ticket-meta">${pax.length||t.passeggeri} passeggeri · ${t.classe}</div>${pax.length?`<ul class="pass-list">${pax.map(p=>`<li>${p.nome} · ${p.nascita} ${p.minorenne?'<span class="discount">-35% minorenne</span>':''} · ${eur(p.prezzo)}</li>`).join('')}</ul>`:''}<div class="ticket-price">Totale ${t.prezzo}</div>`}
function initTicketPurchase(){const form=$('#passengerForm'),wrap=$('#passengerFields'),summary=$('#ticketSummary'),intro=$('#purchaseIntro');if(!form||!wrap||!summary)return;const q=new URLSearchParams(location.search);const pax=passengerCount(q.get('passeggeri'));const single=parseFloat(q.get('prezzoBase')||'5.80');const data=q.get('data')||today;intro.textContent=`Inserisci i dati di ${pax} passegger${pax===1?'o':'i'}. Gli under 18 hanno automaticamente il 35% di sconto.`;wrap.innerHTML=Array.from({length:pax},(_,i)=>`<div class="passenger-card"><h3>Passeggero ${i+1}</h3><div class="form-grid"><div class="field"><label>Nome e cognome</label><input name="nome${i}" required placeholder="Es. Mario Rossi"></div><div class="field"><label>Data di nascita</label><input name="nascita${i}" type="date" required></div></div></div>`).join('');
 function preview(){const fd=new FormData(form);let details=[],total=0;for(let i=0;i<pax;i++){const nome=fd.get(`nome${i}`)||`Passeggero ${i+1}`,nascita=fd.get(`nascita${i}`)||'';const minor=ageFromBirth(nascita,data)<18;const price=single*(minor?.65:1);total+=price;details.push({nome,nascita,minorenne:minor,prezzo:price});}summary.innerHTML=ticketHtml({da:q.get('da')||'Savona',a:q.get('a')||'Genova Piazza Principe',data,parte:q.get('parte')||'14:00',arriva:q.get('arriva')||'14:42',treno:q.get('treno')||'Regionale Veloce',classe:q.get('classe')||'Standard',km:q.get('km')||routeKm(q.get('da'),q.get('a')),passeggeri:pax,prezzo:eur(total),passengerDetails:details})+`<div class="points-preview">Con questo checkout guadagni <strong>${pointsFor(total)} punti fedeltà</strong>.</div>`+officialActions(q.get('da')||'Savona',q.get('a')||'Genova Piazza Principe',data,q.get('parte')||q.get('ora')||'14:00','Completa acquisto reale su Trenitalia');return {details,total}}
 form.addEventListener('input',preview);preview();form.addEventListener('submit',e=>{e.preventDefault();const {details,total}=preview();const earned=pointsFor(total);const ticket={id:Date.now(),da:q.get('da')||'Savona',a:q.get('a')||'Genova Piazza Principe',data,parte:q.get('parte')||q.get('ora')||'14:00',arriva:q.get('arriva')||'14:42',treno:q.get('treno')||'Regionale Veloce',prezzo:eur(total),classe:q.get('classe')||'Standard',passeggeri:pax,km:q.get('km')||routeKm(q.get('da'),q.get('a')),passengerDetails:details,punti:earned};const tickets=validTickets();tickets.push(ticket);setTickets(tickets);addPoints(earned,`Acquisto ${ticket.da} → ${ticket.a}`);$('.purchase-form').innerHTML=`<div class="success">✓</div><h1>Acquisto simulato completato</h1><p>Il biglietto è stato salvato nei tuoi biglietti e hai guadagnato <strong>${earned} punti fedeltà</strong>.</p>`;summary.innerHTML=ticketHtml(ticket)+`<div class="points-preview">Punti accreditati: <strong>${earned}</strong></div>`+officialActions(ticket.da,ticket.a,ticket.data,ticket.parte,'Completa acquisto reale su Trenitalia');});}
initTicketPurchase();
function renderTickets(){const box=$('#ticketsBox');if(!box)return;const tickets=validTickets();if(!tickets.length){box.innerHTML='<p class="notice">Non hai biglietti salvati. Quando completi un acquisto, comparirà qui fino alla data del viaggio.</p>';return}box.innerHTML=tickets.map(t=>`<article class="ticket-item">${ticketHtml(t)}${t.punti?`<div class="points-preview">Punti ottenuti: <strong>${t.punti}</strong></div>`:''}</article>`).join('')}renderTickets();
function getAccounts(){try{return JSON.parse(localStorage.getItem('onerailAccounts')||'[]')}catch{return[]}}
function setAccounts(a){localStorage.setItem('onerailAccounts',JSON.stringify(a))}
function getCurrentAccount(){try{return JSON.parse(localStorage.getItem('onerailCurrentAccount')||'null')}catch{return null}}
function setCurrentAccount(a){localStorage.setItem('onerailCurrentAccount',JSON.stringify(a))}
function updateAccountUI(){const a=getCurrentAccount();$$('.avatar').forEach(x=>x.textContent=a?.nome?.[0]?.toUpperCase()||'G');$$('.account-btn span:nth-child(2)').forEach(x=>x.textContent=a?`${a.nome}`:'Area personale');$$('.guest-only').forEach(x=>x.style.display=a?'none':'block');$$('.auth-only').forEach(x=>x.style.display=a?'block':'none');const mini=$('#accountMini');if(mini)mini.textContent=a?`${a.nome} ${a.cognome} · ${a.email}`:'Non hai ancora effettuato l’accesso.';const ln=$('#loyaltyName');if(ln)ln.textContent=a?`${a.nome} ${a.cognome}`:'Ospite';}
const registerForm=$('#registerForm');if(registerForm){registerForm.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(registerForm);const account={nome:fd.get('nome'),cognome:fd.get('cognome'),email:String(fd.get('email')).toLowerCase(),password:fd.get('password'),createdAt:new Date().toISOString()};const accounts=getAccounts().filter(a=>a.email!==account.email);accounts.push(account);setAccounts(accounts);setCurrentAccount(account);const n=$('#registerNotice');if(n)n.innerHTML='Account salvato in questo browser. Ora puoi vedere dati, biglietti e carta fedeltà.';setTimeout(()=>location.href='area-riservata.html',700);});}
const loginForm=$('#loginForm');if(loginForm){loginForm.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(loginForm);const email=String(fd.get('email')).toLowerCase(),pw=fd.get('password');const acc=getAccounts().find(a=>a.email===email&&a.password===pw);const n=$('#loginNotice');if(acc){setCurrentAccount(acc);if(n)n.textContent='Accesso effettuato. Reindirizzamento all’area personale...';setTimeout(()=>location.href='area-riservata.html',700)}else{if(n)n.textContent='Account non trovato o password errata. Registrati prima in questa demo.'}})}
function getLoyalty(){try{return JSON.parse(localStorage.getItem('onerailLoyalty')||'{"points":0,"history":[],"redeemed":[]}')}catch{return{points:0,history:[],redeemed:[]}}}
function setLoyalty(l){localStorage.setItem('onerailLoyalty',JSON.stringify(l))}
function pointsFor(total){return Math.max(1,Math.round(total*10))}
function addPoints(n,reason){const l=getLoyalty();l.points=(l.points||0)+n;l.history=[{date:new Date().toLocaleDateString('it-IT'),points:n,reason},...(l.history||[])].slice(0,20);setLoyalty(l)}
function renderLoyalty(){const bal=$('#pointsBalance'),box=$('#rewardsBox'),hist=$('#pointsHistory'),lvl=$('#loyaltyLevel');if(!bal&&!box&&!hist)return;const l=getLoyalty();const points=l.points||0;bal.textContent=`${points} punti`;lvl.textContent=points>=5000?'Livello Gold':points>=1800?'Livello Silver':'Livello Base';const rewards=[{id:'coffee',name:'Buono snack bar',cost:350,desc:'Sconto demo per snack o bevanda in stazione.'},{id:'upgrade',name:'Upgrade classe',cost:1200,desc:'Passa da Standard a Premium su un prossimo viaggio demo.'},{id:'discount10',name:'Sconto 10%',cost:1800,desc:'Codice sconto simulato per il prossimo biglietto.'},{id:'lounge',name:'Accesso lounge',cost:2800,desc:'Ingresso demo in sala attesa premium.'},{id:'free',name:'Biglietto breve gratis',cost:4200,desc:'Premio per tratte brevi regionali simulate.'},{id:'gold',name:'Badge Gold',cost:5000,desc:'Badge profilo e vantaggi demo extra.'}];if(box)box.innerHTML=rewards.map(r=>`<article class="reward-card"><h3>${r.name}</h3><p>${r.desc}</p><strong>${r.cost} punti</strong><button class="btn ${points<r.cost?'secondary':''}" data-reward="${r.id}" ${points<r.cost?'disabled':''}>${points>=r.cost?'Riscatta':'Punti insufficienti'}</button></article>`).join('');if(hist)hist.innerHTML=(l.history&&l.history.length)?l.history.map(h=>`<div class="history-row"><span>${h.date}</span><strong>+${h.points}</strong><span>${h.reason}</span></div>`).join(''):'<p class="notice">Non hai ancora guadagnato punti. Completa un checkout per accreditarli.</p>';$$('[data-reward]').forEach(btn=>btn.addEventListener('click',()=>{const r=rewards.find(x=>x.id===btn.dataset.reward);const cur=getLoyalty();if(!r||cur.points<r.cost)return;cur.points-=r.cost;cur.redeemed=[{date:new Date().toLocaleDateString('it-IT'),name:r.name,cost:r.cost},...(cur.redeemed||[])];cur.history=[{date:new Date().toLocaleDateString('it-IT'),points:-r.cost,reason:`Premio riscattato: ${r.name}`},...(cur.history||[])];setLoyalty(cur);renderLoyalty()}));}
updateAccountUI();renderLoyalty();


$$('#logoutBtn').forEach(btn=>btn.addEventListener('click',()=>{localStorage.removeItem('onerailCurrentAccount');updateAccountUI();location.href='index.html';}));
const supportForm=$('#supportForm');if(supportForm){supportForm.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(supportForm);const email=fd.get('email')||'';const oggetto=fd.get('oggetto')||'Richiesta assistenza OneRail';const messaggio=fd.get('messaggio')||'';const body=`Email utente: ${email}%0D%0A%0D%0AMessaggio:%0D%0A${encodeURIComponent(messaggio).replace(/%20/g,'+')}`;location.href=`mailto:gg4bb0@gmail.com?subject=${encodeURIComponent('[OneRail] '+oggetto)}&body=${body}`;const n=$('#supportNotice');if(n)n.textContent='Ho aperto l’app email con la richiesta già compilata. Controlla e premi invia dalla tua email.';});}

$$('[data-demo-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const msg=form.querySelector('.notice');if(msg)msg.textContent='Operazione demo completata correttamente.'}));
function statusBadge(status){const cls=status.includes('orario')?'ok':status.includes('Cancellato')?'cancel':status.includes('partenza')?'warn':'late';return `<span class="${cls}">${status}</span>`}
function renderLivePage(){const mine=$('#myLiveTrains'),others=$('#otherLiveTrains');if(!mine&&!others)return;const demo=[
 {treno:'RV 3015',tratta:'Savona → Genova Brignole',parte:'13:42',stato:'In orario',binario:'3'},
 {treno:'REG 1248',tratta:'Varazze → Savona',parte:'14:05',stato:'+6 min',binario:'2'},
 {treno:'IC 659',tratta:'Milano Centrale → Ventimiglia',parte:'14:18',stato:'+12 min',binario:'1'},
 {treno:'RV 3367',tratta:'Genova Piazza Principe → La Spezia Centrale',parte:'14:31',stato:'In orario',binario:'7'},
 {treno:'FB 8621',tratta:'Torino Porta Nuova → Genova Brignole',parte:'14:45',stato:'+4 min',binario:'5'},
 {treno:'REG 2294',tratta:'Albenga → Savona',parte:'15:02',stato:'In orario',binario:'4'},
 {treno:'RV 2180',tratta:'Savona → Torino Porta Nuova',parte:'15:20',stato:'+18 min',binario:'6'},
 {treno:'REG 12119',tratta:'Genova Voltri → Nervi',parte:'15:37',stato:'In partenza',binario:'1'},
 {treno:'IC 505',tratta:'Roma Termini → Genova Piazza Principe',parte:'16:04',stato:'+25 min',binario:'8'},
 {treno:'REG 3098',tratta:'Finale Ligure Marina → Genova Sestri Ponente',parte:'16:22',stato:'Cancellato',binario:'—'}
 ];
 if(others)others.innerHTML=demo.map(x=>{const start=x.tratta.split(' → ')[0];return `<tr><td><strong>${x.treno}</strong></td><td>${x.tratta}</td><td>${x.parte}</td><td>${statusBadge(x.stato)}</td><td>${x.binario}</td><td><a class="ghost small" href="${rfiMonitorLink(start)}" target="_blank" rel="noopener">RFI</a></td></tr>`}).join('');
 if(mine){const tickets=validTickets();if(!tickets.length){mine.innerHTML='<p class="notice">Non hai treni acquistati. Dopo un acquisto simulato, il treno comparirà qui fino alla data del viaggio.</p>';}else{mine.innerHTML=`<div class="table-wrap"><table class="table live-table"><thead><tr><th>Treno</th><th>Tratta</th><th>Partenza</th><th>Stato</th><th>Binario</th><th>Reale</th></tr></thead><tbody>${tickets.map((t,i)=>{const statuses=['In orario','+5 min','In partenza'];const status=statuses[i%statuses.length];return `<tr><td><strong>${t.treno}</strong><br><small>${t.data}</small></td><td>${t.da} → ${t.a}</td><td>${t.parte||'--:--'}</td><td>${statusBadge(status)}</td><td>${(i%7)+1}</td><td><a class="ghost small" href="${rfiMonitorLink(t.da)}" target="_blank" rel="noopener">RFI</a></td></tr>`}).join('')}</tbody></table></div>`}}
}
renderLivePage();

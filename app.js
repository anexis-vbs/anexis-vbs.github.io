// ANEXIS v0.1 Alpha - Enhanced Design
// Aktenorientierte Vorgangsbearbeitung mit verbessertem UI/UX

import { initFirebase, FirestoreStorage } from './storageService.js';
import { USE_FIRESTORE } from './firebase-config.js';

const STORAGE_KEY = 'anexis.v0.1';

const DEFAULT_OPTION_SETS = {
  gender: ['Männlich','Weiblich','Divers','Keine Angabe'],
  insurance: ['AOK','TK','Barmer','DAK','IKK','Andere','Keine Angabe'],
  socialRoles: ['Anführer','Organisator','Vermittler','Unterstützer','Mitläufer','Einzelgänger','Außenseiter','Beobachter','Stimmungsmacher'],
  auffaelligkeiten: ['häufig verspätet','vergisst Materialien','impulsiv','zurückhaltend','häufig abgelenkt','übernimmt Verantwortung','hilfsbereit','engagiert'],
  commStyles: ['ruhig','direkt','zurückhaltend','gesprächig','höflich','humorvoll'],
  socialNetworks: ['Instagram','TikTok','Snapchat','Discord','WhatsApp','YouTube','Sonstige'],
  appearance: ['selbstbewusst','zurückhaltend','humorvoll','engagiert','ruhig','kontaktfreudig','hilfsbereit'],
  strengths: ['Organisation','Teamarbeit','Kreativität','Hilfsbereitschaft','Verantwortung','Führung'],
  parentContactPossible: ['Ja','Nur Mutter','Nur Vater','Eingeschränkt','Nur in wichtigen Fällen','Nicht möglich'],
  bodyTypes: ['sehr schlank','schlank','durchschnittlich','sportlich','kräftig','stämmig'],
  eyeColors: ['Blau','Grün','Braun','Grau','Hasel','Mischfarbe','Sonstige'],
  hairColors: ['Blond','Braun','Schwarz','Rot','Grau','Gefärbt','Sonstige'],
  hairstyles: ['Kurzhaar','Mittellang','Langhaar','Lockig','Glatt','Undercut','Seitenscheitel','Zopf','Dutt','Glatze','Sonstige'],
  beardTypes: ['Kein Bart','Dreitagebart','Vollbart','Schnurrbart','Kinnbart','Sonstige'],
  specialFeatures: ['Brille','Zahnspange','Narbe','Muttermal','Tattoo','Piercing','Sommersprossen','Sonstige'],
  gaitTypes: ['ruhig','hektisch','sportlich','selbstbewusst','auffällig','unauffällig','zurückhaltend'],
  presenceTypes: ['freundlich','höflich','direkt','humorvoll','selbstbewusst','zurückhaltend','dominant','hilfsbereit','engagiert'],
  groupTypes: ['Freundeskreis A','Freundeskreis B','Sportgruppe','Verein','AG','Projektgruppe','Sonstige'],
  recognitionLevels: ['niedrig','mittel','hoch'],
  behaviorAssessments: ['hilfsbereit','verantwortungsbewusst','zuverlässig','impulsiv','konfliktbereit','ruhig','kontaktfreudig','engagiert','zurückhaltend'],
  priorities: ['Niedrig','Mittel','Hoch','Dringend','Kritisch'],
  measureActions: ['Telefonische Kontaktaufnahme','Vor-Ort-Besuch','Schriftliche Aufforderung','Mediation','Intervention','Weiterleitung','Überwachung','Dokumentation','Beratung','Kontrolle']
};

let OPTIONS = DEFAULT_OPTION_SETS;

async function loadOptionData(){
  try {
    const url = new URL('./options.json', import.meta.url);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Object.assign({}, DEFAULT_OPTION_SETS, data);
  } catch(error) {
    console.warn('Optionen konnten nicht aus options.json geladen werden, benutze Standardwerte.', error);
    return DEFAULT_OPTION_SETS;
  }
}

function genId(prefix = ''){ return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

function escapeHtml(value){ return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatDateEU(value){ if(!value) return '—'; const date = new Date(value); if(Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }); }

function formatDateTimeEU(dateValue, timeValue){ const dateStr = formatDateEU(dateValue); if(dateStr === '—') return '—'; if(!timeValue) return dateStr; return `${dateStr} ${escapeHtml(timeValue)}`; }

function formatDateTimeBerlin(value){ if(!value) return '—'; const date = new Date(value); if(Number.isNaN(date.getTime())) return '—'; return date.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin' }); }

function getCasePersonRoles(caseRecord, personId){ const roles=[]; if(caseRecord.victims?.includes(personId)) roles.push('Geschädigter'); if(caseRecord.suspects?.includes(personId)) roles.push('Beschuldigter'); if(caseRecord.witnesses?.includes(personId)) roles.push('Zeuge'); if(caseRecord.reporters?.includes(personId)) roles.push('Melder'); return roles; }

function createRoleTag(role){ const classes = { 'Geschädigter':'role-victim', 'Beschuldigter':'role-suspect', 'Zeuge':'role-witness', 'Melder':'role-reporter' }[role] || 'role-default'; return `<span class="role-tag ${classes}">${escapeHtml(role)}</span>`; }

function calculateAge(birthDate){ if(!birthDate) return '—'; const date = new Date(birthDate); if(Number.isNaN(date.getTime())) return '—'; const today = new Date(); let age = today.getFullYear() - date.getFullYear(); const monthDiff = today.getMonth() - date.getMonth(); if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--; return age >= 0 ? age : '—'; }

function createQRCodeCanvas(text, size = 140){
  const modules = 21;
  const cell = Math.floor(size / modules);
  const actualSize = cell * modules;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = actualSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, actualSize, actualSize);

  const seed = Array.from(new TextEncoder().encode(text || '')).reduce((acc, byte) => ((acc * 1315423911) ^ byte) >>> 0, 0x811c9dc5);
  const rand = index => {
    const value = Math.sin((seed + index) * 0.0001) * 10000;
    return value - Math.floor(value);
  };

  const drawFinder = (x, y) => {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(x * cell, y * cell, 3 * cell, 3 * cell);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect((x + 1) * cell, (y + 1) * cell, cell, cell);
  };

  drawFinder(0, 0);
  drawFinder(modules - 3, 0);
  drawFinder(0, modules - 3);

  for(let y = 0; y < modules; y++){
    for(let x = 0; x < modules; x++){
      if((x < 3 && y < 3) || (x > modules - 4 && y < 3) || (x < 3 && y > modules - 4)) continue;
      if(rand(x * modules + y) > 0.55){
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  return canvas;
}

class Storage {
  constructor(key){ 
    this.key = key; 
    this.data = { persons: [], cases: [], tasks: [], meta:{created:Date.now(), nextPersonNumber: 1} }; 
    this.load(); 
  }
  
  load(){ 
    try{ 
      const raw = localStorage.getItem(this.key); 
      if(raw){ 
        this.data = JSON.parse(raw); 
        if(!this.data.meta) this.data.meta = { created: Date.now(), nextPersonNumber: 1, nextCaseNumber: 1 };
        this.data.meta.nextPersonNumber = Math.max(this.data.meta.nextPersonNumber || 1, this._getNextPersonIndex());
        this.data.meta.nextCaseNumber = Math.max(this.data.meta.nextCaseNumber || 1, this._getNextCaseNumber());
        this._normalizePersons();
        this._normalizeCases();
        this.save();
      } else { this._seed(); this.save(); } 
    }catch(e){ console.error('Fehler beim Laden der Daten', e); this._seed(); this.save(); } 
  }
  
  save(){ localStorage.setItem(this.key, JSON.stringify(this.data)); }
  
  _getNextPersonIndex(){
    const max = this.data.persons.reduce((current, person) => {
      const match = /^ANX-(\d{6})$/.exec(person.internalId || '');
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(current, value);
    }, 0);
    return max + 1;
  }
  
  _generatePersonInternalId(){
    if(!this.data.meta) this.data.meta = { nextPersonNumber: this._getNextPersonIndex(), nextCaseNumber: this._getNextCaseNumber() };
    const candidate = this._getNextPersonIndex();
    if(!this.data.meta.nextPersonNumber || this.data.meta.nextPersonNumber < candidate) this.data.meta.nextPersonNumber = candidate;
    const next = this.data.meta.nextPersonNumber;
    this.data.meta.nextPersonNumber += 1;
    return `ANX-${String(next).padStart(6,'0')}`;
  }

  _getNextCaseNumber(){
    const max = this.data.cases.reduce((current, c) => {
      const match = /^VG-(\d{6})$/.exec(c.caseNumber || '');
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(current, value);
    }, 0);
    return max + 1;
  }

  _generateCaseNumber(){
    if(!this.data.meta) this.data.meta = { nextPersonNumber: this._getNextPersonIndex(), nextCaseNumber: this._getNextCaseNumber() };
    const candidate = this._getNextCaseNumber();
    if(!this.data.meta.nextCaseNumber || this.data.meta.nextCaseNumber < candidate) this.data.meta.nextCaseNumber = candidate;
    const next = this.data.meta.nextCaseNumber;
    this.data.meta.nextCaseNumber += 1;
    return `VG-${String(next).padStart(6,'0')}`;
  }

  _normalizePerson(person){
    const normalized = Object.assign({
      id: genId('p-'),
      internalId: '',
      givenName: '',
      familyName: '',
      gender: 'Keine Angabe',
      birthDate: '',
      birthplace: '',
      tags: [],
      notes: '',
      city: '',
      street: '',
      postalCode: '',
      mobile: '',
      phone: '',
      email: '',
      insurance: 'Keine Angabe',
      customInsurance: '',
      hasAllergies: false,
      allergyInfo: '',
      specialNotes: '',
      nickname: '',
      socialRoles: [],
      friends: [],
      cooperation: 0,
      reliability: 0,
      socialBehavior: 0,
      conflictPotential: 0,
      auffaelligkeiten: [],
      conflicts: [],
      commStyles: [],
      extraNotes: '',
      motherName: '',
      motherPhone: '',
      fatherName: '',
      fatherPhone: '',
      parentContactPossible: 'Ja',
      friendCircle: [],
      hobbies: [],
      interests: [],
      socialNetworks: [],
      appearance: [],
      specialAttention: 'Nein',
      strengths: [],
      environmentNotes: '',
      mainPhoto: '',
      extraPhotos: [],
      heightCm: '',
      weightKg: '',
      bodyTypes: [],
      eyeColor: '',
      hairColor: '',
      hairstyles: [],
      hairstyleNote: '',
      beardTypes: [],
      specialFeatures: [],
      specialFeaturesNote: '',
      gaitTypes: [],
      presenceTypes: [],
      groupTypes: [],
      recognitionLevel: '',
      behaviorAssessments: [],
      identityNotes: '',
      created: Date.now()
    }, person);

    normalized.tags = Array.isArray(normalized.tags) ? normalized.tags : [];
    normalized.socialRoles = Array.isArray(normalized.socialRoles) ? normalized.socialRoles : [];
    normalized.friends = Array.isArray(normalized.friends) ? normalized.friends : [];
    normalized.auffaelligkeiten = Array.isArray(normalized.auffaelligkeiten) ? normalized.auffaelligkeiten : [];
    normalized.conflicts = Array.isArray(normalized.conflicts) ? normalized.conflicts : [];
    normalized.commStyles = Array.isArray(normalized.commStyles) ? normalized.commStyles : [];
    normalized.friendCircle = Array.isArray(normalized.friendCircle) ? normalized.friendCircle : [];
    normalized.hobbies = Array.isArray(normalized.hobbies) ? normalized.hobbies : [];
    normalized.interests = Array.isArray(normalized.interests) ? normalized.interests : [];
    normalized.socialNetworks = Array.isArray(normalized.socialNetworks) ? normalized.socialNetworks : [];
    normalized.appearance = Array.isArray(normalized.appearance) ? normalized.appearance : [];
    normalized.strengths = Array.isArray(normalized.strengths) ? normalized.strengths : [];
    normalized.mainPhoto = normalized.mainPhoto || '';
    normalized.extraPhotos = Array.isArray(normalized.extraPhotos) ? normalized.extraPhotos : [];
    normalized.heightCm = normalized.heightCm || '';
    normalized.weightKg = normalized.weightKg || '';
    normalized.bodyTypes = Array.isArray(normalized.bodyTypes) ? normalized.bodyTypes : [];
    normalized.eyeColor = normalized.eyeColor || '';
    normalized.hairColor = normalized.hairColor || '';
    normalized.hairstyles = Array.isArray(normalized.hairstyles) ? normalized.hairstyles : [];
    normalized.hairstyleNote = normalized.hairstyleNote || '';
    normalized.beardTypes = Array.isArray(normalized.beardTypes) ? normalized.beardTypes : [];
    normalized.specialFeatures = Array.isArray(normalized.specialFeatures) ? normalized.specialFeatures : [];
    normalized.specialFeaturesNote = normalized.specialFeaturesNote || '';
    normalized.gaitTypes = Array.isArray(normalized.gaitTypes) ? normalized.gaitTypes : [];
    normalized.presenceTypes = Array.isArray(normalized.presenceTypes) ? normalized.presenceTypes : [];
    normalized.groupTypes = Array.isArray(normalized.groupTypes) ? normalized.groupTypes : [];
    normalized.recognitionLevel = normalized.recognitionLevel || '';
    normalized.behaviorAssessments = Array.isArray(normalized.behaviorAssessments) ? normalized.behaviorAssessments : [];
    normalized.identityNotes = normalized.identityNotes || '';
    normalized.hasAllergies = !!normalized.hasAllergies;
    normalized.cooperation = Number.isFinite(normalized.cooperation) ? normalized.cooperation : 0;
    normalized.reliability = Number.isFinite(normalized.reliability) ? normalized.reliability : 0;
    normalized.socialBehavior = Number.isFinite(normalized.socialBehavior) ? normalized.socialBehavior : 0;
    normalized.conflictPotential = Number.isFinite(normalized.conflictPotential) ? normalized.conflictPotential : 0;

    if(!normalized.internalId){ normalized.internalId = this._generatePersonInternalId(); }
    return normalized;
  }
  
  _normalizePersons(){
    this.data.persons = Array.isArray(this.data.persons) ? this.data.persons.map(p => this._normalizePerson(p)) : [];
  }

  _normalizeCase(caseRecord){
    const normalized = Object.assign({
      id: genId('c-'),
      caseNumber: '',
      title: '',
      category: 'Sonstiges',
      status: 'Offen',
      date: '',
      time: '',
      participants: [],
      victims: [],
      suspects: [],
      witnesses: [],
      reporters: [],
      priority: [],
      measureActions: [],
      measureDescription: '',
      description: '',
      notes: [],
      history: [],
      created: Date.now()
    }, caseRecord);

    normalized.participants = Array.isArray(normalized.participants) ? normalized.participants : [];
    normalized.victims = Array.isArray(normalized.victims) ? normalized.victims : [];
    normalized.suspects = Array.isArray(normalized.suspects) ? normalized.suspects : [];
    normalized.witnesses = Array.isArray(normalized.witnesses) ? normalized.witnesses : [];
    normalized.reporters = Array.isArray(normalized.reporters) ? normalized.reporters : [];
    normalized.priority = Array.isArray(normalized.priority) ? normalized.priority : [];
    normalized.measureActions = Array.isArray(normalized.measureActions) ? normalized.measureActions : [];
    normalized.notes = Array.isArray(normalized.notes) ? normalized.notes : [];
    normalized.history = Array.isArray(normalized.history) ? normalized.history : [];
    normalized.measureDescription = normalized.measureDescription || '';
    normalized.time = normalized.time || '';

    const roleIds = new Set([...(normalized.participants || []), ...normalized.victims, ...normalized.suspects, ...normalized.witnesses, ...normalized.reporters]);
    normalized.participants = Array.from(roleIds);

    if(!normalized.caseNumber) normalized.caseNumber = this._generateCaseNumber();
    return normalized;
  }

  _normalizeCases(){
    this.data.cases = Array.isArray(this.data.cases) ? this.data.cases.map(c => this._normalizeCase(c)) : [];
  }
  
  _seed(){ 
    const p1 = this._normalizePerson({ id: genId('p-'), givenName: 'Max', familyName: 'Mustermann', birthDate:'1985-03-12', birthplace:'Berlin', gender:'Männlich', notes:'Beispielakte', tags:['Test'], internalId:'ANX-000001', created:Date.now() }); 
    const p2 = this._normalizePerson({ id: genId('p-'), givenName: 'Anna', familyName: 'Schmidt', birthDate:'1990-07-04', birthplace:'Hamburg', gender:'Weiblich', notes:'Beispielakte 2', tags:[], internalId:'ANX-000002', created:Date.now() }); 
    const c1 = this._normalizeCase({ id: genId('c-'), caseNumber:'VG-000001', title:'Streitfall Parkplatz', category:'Konflikt', status:'Offen', date:new Date().toISOString().slice(0,10), participants:[p1.id,p2.id], description:'Konfliktmeldung', created:Date.now() }); 
    const t1 = { id: genId('t-'), title:'Kontakt aufnehmen', status:'Offen', due:new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10), description:'Rückruf planen', created:Date.now() }; 
    this.data.persons.push(p1,p2); 
    this.data.cases.push(c1); 
    this.data.tasks.push(t1); 
  }
  
  addPerson(person){ this.data.persons.push(this._normalizePerson(person)); this.save(); }
  updatePerson(id, patch){ const p = this.data.persons.find(x=>x.id===id); if(p){ Object.assign(p, patch); this._normalizePerson(p); } this.save(); }
  deletePerson(id){ this.data.persons = this.data.persons.filter(x=>x.id!==id); this.data.cases.forEach(c=>{ c.participants = c.participants.filter(pid=>pid!==id); }); this.save(); }
  
  addCase(c){ this.data.cases.push(this._normalizeCase(c)); this.save(); }
  updateCase(id, patch){ const c = this.data.cases.find(x=>x.id===id); if(c){ Object.assign(c,patch); this._normalizeCase(c); } this.save(); }
  deleteCase(id){ this.data.cases = this.data.cases.filter(x=>x.id===id); this.save(); }
  
  addTask(t){ this.data.tasks.push(t); this.save(); }
  updateTask(id, patch){ const t = this.data.tasks.find(x=>x.id===id); if(t) Object.assign(t,patch); this.save(); }
  deleteTask(id){ this.data.tasks = this.data.tasks.filter(x=>x.id!==id); this.save(); }
}

class App {
  constructor(){
    this.storage = null;
    this.view = document.getElementById('view');
    this.modal = document.getElementById('modal');
    this.modalContent = document.getElementById('modalContent');
    this.modalClose = document.getElementById('modalClose');
    this.navButtons = Array.from(document.querySelectorAll('.nav-btn'));
    this.globalSearch = document.getElementById('globalSearch');
    this.btnQuickNew = document.getElementById('btnQuickNew');
    this.themeSwitch = document.getElementById('themeToggle');

    this.route = 'dashboard';
    this.current = { type: null, id: null, mode: 'view', tab: 'overview' };

    this._bindEvents();
    this.theme = this.loadTheme();
    this.applyTheme();
    if(this.view) this.view.innerHTML = '<div class="card"><h3>Daten werden geladen…</h3></div>';
    this.initStorage();
  }

  _bindEvents(){
    this.navButtons.forEach(b=>b.addEventListener('click',e=>{ 
      this.navButtons.forEach(x=>x.classList.remove('active')); 
      b.classList.add('active'); 
      this.route = b.dataset.route; 
      this.current = { type:null,id:null,mode:'view',tab:'overview' }; 
      this.render(); 
    }));
    this.modalClose.addEventListener('click',()=>this.closeModal());
    this.modal.addEventListener('click', e=>{ if(e.target===this.modal) this.closeModal(); });
    this.globalSearch.addEventListener('input', e=>this.performGlobalSearch(e.target.value));
    this.btnQuickNew.addEventListener('click', ()=> this.openQuickCreateMenu());
    if(this.themeSwitch){
      this.themeSwitch.addEventListener('change', ()=> this.setTheme(this.themeSwitch.checked ? 'light' : 'dark'));
    }
  }

  async initStorage(){
    if(USE_FIRESTORE){
      try{
        const { firestoreDb } = await initFirebase();
        const firestoreStorage = new FirestoreStorage(firestoreDb);
        await firestoreStorage.load();
        this.storage = firestoreStorage;
      } catch(error){
        console.warn('Firestore konnte nicht initialisiert werden, verwende lokalen Speicher.', error);
        this.storage = new Storage(STORAGE_KEY);
      }
    } else {
      this.storage = new Storage(STORAGE_KEY);
    }
    this.render();
  }

  loadTheme(){
    const stored = localStorage.getItem('anexis.theme');
    if(stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(){
    document.body.dataset.theme = this.theme;
    if(this.themeSwitch) this.themeSwitch.checked = this.theme === 'light';
  }

  setTheme(theme){
    this.theme = theme;
    localStorage.setItem('anexis.theme', theme);
    this.applyTheme();
  }

  render(){
    if(this.current.type === 'person'){
      if(this.current.mode === 'edit' || this.current.mode === 'new') return this.renderPersonEdit(this.current.id);
      if(this.current.id) return this.renderPersonDetail(this.current.id);
    }
    if(this.current.type === 'case' && this.current.id) return this.renderCaseDetail(this.current.id);

    switch(this.route){
      case 'persons': return this.renderPersonList();
      case 'cases': return this.renderCaseList();
      case 'tasks': return this.renderTasks();
      default: return this.renderDashboard();
    }
  }

  renderDashboard(){
    const persons = this.storage.data.persons.length;
    const cases = this.storage.data.cases.length;
    const tasksOpen = this.storage.data.tasks.filter(t=>t.status !== 'Erledigt').length;
    
    this.view.innerHTML = '';
    const container = document.createElement('div'); container.className='grid';
    
    const cardStats = document.createElement('div'); cardStats.className='card l';
    cardStats.innerHTML = `<h3>Dashboard</h3><div class="stats"><div class="stat"><strong>${persons}</strong><div>Personen</div></div><div class="stat"><strong>${cases}</strong><div>Vorgänge</div></div><div class="stat"><strong>${tasksOpen}</strong><div>offene Aufgaben</div></div></div>`;

    const recent = document.createElement('div'); recent.className='card h'; recent.innerHTML = '<h3>Letzte Aktivitäten</h3>';
    const list = document.createElement('div'); list.className='list';
    const acts = [];
    this.storage.data.persons.slice(-5).forEach(p=> acts.push({t:p.created, text:`Person: ${p.givenName} ${p.familyName}`}));
    this.storage.data.cases.slice(-5).forEach(c=> acts.push({t:c.created, text:`Vorgang: ${c.title}`}));
    this.storage.data.tasks.slice(-5).forEach(t=> acts.push({t:t.created, text:`Aufgabe: ${t.title}`}));
    acts.sort((a,b)=>b.t-a.t).slice(0,6).forEach(a=>{ const it=document.createElement('div'); it.className='item'; it.innerHTML = `<div>${a.text}</div>`; list.appendChild(it); });
    recent.appendChild(list);

    const shortcuts = document.createElement('div'); shortcuts.className='card h'; shortcuts.innerHTML = '<h3>Schnellaktionen</h3>';
    const scList = document.createElement('div'); scList.className='list';
    [['Person erstellen',()=>this.openPersonNewInMain()],['Vorgang erstellen',()=>this.openCaseNewInMain()],['Aufgabe erstellen',()=>this.openTaskForm()]].forEach(([label,fn])=>{
      const btn = document.createElement('button'); btn.className='btn'; btn.textContent=label; btn.addEventListener('click', fn);
      const it = document.createElement('div'); it.className='item'; it.appendChild(btn); scList.appendChild(it);
    });
    shortcuts.appendChild(scList);

    container.appendChild(cardStats); container.appendChild(recent); container.appendChild(shortcuts); 
    this.view.appendChild(container);
  }

  /* Personen */
  renderPersonList(filter=''){
    const people = this.storage.data.persons.filter(p=>{ 
      if(!filter) return true; 
      const q = filter.toLowerCase(); 
      return `${p.givenName} ${p.familyName}`.toLowerCase().includes(q) || (p.notes||'').toLowerCase().includes(q) || (Array.isArray(p.remarks) ? p.remarks.some(note=>note.text.toLowerCase().includes(q)) : false);
    });
    
    this.view.innerHTML = '';
    const header = document.createElement('div'); header.className='card'; 
    header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>Personen</h3><button class="btn primary" id="btnNewPersonMain">+ Person anlegen</button></div>`;
    this.view.appendChild(header);
    
    const list = document.createElement('div'); list.className='list';
    people.forEach(p=>{
      const it = document.createElement('div'); it.className='item';
      const left = document.createElement('div'); 
      left.innerHTML = `<strong>${p.givenName} ${p.familyName}</strong><div class="muted">${escapeHtml(formatDateEU(p.birthDate))}${p.city ? ' • ' + escapeHtml(p.city) : ''}</div>`;
      const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '8px';
      const btnOpen = document.createElement('button'); btnOpen.className='btn'; btnOpen.textContent='Akte'; btnOpen.addEventListener('click', ()=>{ this.current = {type:'person', id:p.id, mode:'view', tab:'stammdaten'}; this.render(); });
      const btnDel = document.createElement('button'); btnDel.className='btn'; btnDel.textContent='🗑'; btnDel.addEventListener('click', ()=>{ if(confirm('Person löschen?')){ this.storage.deletePerson(p.id); this.renderPersonList(filter); } });
      right.appendChild(btnOpen); right.appendChild(btnDel);
      it.appendChild(left); it.appendChild(right); 
      list.appendChild(it);
    });
    this.view.appendChild(list);
    document.getElementById('btnNewPersonMain').addEventListener('click', ()=>this.openPersonNewInMain());
  }

  openPersonNewInMain(){ 
    this.current = {type:'person', id:null, mode:'new', tab:'stammdaten'}; 
    this.renderPersonEdit(null); 
  }

  renderPersonDetail(personId){
    const p = this.storage.data.persons.find(x=>x.id===personId);
    if(!p) return this.renderPersonList();
    
    this.view.innerHTML='';

    const getPersonName = id => {
      const person = this.storage.data.persons.find(x=>x.id===id);
      return person ? `${person.givenName} ${person.familyName}` : '—';
    };

    const age = calculateAge(p.birthDate);
    const internalId = p.internalId || p.id;

    const header = document.createElement('div'); header.className='record-header';
    const headerTop = document.createElement('div'); headerTop.className='record-header-top';
    const info = document.createElement('div'); info.className='record-header-info';
    info.innerHTML = `<h3>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</h3><div class="record-meta">Personenakte • ${escapeHtml(internalId)}</div>`;
    const actions = document.createElement('div'); actions.className='record-header-actions';
    const btnEdit = document.createElement('button'); btnEdit.className='btn'; btnEdit.textContent='Bearbeiten';
    btnEdit.addEventListener('click', ()=>{ this.current.mode='edit'; this.render(); });
    const btnClose = document.createElement('button'); btnClose.className='btn'; btnClose.textContent='Schließen';
    btnClose.addEventListener('click', ()=>{ this.current={type:null,id:null,mode:'view',tab:'stammdaten'}; this.render(); });
    actions.appendChild(btnEdit); actions.appendChild(btnClose);
    headerTop.appendChild(info); headerTop.appendChild(actions);
    header.appendChild(headerTop);
    this.view.appendChild(header);

    const tabs = document.createElement('div'); tabs.className='tabs';
    ['stammdaten', 'sozial', 'umfeld', 'identitaetsprofil','vermerke','vorgaenge'].forEach(t=>{
      const tab = document.createElement('div');
      tab.className='tab ' + (t === this.current.tab ? 'active' : '');
      tab.textContent = {stammdaten:'Stammdaten', identitaetsprofil:'Identitätsprofil', vermerke:'Vermerke', vorgaenge:'Vorgänge', sozial:'Soziales & Verhalten', umfeld:'Umfeld & Bezugspersonen'}[t];
      tab.addEventListener('click', ()=>{ this.current.tab=t; this.render(); });
      tabs.appendChild(tab);
    });
    this.view.appendChild(tabs);

    if(this.current.mode==='edit'){ this.renderPersonEdit(personId); return; }

    const content = document.createElement('div'); content.className='card record-card-content';
    if(this.current.tab==='stammdaten'){
      content.innerHTML = `
        <div class="section">
          <h4>Grundlegende Informationen</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Vorname</label><div>${escapeHtml(p.givenName)}</div></div>
            <div class="field"><label>Nachname</label><div>${escapeHtml(p.familyName)}</div></div>
            <div class="field"><label>Geschlecht</label><div>${escapeHtml(p.gender)}</div></div>
            <div class="field"><label>Geburtsdatum</label><div>${escapeHtml(formatDateEU(p.birthDate))}</div></div>
            <div class="field"><label>Geburtsort</label><div>${escapeHtml(p.birthplace)}</div></div>
            <div class="field"><label>Aktuelles Alter</label><div>${escapeHtml(age)}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Identifikation</h4>
          <div class="field-grid two-cols">
            <div class="field"><label>Interne Identifikationsnummer</label><div>${escapeHtml(internalId)}</div></div>
            <div class="field qr-panel"><label>QR-Code</label><div id="qrCanvas"></div></div>
          </div>
        </div>
        <div class="section">
          <h4>Kontakt- und Wohninformationen</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Straße</label><div>${escapeHtml(p.street)}</div></div>
            <div class="field"><label>Postleitzahl</label><div>${escapeHtml(p.postalCode)}</div></div>
            <div class="field"><label>Wohnort</label><div>${escapeHtml(p.city)}</div></div>
            <div class="field"><label>Mobiltelefon</label><div>${escapeHtml(p.mobile)}</div></div>
            <div class="field"><label>Festnetztelefon</label><div>${escapeHtml(p.phone)}</div></div>
            <div class="field"><label>E-Mail</label><div>${escapeHtml(p.email)}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Gesundheitliche Informationen</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Krankenkasse</label><div>${escapeHtml(p.insurance)}${p.customInsurance ? ` / ${escapeHtml(p.customInsurance)}` : ''}</div></div>
            <div class="field"><label>Allergien vorhanden</label><div>${p.hasAllergies ? 'Ja' : 'Nein'}</div></div>
          ${p.hasAllergies ? `<div class="field"><label>Allergieinformationen</label><div class="notes-box">${escapeHtml(p.allergyInfo) || 'Keine Informationen'}</div></div>` : ''}
          </div>
          <div class="field-block"><label>Besondere Hinweise</label><div class="notes-box">${escapeHtml(p.specialNotes) || '—'}</div></div>
        </div>
      `;
      this.view.appendChild(content);
      content.querySelector('#qrCanvas').appendChild(createQRCodeCanvas(internalId, 160));
    } else if(this.current.tab==='identitaetsprofil'){
      const extraGallery = (p.extraPhotos || []).map((src, idx) => `<div class="photo-thumb"><img src="${src}" alt="Zusatzfoto ${idx + 1}"></div>`).join('');
      content.innerHTML = `
        <div class="section">
          <h4>Äußeres Erscheinungsbild</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Hauptfoto</label><div>${p.mainPhoto ? `<div style="position:relative;"><img src="${p.mainPhoto}" class="identity-photo" alt="Hauptfoto"></div>` : '<div class="muted">Kein Foto</div>'}</div></div>
            <div class="field"><label>Körpergröße</label><div>${escapeHtml(p.heightCm || '—')} cm</div></div>
            <div class="field"><label>Gewicht</label><div>${escapeHtml(p.weightKg || '—')} kg</div></div>
            <div class="field"><label>Körperbau</label><div>${(p.bodyTypes || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Augenfarbe</label><div>${escapeHtml(p.eyeColor || '—')}</div></div>
            <div class="field"><label>Haarfarbe</label><div>${escapeHtml(p.hairColor || '—')}</div></div>
            <div class="field"><label>Frisur</label><div>${(p.hairstyles || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Frisurbeschreibung</label><div>${escapeHtml(p.hairstyleNote) || '—'}</div></div>
            <div class="field"><label>Bart</label><div>${(p.beardTypes || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Besondere Merkmale</label><div>${(p.specialFeatures || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Beschreibung besonderer Merkmale</label><div>${escapeHtml(p.specialFeaturesNote) || '—'}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Auftreten & Wiedererkennung</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Gangart</label><div>${(p.gaitTypes || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Auftreten</label><div>${(p.presenceTypes || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Gruppenzugehörigkeit</label><div>${(p.groupTypes || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Wiedererkennungswert</label><div>${escapeHtml(p.recognitionLevel || '—')}</div></div>
            <div class="field"><label>Verhaltenseinschätzung</label><div>${(p.behaviorAssessments || []).join(', ') || '—'}</div></div>
          </div>
          <div class="field-block"><label>Freie Notizen</label><div class="notes-box">${escapeHtml(p.identityNotes) || 'Keine Notizen'}</div></div>
          <div class="field-block"><label>Zusatzfotos</label><div class="photo-gallery">${extraGallery || '<div class="muted">Keine Zusatzfotos</div>'}</div></div>
        </div>
      `;
      this.view.appendChild(content);
      content.querySelectorAll('.identity-photo, .photo-thumb img').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => window.open(img.src, '_blank'));
      });
      content.querySelectorAll('[data-remove-main]').forEach(button => {
        button.addEventListener('click', () => {
          this.storage.updatePerson(p.id, { mainPhoto: '' });
          this.render();
        });
      });
      content.querySelectorAll('[data-remove-extra]').forEach(button => {
        button.addEventListener('click', e => {
          const index = Number(button.dataset.removeExtra);
          const photos = Array.isArray(p.extraPhotos) ? [...p.extraPhotos] : [];
          if(Number.isNaN(index) || index < 0 || index >= photos.length) return;
          photos.splice(index, 1);
          this.storage.updatePerson(p.id, { extraPhotos: photos });
          this.render();
        });
      });
    } else if(this.current.tab==='vermerke'){
      const remarks = Array.isArray(p.remarks) ? p.remarks : [];
      const remarksHtml = remarks.length ? remarks.map(note => `
        <div class="section note-entry">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
            <div><strong>Vermerk</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(note.created))}</div></div>
          </div>
          <div class="notes-box">${escapeHtml(note.text)}</div>
        </div>
      `).join('') : '<div class="section"><div class="notes-box">Keine Vermerke vorhanden</div></div>';
      content.innerHTML = `
        <div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div><h4>Vermerke</h4></div>
          <button class="btn primary" type="button" id="addPersonRemarkButton">+ Neuer Vermerk</button>
        </div>
        <div id="personRemarkCreateArea"></div>
        ${remarksHtml}
      `;
      this.view.appendChild(content);

      const noteArea = content.querySelector('#personRemarkCreateArea');
      const addRemarkButton = content.querySelector('#addPersonRemarkButton');
      const renderRemarkForm = () => {
        if(!noteArea) return;
        noteArea.innerHTML = `
          <div class="section">
            <div class="field-block"><label>Neuer Vermerk</label><textarea id="newPersonRemarkText" placeholder="Vermerk eingeben..."></textarea></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px;">
              <button class="btn" type="button" id="cancelPersonRemark">Abbrechen</button>
              <button class="btn primary" type="button" id="savePersonRemark">Speichern</button>
            </div>
          </div>
        `;
        const saveBtn = noteArea.querySelector('#savePersonRemark');
        const cancelBtn = noteArea.querySelector('#cancelPersonRemark');
        saveBtn.addEventListener('click', ()=>{
          const text = (noteArea.querySelector('#newPersonRemarkText')?.value || '').trim();
          if(!text) return;
          const notes = Array.isArray(p.remarks) ? [...p.remarks] : [];
          notes.push({ id: genId('n-'), text, created: Date.now() });
          this.storage.updatePerson(p.id, { remarks: notes });
          this.current = { type:'person', id:p.id, mode:'view', tab:'vermerke' };
          this.render();
        });
        cancelBtn.addEventListener('click', ()=>{ if(noteArea) noteArea.innerHTML = ''; });
      };
      if(addRemarkButton) addRemarkButton.addEventListener('click', renderRemarkForm);
      return;
    } else if(this.current.tab==='vorgaenge'){
      const cases = this.storage.data.cases.filter(c => getCasePersonRoles(c, p.id).length > 0);
      content.innerHTML = `
        <div class="section">
          <h4>Vorgänge mit Beteiligung</h4>
          ${cases.length ? '' : '<div class="notes-box">Keine Vorgänge gefunden</div>'}
        </div>
      `;
      if(cases.length){
        const caseList = document.createElement('div'); caseList.className='list';
        cases.forEach(c => {
          const roles = getCasePersonRoles(c, p.id).map(createRoleTag).join(' ');
          const item = document.createElement('div'); item.className='item';
          const left = document.createElement('div');
          left.innerHTML = `<strong>${escapeHtml(c.title)}</strong><div class="muted">${escapeHtml(c.caseNumber || c.id)} • ${escapeHtml(c.category)} • ${escapeHtml(formatDateTimeEU(c.date, c.time))}</div><div style="margin-top:8px">${roles}</div>`;
          const right = document.createElement('div');
          const openBtn = document.createElement('button'); openBtn.className='btn'; openBtn.textContent='Vorgang öffnen';
          openBtn.addEventListener('click', ()=>{ this.current={type:'case',id:c.id,mode:'view',tab:'overview'}; this.render(); });
          right.appendChild(openBtn);
          item.appendChild(left); item.appendChild(right);
          caseList.appendChild(item);
        });
        content.appendChild(caseList);
      }
      this.view.appendChild(content);
    } else if(this.current.tab==='sozial'){
      const friendNames = (p.friends || []).map(getPersonName).join(', ') || '—';
      const conflictNames = (p.conflicts || []).map(getPersonName).join(', ') || '—';
      content.innerHTML = `
        <div class="section">
          <h4>Soziales</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Spitzname / Bekannt als</label><div>${escapeHtml(p.nickname) || '—'}</div></div>
            <div class="field"><label>Soziale Rolle</label><div>${(p.socialRoles || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Freunde / Bezugspersonen</label><div>${escapeHtml(friendNames)}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Verhalten</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Mitarbeit</label><div>${escapeHtml(String(p.cooperation || 0))}</div></div>
            <div class="field"><label>Zuverlässigkeit</label><div>${escapeHtml(String(p.reliability || 0))}</div></div>
            <div class="field"><label>Sozialverhalten</label><div>${escapeHtml(String(p.socialBehavior || 0))}</div></div>
            <div class="field"><label>Konfliktpotenzial</label><div>${escapeHtml(String(p.conflictPotential || 0))}</div></div>
            <div class="field"><label>Auffälligkeiten</label><div>${(p.auffaelligkeiten || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Konflikte mit Personen</label><div>${escapeHtml(conflictNames)}</div></div>
            <div class="field"><label>Kommunikationsstil</label><div>${(p.commStyles || []).join(', ') || '—'}</div></div>
          </div>
          <div class="field-block"><label>Zusätzliche Hinweise</label><div class="notes-box">${escapeHtml(p.extraNotes) || 'Keine Hinweise'}</div></div>
        </div>
      `;
      this.view.appendChild(content);
    } else if(this.current.tab==='umfeld'){
      const friends = (p.friendCircle || []).map(getPersonName).join(', ') || '—';
      content.innerHTML = `
        <div class="section">
          <h4>Personensorgeberechtigte</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Name Mutter</label><div>${escapeHtml(p.motherName)}</div></div>
            <div class="field"><label>Name Vater</label><div>${escapeHtml(p.fatherName)}</div></div>
            <div class="field"><label>Elternkontakt möglich</label><div>${escapeHtml(p.parentContactPossible)}</div></div>
            <div class="field"><label>Telefon Mutter</label><div>${escapeHtml(p.motherPhone)}</div></div>
            <div class="field"><label>Telefon Vater</label><div>${escapeHtml(p.fatherPhone)}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Persönliches Umfeld</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Freundeskreis</label><div>${escapeHtml(friends)}</div></div>
            <div class="field"><label>Hobbys</label><div>${(p.hobbies || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Persönliche Interessen</label><div>${(p.interests || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Soziale Netzwerke</label><div>${(p.socialNetworks || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Auftreten</label><div>${(p.appearance || []).join(', ') || '—'}</div></div>
            <div class="field"><label>Besondere Beobachtung nötig?</label><div>${escapeHtml(p.specialAttention)}</div></div>
            <div class="field"><label>Stärken</label><div>${(p.strengths || []).join(', ') || '—'}</div></div>
          </div>
          <div class="field-block"><label>Zusätzliche Hinweise</label><div class="notes-box">${escapeHtml(p.environmentNotes) || 'Keine Hinweise'}</div></div>
        </div>
      `;
      this.view.appendChild(content);
    }
  }

  _savePersonEditDraft(){
    if(this.current.mode !== 'edit') return;
    const form = this.view.querySelector('form');
    if(!form) return;
    const fd = new FormData(form);
    const draft = this.current.editData || {};
    Object.assign(draft, {
      givenName: fd.get('givenName') || '',
      familyName: fd.get('familyName') || '',
      gender: fd.get('gender') || 'Keine Angabe',
      birthDate: fd.get('birthDate') || '',
      birthplace: fd.get('birthplace') || '',
      street: fd.get('street') || '',
      postalCode: fd.get('postalCode') || '',
      city: fd.get('city') || '',
      mobile: fd.get('mobile') || '',
      phone: fd.get('phone') || '',
      email: fd.get('email') || '',
      insurance: fd.get('insurance') || 'Keine Angabe',
      customInsurance: fd.get('customInsurance') || '',
      hasAllergies: fd.get('hasAllergies') === 'on',
      allergyInfo: fd.get('allergyInfo') || '',
      specialNotes: fd.get('specialNotes') || '',
      nickname: fd.get('nickname') || '',
      socialRoles: fd.getAll('socialRoles'),
      friends: fd.getAll('friends'),
      cooperation: Number(fd.get('cooperation') || 0),
      reliability: Number(fd.get('reliability') || 0),
      socialBehavior: Number(fd.get('socialBehavior') || 0),
      conflictPotential: Number(fd.get('conflictPotential') || 0),
      auffaelligkeiten: fd.getAll('auffaelligkeiten'),
      conflicts: fd.getAll('conflicts'),
      commStyles: fd.getAll('commStyles'),
      extraNotes: fd.get('extraNotes') || '',
      internalId: fd.get('internalId') || '',
      motherName: fd.get('motherName') || '',
      fatherName: fd.get('fatherName') || '',
      parentContactPossible: fd.get('parentContactPossible') || 'Ja',
      motherPhone: fd.get('motherPhone') || '',
      fatherPhone: fd.get('fatherPhone') || '',
      friendCircle: fd.getAll('friendCircle'),
      hobbies: fd.getAll('hobbies'),
      interests: fd.getAll('interests'),
      socialNetworks: fd.getAll('socialNetworks'),
      appearance: fd.getAll('appearance'),
      specialAttention: fd.get('specialAttention') || 'Nein',
      strengths: fd.getAll('strengths'),
      environmentNotes: fd.get('environmentNotes') || '',
      heightCm: fd.get('heightCm') || '',
      weightKg: fd.get('weightKg') || '',
      bodyTypes: fd.getAll('bodyTypes'),
      eyeColor: fd.get('eyeColor') || '',
      hairColor: fd.get('hairColor') || '',
      hairstyles: fd.getAll('hairstyles'),
      hairstyleNote: fd.get('hairstyleNote') || '',
      beardTypes: fd.getAll('beardTypes'),
      specialFeatures: fd.getAll('specialFeatures'),
      specialFeaturesNote: fd.get('specialFeaturesNote') || '',
      gaitTypes: fd.getAll('gaitTypes'),
      presenceTypes: fd.getAll('presenceTypes'),
      groupTypes: fd.getAll('groupTypes'),
      recognitionLevel: fd.get('recognitionLevel') || '',
      behaviorAssessments: fd.getAll('behaviorAssessments'),
      identityNotes: fd.get('identityNotes') || ''
    });
    draft.mainPhoto = draft.mainPhoto || '';
    draft.extraPhotos = Array.isArray(draft.extraPhotos) ? draft.extraPhotos : [];
    this.current.editData = draft;
  }

  _attachPersonEditDraftListeners(form){
    if(!form || !this.current.editData) return;
    const draft = this.current.editData;
    const updateField = (input) => {
      const name = input.name;
      if(!name) return;
      if(input.type === 'checkbox'){
        draft[name] = input.checked;
        return;
      }
      if(input.multiple){
        draft[name] = Array.from(input.selectedOptions).map(option => option.value);
        return;
      }
      draft[name] = input.value;
    };

    form.querySelectorAll('input,textarea,select').forEach(input => {
      if(!input.name) return;
      if(input.type === 'file'){
        return;
      }
      input.addEventListener('change', () => updateField(input));
      if(input.tagName.toLowerCase() !== 'select'){
        input.addEventListener('input', () => updateField(input));
      }
    });
  }

  renderPersonEdit(personId){
    const isEdit = !!personId;
    if(!this.current.editData){
      if(isEdit){
        const source = this.storage.data.persons.find(x=>x.id===personId);
        this.current.editData = source ? JSON.parse(JSON.stringify(source)) : null;
      }
      if(!this.current.editData){
        this.current.editData = {
          givenName:'', familyName:'', gender:'Keine Angabe', birthDate:'', birthplace:'', tags:[], notes:'', city:'', street:'', postalCode:'', mobile:'', phone:'', email:'', insurance:'Keine Angabe', customInsurance:'', hasAllergies:false, allergyInfo:'', specialNotes:'', nickname:'', socialRoles:[], friends:[], cooperation:0, reliability:0, socialBehavior:0, conflictPotential:0, auffaelligkeiten:[], conflicts:[], commStyles:[], extraNotes:'', motherName:'', motherPhone:'', fatherName:'', fatherPhone:'', parentContactPossible:'Ja', friendCircle:[], hobbies:[], interests:[], socialNetworks:[], appearance:[], specialAttention:'Nein', strengths:[], environmentNotes:'', internalId:'', city:'', street:'', postalCode:'', mainPhoto:'', extraPhotos:[], heightCm:'', weightKg:'', bodyTypes:[], eyeColor:'', hairColor:'', hairstyles:[], hairstyleNote:'', beardTypes:[], specialFeatures:[], specialFeaturesNote:'', gaitTypes:[], presenceTypes:[], groupTypes:[], recognitionLevel:'', behaviorAssessments:[], identityNotes:'', remarks: [], created: Date.now()
        };
      }
    }
    const p = this.current.editData;

    const otherPersons = this.storage.data.persons.filter(x=>x.id !== personId);
    const personOptions = otherPersons.map(person => `<option value="${person.id}" ${((p.friends||[]).includes(person.id) || (p.friendCircle||[]).includes(person.id) || (p.conflicts||[]).includes(person.id)) ? 'selected' : ''}>${escapeHtml(person.givenName)} ${escapeHtml(person.familyName)}</option>`).join('');
    const checkbox = p.hasAllergies ? 'checked' : '';
    this.current.tab = this.current.tab || 'stammdaten';
    
    this.view.innerHTML='';
    
    const header = document.createElement('div'); header.className='record-header';
    header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>${isEdit? 'Person bearbeiten' : 'Neue Person'}</h3><button class="btn" id="cancelEdit">Abbrechen</button></div>`;
    this.view.appendChild(header);

    const tabs = document.createElement('div'); tabs.className='tabs';
    ['stammdaten','sozial','umfeld','identitaetsprofil','vermerke','vorgaenge'].forEach(key=>{
      const tab = document.createElement('div'); tab.className='tab ' + (this.current.tab===key ? 'active' : '');
      tab.textContent = {stammdaten:'Stammdaten', identitaetsprofil:'Identitätsprofil', vorgaenge:'Vorgänge', sozial:'Soziales & Verhalten', umfeld:'Umfeld & Bezugspersonen', vermerke:'Vermerke'}[key];
      tab.addEventListener('click', ()=>{ this._savePersonEditDraft(); this.current.tab = key; this.render(); });
      tabs.appendChild(tab);
    });
    this.view.appendChild(tabs);

    const form = document.createElement('form'); form.className='card';
    form.innerHTML = `
      <h3>${isEdit ? 'Person bearbeiten' : 'Neue Person erstellen'}</h3>
      <div class="section">
        <h4>Grundlegende Informationen</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Vorname *</label><input name="givenName" type="text" value="${escapeHtml(p.givenName)}" required></div>
          <div class="field"><label>Nachname *</label><input name="familyName" type="text" value="${escapeHtml(p.familyName)}" required></div>
          <div class="field"><label>Geschlecht</label><select name="gender"><option value="" ${p.gender === '' ? 'selected' : ''}>—</option>${OPTIONS.gender.map(option => `<option value="${option}" ${p.gender===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Geburtsdatum</label><input type="date" name="birthDate" value="${escapeHtml(p.birthDate || '')}"></div>
          <div class="field"><label>Geburtsort</label><input name="birthplace" type="text" value="${escapeHtml(p.birthplace)}"></div>
          <div class="field"><label>Aktuelles Alter</label><input type="text" value="${escapeHtml(calculateAge(p.birthDate))}" disabled></div>
          <div class="field"><label>Interne ID</label><input name="internalId" type="text" value="${escapeHtml(p.internalId || '')}" placeholder="Automatisch generiert"></div>
        </div>
      </div>
      <div class="section">
        <h4>Kontakt- und Wohninformationen</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Straße</label><input name="street" type="text" value="${escapeHtml(p.street)}"></div>
          <div class="field"><label>Postleitzahl</label><input name="postalCode" type="text" value="${escapeHtml(p.postalCode)}"></div>
          <div class="field"><label>Wohnort</label><input name="city" type="text" value="${escapeHtml(p.city)}"></div>
          <div class="field"><label>Mobiltelefon</label><input name="mobile" type="text" value="${escapeHtml(p.mobile)}"></div>
          <div class="field"><label>Festnetztelefon</label><input name="phone" type="text" value="${escapeHtml(p.phone)}"></div>
          <div class="field"><label>E-Mail</label><input name="email" type="email" value="${escapeHtml(p.email)}"></div>
        </div>
      </div>
      <div class="section">
        <h4>Gesundheitliche Informationen</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Krankenkasse</label><select name="insurance"><option value="" ${p.insurance === '' ? 'selected' : ''}>—</option>${OPTIONS.insurance.map(option => `<option value="${option}" ${p.insurance===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Weitere Kasse</label><input name="customInsurance" type="text" value="${escapeHtml(p.customInsurance)}"></div>
          <div class="field field-checkbox"><label><input type="checkbox" name="hasAllergies" ${checkbox}> Allergien vorhanden</label></div>
        </div>
        <div class="field-block"><label>Allergieinformationen</label><textarea name="allergyInfo" placeholder="Details zu Allergien...">${escapeHtml(p.allergyInfo)}</textarea></div>
        <div class="field-block"><label>Besondere Hinweise</label><textarea name="specialNotes" placeholder="Besondere gesundheitliche Hinweise...">${escapeHtml(p.specialNotes)}</textarea></div>
      </div>
      <div class="section">
        <h4>Soziales</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Spitzname / Bekannt als</label><input name="nickname" type="text" value="${escapeHtml(p.nickname)}"></div>
          <div class="field"><label>Soziale Rolle</label><select name="socialRoles" multiple size="4">${OPTIONS.socialRoles.map(option => `<option value="${option}" ${(p.socialRoles||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Freunde / Bezugspersonen</label><select name="friends" multiple size="4">${otherPersons.map(person=>`<option value="${person.id}" ${(p.friends||[]).includes(person.id) ? 'selected' : ''}>${escapeHtml(person.givenName)} ${escapeHtml(person.familyName)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="section">
        <h4>Verhalten</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Mitarbeit</label><input name="cooperation" type="number" min="0" max="10" value="${escapeHtml(String(p.cooperation || 0))}"></div>
          <div class="field"><label>Zuverlässigkeit</label><input name="reliability" type="number" min="0" max="10" value="${escapeHtml(String(p.reliability || 0))}"></div>
          <div class="field"><label>Sozialverhalten</label><input name="socialBehavior" type="number" min="0" max="10" value="${escapeHtml(String(p.socialBehavior || 0))}"></div>
          <div class="field"><label>Konfliktpotenzial</label><input name="conflictPotential" type="number" min="0" max="10" value="${escapeHtml(String(p.conflictPotential || 0))}"></div>
          <div class="field"><label>Auffälligkeiten</label><select name="auffaelligkeiten" multiple size="4">${OPTIONS.auffaelligkeiten.map(option => `<option value="${option}" ${(p.auffaelligkeiten||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Konflikte mit Personen</label><select name="conflicts" multiple size="4">${otherPersons.map(person=>`<option value="${person.id}" ${(p.conflicts||[]).includes(person.id) ? 'selected' : ''}>${escapeHtml(person.givenName)} ${escapeHtml(person.familyName)}</option>`).join('')}</select></div>
          <div class="field"><label>Kommunikationsstil</label><select name="commStyles" multiple size="4">${OPTIONS.commStyles.map(option => `<option value="${option}" ${(p.commStyles||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
        </div>
        <div class="field-block"><label>Zusätzliche Hinweise</label><textarea name="extraNotes" placeholder="Zusätzliche Hinweise...">${escapeHtml(p.extraNotes)}</textarea></div>
      </div>
      <div class="section">
        <h4>Identitätsprofil</h4>
        <div class="field-block">
          <label>Hauptfoto</label>
          <input id="mainPhotoInput" name="mainPhoto" type="file" accept="image/*">
          <div id="mainPhotoPreview" class="photo-preview">${p.mainPhoto ? `<img src="${p.mainPhoto}" alt="Hauptfoto">` : '<div class="muted">Kein Bild ausgewählt</div>'}</div>
        </div>
        <div class="field-block">
          <label>Zusatzfotos</label>
          <input id="extraPhotosInput" name="extraPhotos" type="file" accept="image/*" multiple>
          <div id="extraPhotosGallery" class="photo-gallery">${(p.extraPhotos || []).map((src, idx) => `<div class="photo-thumb"><img src="${src}" alt="Zusatzfoto ${idx + 1}"></div>`).join('') || '<div class="muted">Keine Fotos</div>'}</div>
        </div>
        <div class="field-grid three-cols">
          <div class="field"><label>Körpergröße (cm)</label><input name="heightCm" type="number" min="0" step="1" value="${escapeHtml(p.heightCm)}"></div>
          <div class="field"><label>Gewicht (kg)</label><input name="weightKg" type="number" min="0" step="1" value="${escapeHtml(p.weightKg)}"></div>
          <div class="field"><label>Körperbau</label><select name="bodyTypes" multiple size="4">${OPTIONS.bodyTypes.map(option => `<option value="${option}" ${(p.bodyTypes||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Augenfarbe</label><select name="eyeColor"><option value="" ${p.eyeColor === '' ? 'selected' : ''}>—</option>${OPTIONS.eyeColors.map(option => `<option value="${option}" ${p.eyeColor===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Haarfarbe</label><select name="hairColor"><option value="" ${p.hairColor === '' ? 'selected' : ''}>—</option>${OPTIONS.hairColors.map(option => `<option value="${option}" ${p.hairColor===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Frisur</label><select name="hairstyles" multiple size="4">${OPTIONS.hairstyles.map(option => `<option value="${option}" ${(p.hairstyles||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Frisurbeschreibung</label><textarea name="hairstyleNote" placeholder="Frisurbeschreibung...">${escapeHtml(p.hairstyleNote)}</textarea></div>
          <div class="field"><label>Bart</label><select name="beardTypes" multiple size="4">${OPTIONS.beardTypes.map(option => `<option value="${option}" ${(p.beardTypes||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Besondere Merkmale</label><select name="specialFeatures" multiple size="4">${OPTIONS.specialFeatures.map(option => `<option value="${option}" ${(p.specialFeatures||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Beschreibung besonderer Merkmale</label><textarea name="specialFeaturesNote" placeholder="Beschreibung...">${escapeHtml(p.specialFeaturesNote)}</textarea></div>
          <div class="field"><label>Gangart</label><select name="gaitTypes" multiple size="4">${OPTIONS.gaitTypes.map(option => `<option value="${option}" ${(p.gaitTypes||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Auftreten</label><select name="presenceTypes" multiple size="4">${OPTIONS.presenceTypes.map(option => `<option value="${option}" ${(p.presenceTypes||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Gruppenzugehörigkeit</label><select name="groupTypes" multiple size="4">${OPTIONS.groupTypes.map(option => `<option value="${option}" ${(p.groupTypes||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Wiedererkennungswert</label><select name="recognitionLevel"><option value="" ${p.recognitionLevel === '' ? 'selected' : ''}>—</option>${OPTIONS.recognitionLevels.map(option => `<option value="${option}" ${p.recognitionLevel===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Verhaltenseinschätzung</label><select name="behaviorAssessments" multiple size="4">${OPTIONS.behaviorAssessments.map(option => `<option value="${option}" ${(p.behaviorAssessments||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Freie Notizen</label><textarea name="identityNotes" placeholder="Freie Notizen...">${escapeHtml(p.identityNotes)}</textarea></div>
        </div>
      </div>
      <div class="section">
        <h4>Umfeld & Bezugspersonen</h4>
        <div class="field-grid three-cols">
          <div class="field"><label>Name Mutter</label><input name="motherName" type="text" value="${escapeHtml(p.motherName)}"></div>
          <div class="field"><label>Name Vater</label><input name="fatherName" type="text" value="${escapeHtml(p.fatherName)}"></div>
          <div class="field"><label>Elternkontakt möglich</label><select name="parentContactPossible"><option value="" ${p.parentContactPossible === '' ? 'selected' : ''}>—</option>${OPTIONS.parentContactPossible.map(option => `<option value="${option}" ${p.parentContactPossible===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Telefon Mutter</label><input name="motherPhone" type="text" value="${escapeHtml(p.motherPhone)}"></div>
          <div class="field"><label>Telefon Vater</label><input name="fatherPhone" type="text" value="${escapeHtml(p.fatherPhone)}"></div>
          <div class="field"><label>Freundeskreis</label><select name="friendCircle" multiple size="4">${otherPersons.map(person=>`<option value="${person.id}" ${(p.friendCircle||[]).includes(person.id) ? 'selected' : ''}>${escapeHtml(person.givenName)} ${escapeHtml(person.familyName)}</option>`).join('')}</select></div>
          <div class="field"><label>Hobbys</label><select name="hobbies" multiple size="4">${OPTIONS.strengths.map(option => `<option value="${option}" ${(p.hobbies||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Persönliche Interessen</label><select name="interests" multiple size="4">${OPTIONS.strengths.map(option => `<option value="${option}" ${(p.interests||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Soziale Netzwerke</label><select name="socialNetworks" multiple size="4">${OPTIONS.socialNetworks.map(option => `<option value="${option}" ${(p.socialNetworks||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Auftreten</label><select name="appearance" multiple size="4">${OPTIONS.appearance.map(option => `<option value="${option}" ${(p.appearance||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Besondere Aufmerksamkeit</label><select name="specialAttention">${['Nein','Gelegentlich','Ja'].map(option => `<option value="${option}" ${p.specialAttention===option ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Stärken</label><select name="strengths" multiple size="4">${OPTIONS.strengths.map(option => `<option value="${option}" ${(p.strengths||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
        </div>
        <div class="field-block"><label>Zusätzliche Hinweise</label><textarea name="environmentNotes" placeholder="Zusätzliche Hinweise...">${escapeHtml(p.environmentNotes)}</textarea></div>
      </div>
      <div class="section">
        <h4>Vermerke</h4>
        <div class="section">
          <div class="field-block"><label>Vermerke</label><div class="notes-box">${(p.remarks || []).length ? (p.remarks || []).map(note => `
            <div class="note-entry" style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">
                <div><strong>Vermerk</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(note.created))}</div></div>
                ${this.current.mode==='edit' ? `<button class="btn" type="button" data-delete-person-remark="${note.id}">Löschen</button>` : ''}
              </div>
              <div class="notes-box">${escapeHtml(note.text)}</div>
            </div>
          `).join('') : '<div class="notes-box">Keine Vermerke vorhanden</div>'}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;">
          <button class="btn primary" type="button" id="addPersonRemarkButton">+ Neuer Vermerk</button>
        </div>
        <div id="personRemarkCreateArea"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-light)">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" id="cancel2">Abbrechen</button>
      </div>
    `;

    form.querySelectorAll('.section').forEach((section,index)=>{
      const mapping = ['stammdaten','stammdaten','stammdaten','sozial','sozial','identitaetsprofil','umfeld','vermerke'];
      section.dataset.section = mapping[index] || 'stammdaten';
      section.style.display = section.dataset.section === this.current.tab ? '' : 'none';
    });

    if(this.current.tab === 'vorgaenge'){
      const cases = this.storage.data.cases.filter(c => getCasePersonRoles(c, p.id).length > 0);
      const caseRows = cases.length ? cases.map(c => {
        const roles = getCasePersonRoles(c, p.id).map(createRoleTag).join(' ');
        return `<div class="item"><div><strong>${escapeHtml(c.title)}</strong><div class="muted">${escapeHtml(c.caseNumber || c.id)} • ${escapeHtml(c.category)} • ${escapeHtml(formatDateTimeEU(c.date, c.time))}</div><div style="margin-top:8px">${roles}</div></div><button class="btn" data-open-case="${c.id}">Öffnen</button></div>`;
      }).join('') : '<div class="muted">Keine Vorgänge gefunden</div>';
      const overview = document.createElement('div'); overview.className='card';
      overview.innerHTML = `
        <h3>Vorgänge</h3>
        <div class="section">${caseRows}</div>
        <div style="display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-light)"><button class="btn" type="button" id="cancel2">Abbrechen</button></div>
      `;
      this.view.appendChild(overview);
      overview.querySelector('#cancel2').addEventListener('click', ()=>{ this.current.mode='view'; this.render(); });
      overview.querySelectorAll('[data-open-case]').forEach(btn => btn.addEventListener('click', e => {
        const caseId = btn.dataset.openCase;
        this.current = {type:'case', id:caseId, mode:'view', tab:'overview'};
        this.render();
      }));
      return;
    } else if(this.current.tab === 'vermerke'){
      const remarks = Array.isArray(p.remarks) ? p.remarks : [];
      const remarksHtml = remarks.length ? remarks.map(note => `
        <div class="section note-entry">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
            <div><strong>Vermerk</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(note.created))}</div></div>
          </div>
          <div class="notes-box">${escapeHtml(note.text)}</div>
        </div>
      `).join('') : '<div class="section"><div class="notes-box">Keine Vermerke vorhanden</div></div>';
      content.innerHTML = `
        <div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div><h4>Vermerke</h4></div>
          <button class="btn primary" type="button" id="addPersonRemarkButton">+ Neuer Vermerk</button>
        </div>
        <div id="personRemarkCreateArea"></div>
        ${remarksHtml}
      `;
      this.view.appendChild(content);

      const noteArea = content.querySelector('#personRemarkCreateArea');
      const addRemarkButton = content.querySelector('#addPersonRemarkButton');
      const renderRemarkForm = () => {
        if(!noteArea) return;
        noteArea.innerHTML = `
          <div class="section">
            <div class="field-block"><label>Neuer Vermerk</label><textarea id="newPersonRemarkText" placeholder="Vermerk eingeben..."></textarea></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px;">
              <button class="btn" type="button" id="cancelPersonRemark">Abbrechen</button>
              <button class="btn primary" type="button" id="savePersonRemark">Speichern</button>
            </div>
          </div>
        `;
        const saveBtn = noteArea.querySelector('#savePersonRemark');
        const cancelBtn = noteArea.querySelector('#cancelPersonRemark');
        saveBtn.addEventListener('click', ()=>{
          const text = (noteArea.querySelector('#newPersonRemarkText')?.value || '').trim();
          if(!text) return;
          const notes = Array.isArray(p.remarks) ? [...p.remarks] : [];
          notes.push({ id: genId('n-'), text, created: Date.now() });
          this.storage.updatePerson(p.id, { remarks: notes });
          this.current = { type:'person', id:p.id, mode:'view', tab:'vermerke' };
          this.render();
        });
        cancelBtn.addEventListener('click', ()=>{ if(noteArea) noteArea.innerHTML = ''; });
      };

      if(addRemarkButton) addRemarkButton.addEventListener('click', renderRemarkForm);
      return;
    } else if(this.current.tab === 'vorgaenge'){
      const cases = this.storage.data.cases.filter(c => getCasePersonRoles(c, p.id).length > 0);
      const caseRows = cases.length ? cases.map(c => {
        const roles = getCasePersonRoles(c, p.id).map(createRoleTag).join(' ');
        return `<div class="item"><div><strong>${escapeHtml(c.title)}</strong><div class="muted">${escapeHtml(c.caseNumber || c.id)} • ${escapeHtml(c.category)} • ${escapeHtml(formatDateTimeEU(c.date, c.time))}</div><div style="margin-top:8px">${roles}</div></div><button class="btn" data-open-case="${c.id}">Öffnen</button></div>`;
      }).join('') : '<div class="muted">Keine Vorgänge gefunden</div>';
      const overview = document.createElement('div'); overview.className='card';
      overview.innerHTML = `
        <h3>Vorgänge</h3>
        <div class="section">${caseRows}</div>
        <div style="display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-light)"><button class="btn" type="button" id="cancel2">Abbrechen</button></div>
      `;
      this.view.appendChild(overview);
      overview.querySelector('#cancel2').addEventListener('click', ()=>{ this.current.mode='view'; this.render(); });
      overview.querySelectorAll('[data-open-case]').forEach(btn => btn.addEventListener('click', e => {
        const caseId = btn.dataset.openCase;
        this.current = {type:'case', id:caseId, mode:'view', tab:'overview'};
        this.render();
      }));
      return;
    }

    let currentMainPhoto = p.mainPhoto || '';
    const currentExtraPhotos = Array.isArray(p.extraPhotos) ? [...p.extraPhotos] : [];
    const mainPhotoInput = form.querySelector('#mainPhotoInput');
    const mainPhotoPreview = form.querySelector('#mainPhotoPreview');
    const extraPhotosInput = form.querySelector('#extraPhotosInput');
    const extraPhotosGallery = form.querySelector('#extraPhotosGallery');

    const readFileAsDataURL = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const renderMainPhotoPreview = () => {
      mainPhotoPreview.innerHTML = '';
      if(currentMainPhoto){
        const img = document.createElement('img');
        img.src = currentMainPhoto;
        img.alt = 'Hauptfoto';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => window.open(currentMainPhoto, '_blank'));
        mainPhotoPreview.appendChild(img);
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn';
        removeButton.textContent = 'Löschen';
        removeButton.addEventListener('click', () => { currentMainPhoto = ''; renderMainPhotoPreview(); });
        mainPhotoPreview.appendChild(removeButton);
      } else {
        mainPhotoPreview.innerHTML = '<div class="muted">Kein Bild ausgewählt</div>';
      }
    };

    const renderExtraPhotosGallery = () => {
      extraPhotosGallery.innerHTML = '';
      if(!currentExtraPhotos.length){
        extraPhotosGallery.innerHTML = '<div class="muted">Keine Fotos</div>';
        return;
      }
      currentExtraPhotos.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'photo-thumb';
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Zusatzfoto ${idx + 1}`;
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => window.open(src, '_blank'));
        thumb.appendChild(img);
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn';
        removeButton.textContent = 'Löschen';
        removeButton.addEventListener('click', () => { currentExtraPhotos.splice(idx, 1); renderExtraPhotosGallery(); });
        thumb.appendChild(removeButton);
        extraPhotosGallery.appendChild(thumb);
      });
    };

    mainPhotoInput.addEventListener('change', async () => {
      if(!mainPhotoInput.files.length) return;
      try {
        currentMainPhoto = await readFileAsDataURL(mainPhotoInput.files[0]);
        if(this.current.editData){
          this.current.editData.mainPhoto = currentMainPhoto;
        }
        renderMainPhotoPreview();
      } catch(e) { console.error(e); }
    });

    extraPhotosInput.addEventListener('change', async () => {
      if(!extraPhotosInput.files.length) return;
      const files = Array.from(extraPhotosInput.files);
      for(const file of files){
        try {
          currentExtraPhotos.push(await readFileAsDataURL(file));
        } catch(e) { console.error(e); }
      }
      if(this.current.editData){
        this.current.editData.extraPhotos = [...currentExtraPhotos];
      }
      extraPhotosInput.value = '';
      renderExtraPhotosGallery();
    });

    renderMainPhotoPreview();
    renderExtraPhotosGallery();

    form.querySelectorAll('select[multiple]').forEach(select => {
      select.addEventListener('mousedown', event => {
        const option = event.target.closest('option');
        if(!option) return;
        event.preventDefault();
        option.selected = !option.selected;
      });
    });

    this._attachPersonEditDraftListeners(form);

    if(this.current.tab === 'vermerke'){
      const remarkArea = form.querySelector('#personRemarkCreateArea');
      const addRemarkButton = form.querySelector('#addPersonRemarkButton');
      if(addRemarkButton){
        addRemarkButton.addEventListener('click', ()=>{
          if(!remarkArea) return;
          remarkArea.innerHTML = `
            <div class="section">
              <div class="field-block"><label>Neuer Vermerk</label><textarea id="newPersonRemarkText" placeholder="Vermerk eingeben..."></textarea></div>
              <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px;">
                <button class="btn" type="button" id="cancelPersonRemark">Abbrechen</button>
                <button class="btn primary" type="button" id="savePersonRemark">Speichern</button>
              </div>
            </div>
          `;
          const saveBtn = remarkArea.querySelector('#savePersonRemark');
          const cancelBtn = remarkArea.querySelector('#cancelPersonRemark');
          saveBtn.addEventListener('click', ()=>{
            const text = (remarkArea.querySelector('#newPersonRemarkText')?.value || '').trim();
            if(!text) return;
            if(!this.current.editData) this.current.editData = {};
            this.current.editData.remarks = Array.isArray(this.current.editData.remarks) ? [...this.current.editData.remarks] : [];
            this.current.editData.remarks.push({ id: genId('n-'), text, created: Date.now() });
            this.renderPersonEdit(personId);
          });
          cancelBtn.addEventListener('click', ()=>{ if(remarkArea) remarkArea.innerHTML = ''; });
        });
      }
      form.querySelectorAll('[data-delete-person-remark]').forEach(button => {
        button.addEventListener('click', ()=>{
          const remarkId = button.dataset.deletePersonRemark;
          if(!this.current.editData) return;
          this.current.editData.remarks = (this.current.editData.remarks || []).filter(note => note.id !== remarkId);
          this.renderPersonEdit(personId);
        });
      });
    }

    form.addEventListener('submit', e=>{ 
      e.preventDefault(); 
      const fd=new FormData(form); 
      const data={
        givenName: fd.get('givenName'),
        familyName: fd.get('familyName'),
        gender: fd.get('gender'),
        birthDate: fd.get('birthDate'),
        birthplace: fd.get('birthplace'),
        city: fd.get('city'),
        street: fd.get('street'),
        postalCode: fd.get('postalCode'),
        mobile: fd.get('mobile'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        insurance: fd.get('insurance'),
        customInsurance: fd.get('customInsurance'),
        hasAllergies: fd.get('hasAllergies') === 'on',
        allergyInfo: fd.get('allergyInfo'),
        specialNotes: fd.get('specialNotes'),
        nickname: fd.get('nickname'),
        socialRoles: fd.getAll('socialRoles'),
        friends: fd.getAll('friends'),
        cooperation: Number(fd.get('cooperation') || 0),
        reliability: Number(fd.get('reliability') || 0),
        socialBehavior: Number(fd.get('socialBehavior') || 0),
        conflictPotential: Number(fd.get('conflictPotential') || 0),
        auffaelligkeiten: fd.getAll('auffaelligkeiten'),
        conflicts: fd.getAll('conflicts'),
        commStyles: fd.getAll('commStyles'),
        extraNotes: fd.get('extraNotes'),
        motherName: fd.get('motherName'),
        internalId: fd.get('internalId'),
        motherPhone: fd.get('motherPhone'),
        fatherName: fd.get('fatherName'),
        fatherPhone: fd.get('fatherPhone'),
        parentContactPossible: fd.get('parentContactPossible'),
        friendCircle: fd.getAll('friendCircle'),
        hobbies: fd.getAll('hobbies'),
        interests: fd.getAll('interests'),
        socialNetworks: fd.getAll('socialNetworks'),
        appearance: fd.getAll('appearance'),
        specialAttention: fd.get('specialAttention'),
        strengths: fd.getAll('strengths'),
        environmentNotes: fd.get('environmentNotes'),
        remarks: (this.current.editData && Array.isArray(this.current.editData.remarks)) ? [...this.current.editData.remarks] : [],
        mainPhoto: currentMainPhoto,
        extraPhotos: currentExtraPhotos,
        heightCm: fd.get('heightCm'),
        weightKg: fd.get('weightKg'),
        bodyTypes: fd.getAll('bodyTypes'),
        eyeColor: fd.get('eyeColor'),
        hairColor: fd.get('hairColor'),
        hairstyles: fd.getAll('hairstyles'),
        hairstyleNote: fd.get('hairstyleNote'),
        beardTypes: fd.getAll('beardTypes'),
        specialFeatures: fd.getAll('specialFeatures'),
        specialFeaturesNote: fd.get('specialFeaturesNote'),
        gaitTypes: fd.getAll('gaitTypes'),
        presenceTypes: fd.getAll('presenceTypes'),
        groupTypes: fd.getAll('groupTypes'),
        recognitionLevel: fd.get('recognitionLevel'),
        behaviorAssessments: fd.getAll('behaviorAssessments'),
        identityNotes: fd.get('identityNotes')
      };
      if(isEdit){ 
        this.storage.updatePerson(personId,data);
        this.current={type:'person',id:personId,mode:'view',tab:'stammdaten'};
      } else {
        data.id = genId('p-');
        data.created = Date.now();
        this.storage.addPerson(data);
        this.current = {type:'person',id:data.id,mode:'view',tab:'stammdaten'};
      }
      this.current.editData = null;
      this.render(); 
    });

    form.querySelector('#cancel2').addEventListener('click', ()=>{ this.current = {type:null,id:null,mode:'view',tab:'stammdaten'}; this.current.editData = null; this.render(); });
    document.getElementById('cancelEdit').addEventListener('click', ()=>{ this.current = {type:null,id:null,mode:'view',tab:'stammdaten'}; this.current.editData = null; this.render(); });
    
    this.view.appendChild(form);
  }

  /* Cases */
  renderCaseList(){
    const list = this.storage.data.cases;
    this.view.innerHTML='';
    
    const header = document.createElement('div'); header.className='card'; 
    header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>Vorgänge</h3><button class="btn primary" id="btnNewCaseMain">+ Vorgang anlegen</button></div>`;
    this.view.appendChild(header);
    
    const listEl = document.createElement('div'); listEl.className='list'; 
    list.forEach(c=>{ 
      const it=document.createElement('div'); it.className='item'; 
      const left=document.createElement('div'); 
      left.innerHTML=`<strong>${escapeHtml(c.title)}</strong><div class="muted">${escapeHtml(c.caseNumber || c.id)} • ${escapeHtml(c.category)} • ${escapeHtml(c.status)} • ${escapeHtml(formatDateTimeEU(c.date, c.time))}</div>`; 
      const right=document.createElement('div'); right.style.display = 'flex'; right.style.gap = '8px';
      const btnOpen=document.createElement('button'); btnOpen.className='btn'; btnOpen.textContent='Akte'; 
      btnOpen.addEventListener('click', ()=>{ this.current={type:'case',id:c.id,mode:'view',tab:'overview'}; this.render(); }); 
      const btnDel=document.createElement('button'); btnDel.className='btn'; btnDel.textContent='🗑'; 
      btnDel.addEventListener('click', ()=>{ if(confirm('Vorgang löschen?')){ this.storage.deleteCase(c.id); this.renderCaseList(); } }); 
      right.appendChild(btnOpen); right.appendChild(btnDel); 
      it.appendChild(left); it.appendChild(right); 
      listEl.appendChild(it); 
    }); 
    this.view.appendChild(listEl); 
    document.getElementById('btnNewCaseMain').addEventListener('click', ()=>this.openCaseNewInMain()); 
  }

  openCaseNewInMain(){ 
    this.current={type:'case',id:null,mode:'new',tab:'overview'}; 
    this.renderCaseEdit(null); 
  }

  renderCaseDetail(caseId){
    const c = this.storage.data.cases.find(x=>x.id===caseId);
    if(!c) return this.renderCaseList();
    
    this.current.tab = this.current.tab || 'overview';
    this.view.innerHTML='';

    const header = document.createElement('div'); header.className='record-header';
    const headerTop = document.createElement('div'); headerTop.className='record-header-top';
    const info = document.createElement('div'); info.className='record-header-info';
    info.innerHTML = `<h3>${escapeHtml(c.title)}</h3><div class="record-meta">Vorgangsakte • ${escapeHtml(c.caseNumber || c.id)} • ${escapeHtml(c.category)}</div>`;
    const actions = document.createElement('div'); actions.className='record-header-actions';
    const btnEdit = document.createElement('button'); btnEdit.className='btn'; btnEdit.textContent='Bearbeiten';
    btnEdit.addEventListener('click', ()=>{ this.current.mode='edit'; this.render(); });
    const btnClose = document.createElement('button'); btnClose.className='btn'; btnClose.textContent='Schließen';
    btnClose.addEventListener('click', ()=>{ this.current={type:null,id:null,mode:'view',tab:'stammdaten'}; this.render(); });
    actions.appendChild(btnEdit); actions.appendChild(btnClose);
    headerTop.appendChild(info); headerTop.appendChild(actions);
    header.appendChild(headerTop);
    this.view.appendChild(header);

    const tabs = document.createElement('div'); tabs.className='tabs';
    ['overview','participants','notes','history'].forEach(t=>{
      const tab = document.createElement('div');
      tab.className='tab ' + (t === this.current.tab ? 'active' : '');
      tab.textContent = {overview:'Übersicht', participants:'Beteiligte', notes:'Notizen', history:'Historie'}[t];
      tab.addEventListener('click', ()=>{ this.current.tab=t; this.render(); });
      tabs.appendChild(tab);
    });
    this.view.appendChild(tabs);

    if(this.current.mode==='edit'){ this.renderCaseEdit(caseId); return; }

    const content = document.createElement('div'); content.className='card record-card-content';
    if(this.current.tab==='overview'){
      content.innerHTML = `
        <div class="section">
          <h4>Vorgangsdetails</h4>
          <div class="field-grid three-cols">
            <div class="field"><label>Status</label><div>${escapeHtml(c.status || '—')}</div></div>
            <div class="field"><label>Kategorie</label><div>${escapeHtml(c.category || '—')}</div></div>
            <div class="field"><label>Datum</label><div>${escapeHtml(formatDateTimeEU(c.date, c.time))}</div></div>
            <div class="field"><label>Priorität</label><div>${(c.priority||[]).length ? escapeHtml((c.priority||[]).join(', ')) : '—'}</div></div>
            <div class="field"><label>Beteiligte Personen</label><div>${(c.participants||[]).length}</div></div>
          </div>
        </div>
        <div class="section">
          <h4>Beschreibung</h4>
          <div class="notes-box">${escapeHtml(c.description || 'Keine Beschreibung vorhanden')}</div>
        </div>
        <div class="section">
          <h4>Maßnahmen</h4>
          <div class="field-grid two-cols">
            <div class="field"><label>Aktionen</label><div>${(c.measureActions||[]).length ? escapeHtml((c.measureActions||[]).join(', ')) : 'Keine Aktionen dokumentiert'}</div></div>
            <div class="field"><label>Details</label><div>${escapeHtml(c.measureDescription || 'Keine Maßnahmenbeschreibung')}</div></div>
          </div>
        </div>
      `;
    } else if(this.current.tab==='participants'){
      const participants = this.storage.data.persons.filter(p=>getCasePersonRoles(c,p.id).length > 0);
      content.innerHTML = `<h4>Beteiligte Personen (${participants.length})</h4>`;
      const list = document.createElement('div'); list.className='list';
      if(participants.length){
        participants.forEach(p=>{
          const roles = getCasePersonRoles(c,p.id).map(createRoleTag).join(' ');
          const item = document.createElement('div'); item.className='item';
          const left = document.createElement('div');
          left.innerHTML = `<strong>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</strong><div class="muted">${escapeHtml(formatDateEU(p.birthDate))}</div><div style="margin-top:8px">${roles}</div>`;
          const right = document.createElement('div');
          const openBtn = document.createElement('button'); openBtn.className='btn'; openBtn.textContent='Akte öffnen';
          openBtn.addEventListener('click', ()=>{ this.current={type:'person',id:p.id,mode:'view',tab:'stammdaten'}; this.render(); });
          right.appendChild(openBtn);
          item.appendChild(left); item.appendChild(right);
          list.appendChild(item);
        });
      } else {
        const empty = document.createElement('div'); empty.style.color = 'var(--muted)'; empty.textContent = 'Keine Personen eingetragen';
        list.appendChild(empty);
      }
      content.appendChild(list);
    } else if(this.current.tab==='notes'){
      const notesHtml = (c.notes || []).map(note => `
        <div class="section note-entry">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
            <div><strong>Notiz</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(note.created))}</div></div>
            <button class="btn" type="button" data-delete-note="${note.id}">Löschen</button>
          </div>
          <div class="notes-box">${escapeHtml(note.text)}</div>
        </div>
      `).join('') || '<div class="section"><div class="notes-box">Keine Notizen vorhanden</div></div>';

      content.innerHTML = `
        <div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div><h4>Notizen & Dokumentation</h4></div>
          <button class="btn primary" type="button" id="addNoteButton">+ Neue Notiz</button>
        </div>
        <div id="noteCreateArea"></div>
        ${notesHtml}
      `;
    } else if(this.current.tab==='history'){
      const history = (c.history || []).slice().sort((a,b)=>b.timestamp - a.timestamp);
      const historyHtml = history.length ? history.map(entry => `
        <div class="item">
          <div><strong>${escapeHtml(entry.event)}</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(entry.timestamp))}</div></div>
        </div>
      `).join('') : `<div class="item"><div class="muted">Keine Einträge vorhanden</div></div>`;
      content.innerHTML = `
        <div class="section">
          <h4>Aktivitätsverlauf</h4>
          <div class="list">
            ${historyHtml}
          </div>
        </div>
      `;
    }
    this.view.appendChild(content);

    if(this.current.tab === 'notes'){
      const noteArea = content.querySelector('#noteCreateArea');
      const addNoteButton = content.querySelector('#addNoteButton');
      const renderNoteForm = () => {
        if(!noteArea) return;
        noteArea.innerHTML = `
          <div class="section">
            <div class="field-block"><label>Neue Notiz</label><textarea id="newNoteText" placeholder="Notiz eingeben..."></textarea></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:12px;">
              <button class="btn" type="button" id="cancelNote">Abbrechen</button>
              <button class="btn primary" type="button" id="saveNote">Speichern</button>
            </div>
          </div>
        `;
        const saveBtn = noteArea.querySelector('#saveNote');
        const cancelBtn = noteArea.querySelector('#cancelNote');
        saveBtn.addEventListener('click', ()=>{
          const textArea = noteArea.querySelector('#newNoteText');
          const text = (textArea?.value || '').trim();
          if(!text) return;
          const notes = Array.isArray(c.notes) ? [...c.notes] : [];
          notes.push({ id: genId('n-'), text, created: Date.now() });
          const history = Array.isArray(c.history) ? [...c.history] : [];
          history.push({ id: genId('h-'), event: 'Notiz hinzugefügt', timestamp: Date.now() });
          this.storage.updateCase(c.id, { notes, history });
          this.current = { type: 'case', id: c.id, mode: 'view', tab: 'notes' };
          this.render();
        });
        cancelBtn.addEventListener('click', ()=>{ if(noteArea) noteArea.innerHTML = ''; });
      };

      if(addNoteButton) addNoteButton.addEventListener('click', renderNoteForm);
      content.querySelectorAll('[data-delete-note]').forEach(button => {
        button.addEventListener('click', ()=>{
          const noteId = button.dataset.deleteNote;
          const notes = (c.notes || []).filter(note => note.id !== noteId);
          const history = Array.isArray(c.history) ? [...c.history] : [];
          history.push({ id: genId('h-'), event: 'Notiz gelöscht', timestamp: Date.now() });
          this.storage.updateCase(c.id, { notes, history });
          this.current = { type: 'case', id: c.id, mode: 'view', tab: 'notes' };
          this.render();
        });
      });
    }
  }

  renderCaseEdit(caseId){
    const isEdit = !!caseId;
    const c = isEdit ? this.storage.data.cases.find(x=>x.id===caseId) : {title:'',category:'Sonstiges',status:'Offen',date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),participants:[],victims:[],suspects:[],witnesses:[],reporters:[],priority:[],measureActions:[],measureDescription:'',description:'',notes:[],history:[],created:Date.now()};
    
    this.view.innerHTML = '';
    const header = document.createElement('div'); header.className='record-header';
    header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>${isEdit ? 'Vorgang bearbeiten' : 'Neuer Vorgang'}</h3><button class="btn" id="cancelCase">Abbrechen</button></div>`;
    this.view.appendChild(header);
    
    this.current.tab = this.current.tab || 'overview';
    const tabs = document.createElement('div'); tabs.className='tabs';
    ['overview','participants','notes','history'].forEach(key=>{
      const tab = document.createElement('div'); tab.className='tab ' + (this.current.tab===key ? 'active' : '');
      tab.textContent = {overview:'Übersicht', participants:'Beteiligte', notes:'Notizen', history:'Historie'}[key];
      tab.addEventListener('click', ()=>{ this.current.tab = key; this.renderCaseEdit(caseId); });
      tabs.appendChild(tab);
    });
    this.view.appendChild(tabs);
    
    const form = document.createElement('form'); form.className='card';
    const personsHtml = this.storage.data.persons.map(p=>`<option value="${p.id}" ${(c.participants||[]).includes(p.id) ? 'selected' : ''}>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</option>`).join('');
    const victimsHtml = this.storage.data.persons.map(p=>`<option value="${p.id}" ${(c.victims||[]).includes(p.id) ? 'selected' : ''}>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</option>`).join('');
    const suspectsHtml = this.storage.data.persons.map(p=>`<option value="${p.id}" ${(c.suspects||[]).includes(p.id) ? 'selected' : ''}>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</option>`).join('');
    const witnessesHtml = this.storage.data.persons.map(p=>`<option value="${p.id}" ${(c.witnesses||[]).includes(p.id) ? 'selected' : ''}>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</option>`).join('');
    const reportersHtml = this.storage.data.persons.map(p=>`<option value="${p.id}" ${(c.reporters||[]).includes(p.id) ? 'selected' : ''}>${escapeHtml(p.givenName)} ${escapeHtml(p.familyName)}</option>`).join('');
    form.innerHTML = `
      <h3>${isEdit ? 'Vorgang bearbeiten' : 'Neuer Vorgang'}</h3>
      <div class="section">
        <div class="field-grid two-cols">
          <div class="field"><label>Vorgangs-ID</label><input name="caseNumber" type="text" value="${escapeHtml(c.caseNumber || '')}" placeholder="Automatisch generiert"></div>
          <div class="field"><label>Titel *</label><input name="title" type="text" value="${escapeHtml(c.title || '')}" required></div>
          <div class="field"><label>Kategorie</label><select name="category"><option>Konflikt</option><option>Gespräch</option><option>Organisation</option><option>Veranstaltung</option><option>Positives Ereignis</option><option>Sonstiges</option></select></div>
          <div class="field"><label>Status</label><select name="status"><option>Offen</option><option>In Arbeit</option><option>Erledigt</option></select></div>
          <div class="field"><label>Datum</label><input type="date" name="date" value="${escapeHtml(c.date || '')}"></div>
          <div class="field"><label>Uhrzeit</label><input type="time" name="time" value="${escapeHtml(c.time || '')}"></div>
          <div class="field"><label>Priorität</label><select name="priority" multiple size="5">${OPTIONS.priorities.map(option => `<option value="${option}" ${(c.priority||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="section">
        <h4>Beteiligte Personen</h4>
        <div class="field-grid two-cols">
          <div class="field"><label>Geschädigte Person(en)</label><select name="victims" multiple size="6">${victimsHtml}</select></div>
          <div class="field"><label>Beschuldigte Person(en)</label><select name="suspects" multiple size="6">${suspectsHtml}</select></div>
          <div class="field"><label>Zeugen</label><select name="witnesses" multiple size="6">${witnessesHtml}</select></div>
          <div class="field"><label>Melder</label><select name="reporters" multiple size="6">${reportersHtml}</select></div>
          <div class="field"><label>Allgemeine Beteiligte</label><select name="participants" multiple size="6">${personsHtml}</select></div>
        </div>
      </div>
      <div class="section">
        <h4>Beschreibung</h4>
        <div class="field"><textarea name="description" placeholder="Erläuterung des Vorgangs...">${escapeHtml(c.description || '')}</textarea></div>
      </div>
      <div class="section">
        <h4>Maßnahmen</h4>
        <div class="field-grid two-cols">
          <div class="field"><label>Dokumentierte Maßnahmen</label><select name="measureActions" multiple size="6">${OPTIONS.measureActions.map(option => `<option value="${option}" ${(c.measureActions||[]).includes(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>
          <div class="field"><label>Maßnahmenbeschreibung</label><textarea name="measureDescription" placeholder="Details zu durchgeführten Maßnahmen...">${escapeHtml(c.measureDescription || '')}</textarea></div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-light)">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" id="cancelForm">Abbrechen</button>
      </div>
    `;
    
    form.querySelector('select[name=category]').value = c.category;
    form.querySelector('select[name=status]').value = c.status;
    form.querySelectorAll('.section').forEach((section,index)=>{
      const mapping = ['overview','overview','overview','participants','participants','overview','overview'];
      section.dataset.section = mapping[index] || 'overview';
      section.style.display = section.dataset.section === this.current.tab ? '' : 'none';
    });
    if(this.current.tab === 'notes' || this.current.tab === 'history'){
      const content = document.createElement('div'); content.className='card record-card-content';
      if(this.current.tab === 'notes'){
        const notesHtml = (c.notes || []).map(note => `
          <div class="section note-entry">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
              <div><strong>Notiz</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(note.created))}</div></div>
              <button class="btn" type="button" data-delete-note="${note.id}">Löschen</button>
            </div>
            <div class="notes-box">${escapeHtml(note.text)}</div>
          </div>
        `).join('') || '<div class="section"><div class="notes-box">Keine Notizen vorhanden</div></div>';
        content.innerHTML = `
          <div class="section" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div><h4>Notizen & Dokumentation</h4></div>
          </div>
          ${notesHtml}
        `;
      } else {
        const history = (c.history || []).slice().sort((a,b)=>b.timestamp - a.timestamp);
        const historyHtml = history.length ? history.map(entry => `
          <div class="item">
            <div><strong>${escapeHtml(entry.event)}</strong><div class="muted">${escapeHtml(formatDateTimeBerlin(entry.timestamp))}</div></div>
          </div>
        `).join('') : `<div class="item"><div class="muted">Keine Einträge vorhanden</div></div>`;
        content.innerHTML = `
          <div class="section">
            <h4>Aktivitätsverlauf</h4>
            <div class="list">
              ${historyHtml}
            </div>
          </div>
        `;
      }
      this.view.appendChild(content);
      if(this.current.tab === 'notes'){
        content.querySelectorAll('[data-delete-note]').forEach(btn => btn.addEventListener('click', () => {
          const noteId = btn.dataset.deleteNote;
          const notes = (c.notes || []).filter(note => note.id !== noteId);
          this.storage.updateCase(c.id, { notes });
          this.renderCaseEdit(caseId);
        }));
      }
      const cancelBtn = document.createElement('button');
      return;
    }
    
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        caseNumber: fd.get('caseNumber'),
        title: fd.get('title'),
        category: fd.get('category'),
        status: fd.get('status'),
        date: fd.get('date'),
        time: fd.get('time'),
        participants: fd.getAll('participants'),
        victims: fd.getAll('victims'),
        suspects: fd.getAll('suspects'),
        witnesses: fd.getAll('witnesses'),
        reporters: fd.getAll('reporters'),
        priority: fd.getAll('priority'),
        measureActions: fd.getAll('measureActions'),
        measureDescription: fd.get('measureDescription'),
        description: fd.get('description')
      };
      if(isEdit){
        this.storage.updateCase(caseId, data);
        this.current = {type:'case',id:caseId,mode:'view',tab:'overview'};
      } else {
        data.id = genId('c-');
        data.created = Date.now();
        this.storage.addCase(data);
        this.current = {type:'case',id:data.id,mode:'view',tab:'overview'};
      }
      this.render();
    });

    form.querySelectorAll('select[multiple]').forEach(select => {
      select.addEventListener('mousedown', event => {
        const option = event.target.closest('option');
        if(!option) return;
        event.preventDefault();
        option.selected = !option.selected;
      });
    });

    form.querySelector('#cancelForm').addEventListener('click', ()=>{ this.current = {type:null,id:null,mode:'view',tab:'stammdaten'}; this.render(); });
    const cancelCaseBtn = header.querySelector('#cancelCase');
    if(cancelCaseBtn) cancelCaseBtn.addEventListener('click', ()=>{ this.current = {type:null,id:null,mode:'view',tab:'stammdaten'}; this.render(); });
    
    this.view.appendChild(form);
  }

  /* Tasks */
  renderTasks(){ 
    const tasks = this.storage.data.tasks; 
    this.view.innerHTML=''; 
    const h = document.createElement('div'); h.className='card'; 
    h.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h3>Aufgaben</h3><button class="btn primary" id="btnNewTaskMain">+ Aufgabe erstellen</button></div>`; 
    this.view.appendChild(h); 
    
    const list = document.createElement('div'); list.className='list'; 
    tasks.forEach(t=>{ 
      const it=document.createElement('div'); it.className='item'; 
      const left=document.createElement('div'); 
      left.innerHTML=`<strong>${t.title}</strong><div class="muted">Fällig: ${escapeHtml(formatDateEU(t.due))} • ${t.status}</div>`; 
      const right=document.createElement('div'); right.style.display='flex'; right.style.gap='8px';
      const btnEdit=document.createElement('button'); btnEdit.className='btn'; btnEdit.textContent='Bearbeiten'; 
      btnEdit.addEventListener('click', ()=>this.openTaskForm(t.id)); 
      const btnDel=document.createElement('button'); btnDel.className='btn'; btnDel.textContent='🗑'; 
      btnDel.addEventListener('click', ()=>{ if(confirm('Aufgabe löschen?')){ this.storage.deleteTask(t.id); this.renderTasks(); } }); 
      right.appendChild(btnEdit); right.appendChild(btnDel); 
      it.appendChild(left); it.appendChild(right); 
      list.appendChild(it); 
    }); 
    this.view.appendChild(list); 
    document.getElementById('btnNewTaskMain').addEventListener('click', ()=>this.openTaskForm()); 
  }

  openTaskForm(taskId){ 
    const isEdit = !!taskId; 
    const t = isEdit ? this.storage.data.tasks.find(x=>x.id===taskId) : {title:'',status:'Offen',due:new Date().toISOString().slice(0,10),description:''}; 
    const form = document.createElement('form'); form.className='card'; 
    form.innerHTML = `
      <h3>${isEdit? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h3>
      <div><label>Titel *</label><input name="title" type="text" value="${(t.title||'').replace(/"/g, '&quot;')}" required></div>
      <div class="row">
        <div style="flex:1"><label>Status</label><select name="status"><option>Offen</option><option>In Arbeit</option><option>Erledigt</option></select></div>
        <div style="flex:1"><label>Fälligkeitsdatum</label><input type="date" name="due" value="${t.due||''}"></div>
      </div>
      <div><label>Beschreibung</label><textarea name="description" placeholder="Was ist zu tun?">${(t.description||'').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea></div>
      <div style="display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border-light)">
        <button class="btn primary" type="submit">Speichern</button>
        <button class="btn" type="button" id="cancelTask">Abbrechen</button>
      </div>
    `; 
    
    form.querySelector('select[name=status]').value = t.status; 
    
    form.addEventListener('submit', e=>{ 
      e.preventDefault(); 
      const fd=new FormData(form); 
      const data={title:fd.get('title'),status:fd.get('status'),due:fd.get('due'),description:fd.get('description')}; 
      if(isEdit){ this.storage.updateTask(taskId,data); } 
      else { data.id=genId('t-'); data.created=Date.now(); this.storage.addTask(data);} 
      this.renderTasks(); 
    }); 
    
    form.querySelector('#cancelTask').addEventListener('click', ()=>this.renderTasks()); 
    
    this.view.innerHTML=''; 
    this.view.appendChild(form); 
  }

  /* Modal helpers */
  openModal(node){ 
    this.modalContent.innerHTML=''; 
    if(typeof node === 'string') this.modalContent.innerHTML = node; 
    else this.modalContent.appendChild(node); 
    this.modal.classList.remove('hidden'); 
    this.modal.setAttribute('aria-hidden','false'); 
  }
  
  closeModal(){ 
    this.modal.classList.add('hidden'); 
    this.modal.setAttribute('aria-hidden','true'); 
    this.modalContent.innerHTML=''; 
  }

  performGlobalSearch(q){ 
    q = q.trim(); 
    if(!q) return this.render(); 
    const persons = this.storage.data.persons.filter(p=>`${p.givenName} ${p.familyName}`.toLowerCase().includes(q.toLowerCase())); 
    const cases = this.storage.data.cases.filter(c=> (c.title||'').toLowerCase().includes(q.toLowerCase())); 
    this.view.innerHTML=''; 
    
    if(persons.length){ 
      const pc=document.createElement('div'); pc.className='card'; 
      pc.innerHTML=`<h3>Personen (${persons.length})</h3>`; 
      const pList=document.createElement('div'); pList.className='list'; 
      persons.forEach(p=>{ 
        const it=document.createElement('div'); it.className='item'; 
        const left = document.createElement('div');
        left.innerHTML=`<strong>${p.givenName} ${p.familyName}</strong>`; 
        const right = document.createElement('div');
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Akte öffnen'; 
        btn.addEventListener('click', ()=>{ this.current={type:'person',id:p.id,mode:'view',tab:'stammdaten'}; this.render(); }); 
        right.appendChild(btn);
        it.appendChild(left); it.appendChild(right);
        pList.appendChild(it); 
      }); 
      pc.appendChild(pList); 
      this.view.appendChild(pc); 
    } 
    
    if(cases.length){ 
      const cc=document.createElement('div'); cc.className='card'; 
      cc.innerHTML=`<h3>Vorgänge (${cases.length})</h3>`; 
      const cList=document.createElement('div'); cList.className='list'; 
      cases.forEach(c=>{ 
        const it=document.createElement('div'); it.className='item'; 
        const left = document.createElement('div');
        left.innerHTML=`<strong>${c.title}</strong><div class="muted">${c.category}</div>`; 
        const right = document.createElement('div');
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Akte öffnen'; 
        btn.addEventListener('click', ()=>{ this.current={type:'case',id:c.id,mode:'view',tab:'overview'}; this.render(); }); 
        right.appendChild(btn);
        it.appendChild(left); it.appendChild(right);
        cList.appendChild(it); 
      }); 
      cc.appendChild(cList); 
      this.view.appendChild(cc); 
    } 
    
    if(!persons.length && !cases.length){
      this.view.innerHTML = '<div class="card"><h3>Keine Ergebnisse</h3><p style="color:var(--muted)">Suche nach „'+q+'" lieferte keine Treffer.</p></div>';
    }
  }

  openQuickCreateMenu(){ 
    const menu = document.createElement('div'); menu.innerHTML = '<h3>Neu erstellen</h3>'; 
    const list = document.createElement('div'); list.className='list'; 
    [['Person',()=>this.openPersonNewInMain()],['Vorgang',()=>this.openCaseNewInMain()],['Aufgabe',()=>this.openTaskForm()]].forEach(([label,fn])=>{ 
      const it=document.createElement('div'); it.className='item'; 
      const btn=document.createElement('button'); btn.className='btn'; btn.textContent=label; 
      btn.addEventListener('click', ()=>{ this.closeModal(); fn(); }); 
      it.appendChild(btn); 
      list.appendChild(it); 
    }); 
    menu.appendChild(list); 
    this.openModal(menu); 
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{ OPTIONS = await loadOptionData(); window.app = new App(); });

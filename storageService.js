import { firebaseConfig, USE_FIRESTORE } from './firebase-config.js';

let firebaseApp = null;
let firestoreDb = null;
let firestoreLib = null;

async function loadFirestoreLibs(){
  if(firestoreLib && firestoreDb) return { firestoreLib, firestoreDb };
  const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
  const firestoreModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
  const { initializeApp } = firebaseAppModule;
  const { getFirestore } = firestoreModule;
  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
  firestoreLib = firestoreModule;
  return { firestoreLib, firestoreDb };
}

export async function initFirebase(){
  if(!USE_FIRESTORE) throw new Error('Firestore ist in firebase-config.js deaktiviert. Setze USE_FIRESTORE auf true, um Firestore zu verwenden.');
  if(!firebaseConfig || !firebaseConfig.projectId) throw new Error('Firebase-Konfiguration fehlt. Trage die Werte in firebase-config.js ein.');
  return loadFirestoreLibs();
}

function normalizePerson(person){
  const normalized = Object.assign({
    id: person.id || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
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
    remarks: [],
    created: person.created || Date.now()
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
  normalized.remarks = Array.isArray(normalized.remarks) ? normalized.remarks : [];
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

  return normalized;
}

function normalizeCase(caseRecord){
  const normalized = Object.assign({
    id: caseRecord.id || `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
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
    created: caseRecord.created || Date.now()
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

  return normalized;
}

function generateInternalId(nextPersonNumber){
  return `ANX-${String(nextPersonNumber).padStart(6, '0')}`;
}

export class LocalStorageStorage {
  constructor(key){
    this.key = key;
    this.data = { persons: [], cases: [], tasks: [], meta: { created: Date.now(), nextPersonNumber: 1, nextCaseNumber: 1 } };
    this.load();
  }

  load(){
    try {
      const raw = localStorage.getItem(this.key);
      if(raw){
        this.data = JSON.parse(raw);
        if(!this.data.meta) this.data.meta = { created: Date.now(), nextPersonNumber: 1, nextCaseNumber: 1 };
        this.data.meta.nextPersonNumber = Math.max(this.data.meta.nextPersonNumber || 1, this._getNextPersonIndex());
        this.data.meta.nextCaseNumber = Math.max(this.data.meta.nextCaseNumber || 1, this._getNextCaseNumber());
        this._normalizePersons();
        this._normalizeCases();
        this.save();
      } else {
        this._seed();
        this.save();
      }
    } catch(error) {
      console.error('Fehler beim Laden der Daten aus localStorage', error);
      this._seed();
      this.save();
    }
  }

  save(){
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  _getNextPersonIndex(){
    const max = this.data.persons.reduce((current, person) => {
      const match = /^ANX-(\d{6})$/.exec(person.internalId || '');
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(current, value);
    }, 0);
    return max + 1;
  }

  _getNextCaseNumber(){
    const max = this.data.cases.reduce((current, c) => {
      const match = /^VG-(\d{6})$/.exec(c.caseNumber || '');
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
    return generateInternalId(next);
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
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
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

    if(!normalized.internalId){
      normalized.internalId = generateInternalId(this.data?.meta?.nextPersonNumber || 1);
    }
    return normalized;
  }

  _normalizePersons(){
    this.data.persons = Array.isArray(this.data.persons) ? this.data.persons.map(p => this._normalizePerson(p)) : [];
  }

  _normalizeCase(caseRecord){
    const normalized = Object.assign({
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
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

    return normalized;
  }

  _normalizeCases(){
    this.data.cases = Array.isArray(this.data.cases) ? this.data.cases.map(c => this._normalizeCase(c)) : [];
  }

  _seed(){
    const p1 = this._normalizePerson({ id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, givenName: 'Max', familyName: 'Mustermann', birthDate:'1985-03-12', birthplace:'Berlin', gender:'Männlich', notes:'Beispielakte', tags:['Test'], internalId:'ANX-000001', created:Date.now() });
    const p2 = this._normalizePerson({ id: `p-${(Date.now()+1).toString(36)}-${Math.random().toString(36).slice(2,8)}`, givenName: 'Anna', familyName: 'Schmidt', birthDate:'1990-07-04', birthplace:'Hamburg', gender:'Weiblich', notes:'Beispielakte 2', tags:[], internalId:'ANX-000002', created:Date.now() });
    const c1 = this._normalizeCase({ id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, caseNumber:'VG-000001', title:'Streitfall Parkplatz', category:'Konflikt', status:'Offen', date:new Date().toISOString().slice(0,10), participants:[p1.id,p2.id], description:'Konfliktmeldung', created:Date.now() });
    const t1 = { id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, title:'Kontakt aufnehmen', status:'Offen', due:new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10), description:'Rückruf planen', created:Date.now() };
    this.data.persons.push(p1, p2);
    this.data.cases.push(c1);
    this.data.tasks.push(t1);
  }

  addPerson(person){ this.data.persons.push(this._normalizePerson(person)); this.save(); }
  updatePerson(id, patch){ const p = this.data.persons.find(x=>x.id===id); if(p){ Object.assign(p, patch); this._normalizePerson(p); } this.save(); }
  deletePerson(id){ this.data.persons = this.data.persons.filter(x=>x.id!==id); this.data.cases.forEach(c=>{ c.participants = c.participants.filter(pid=>pid!==id); }); this.save(); }

  addCase(c){ this.data.cases.push(this._normalizeCase(c)); this.save(); }
  updateCase(id, patch){ const c = this.data.cases.find(x=>x.id===id); if(c){ Object.assign(c,patch); this._normalizeCase(c); } this.save(); }
  deleteCase(id){ this.data.cases = this.data.cases.filter(x=>x.id!==id); this.save(); }

  addTask(t){ this.data.tasks.push(t); this.save(); }
  updateTask(id, patch){ const t = this.data.tasks.find(x=>x.id===id); if(t) Object.assign(t,patch); this.save(); }
  deleteTask(id){ this.data.tasks = this.data.tasks.filter(x=>x.id!==id); this.save(); }
}

export class FirestoreStorage {
  constructor(db){
    this.db = db;
    this.data = { persons: [], cases: [], tasks: [], meta: { created: Date.now(), nextPersonNumber: 1, nextCaseNumber: 1 } };
  }

  async load(){
    if(!this.db) throw new Error('Firestore nicht initialisiert');
    this.data.persons = await this._loadCollection('persons');
    this.data.cases = await this._loadCollection('cases');
    this.data.tasks = await this._loadCollection('tasks');
    await this._loadMeta();
    this._normalizePersons();
    this._normalizeCases();
  }

  save(){ /* Firestore schreibt direkt über einzelne CRUD-Aufrufe. */ }

  async _loadCollection(collectionName){
    const queryRef = firestoreLib.query(firestoreLib.collection(this.db, collectionName), firestoreLib.orderBy('created', 'asc'));
    const snapshot = await firestoreLib.getDocs(queryRef);
    return snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
  }

  async _loadMeta(){
    const metaDoc = await firestoreLib.getDoc(firestoreLib.doc(this.db, 'meta', 'app'));
    if(metaDoc.exists()){
      this.data.meta = Object.assign(this.data.meta, metaDoc.data());
      this.data.meta.nextPersonNumber = this.data.meta.nextPersonNumber || 1;
      this.data.meta.nextCaseNumber = this.data.meta.nextCaseNumber || 1;
    }
  }

  async _saveMeta(){
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'meta', 'app'), this.data.meta, { merge: true });
  }

  _getNextPersonIndex(){
    const max = this.data.persons.reduce((current, person) => {
      const match = /^ANX-(\d{6})$/.exec(person.internalId || '');
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(current, value);
    }, 0);
    return max + 1;
  }

  _getNextCaseNumber(){
    const max = this.data.cases.reduce((current, c) => {
      const match = /^VG-(\d{6})$/.exec(c.caseNumber || '');
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(current, value);
    }, 0);
    return max + 1;
  }

  _generatePersonInternalId(){
    this.data.meta.nextPersonNumber = Math.max(this.data.meta.nextPersonNumber || 1, this._getNextPersonIndex());
    const next = this.data.meta.nextPersonNumber;
    this.data.meta.nextPersonNumber += 1;
    return generateInternalId(next);
  }

  _generateCaseNumber(){
    this.data.meta.nextCaseNumber = Math.max(this.data.meta.nextCaseNumber || 1, this._getNextCaseNumber());
    const next = this.data.meta.nextCaseNumber;
    this.data.meta.nextCaseNumber += 1;
    return `VG-${String(next).padStart(6,'0')}`;
  }

  _normalizePerson(person){
    const normalized = normalizePerson(person);
    if(!normalized.internalId){
      normalized.internalId = this._generatePersonInternalId();
    }
    return normalized;
  }

  _normalizePersons(){
    this.data.persons = Array.isArray(this.data.persons) ? this.data.persons.map(p => this._normalizePerson(p)) : [];
  }

  _normalizeCase(caseRecord){
    const normalized = normalizeCase(caseRecord);
    if(!normalized.caseNumber) normalized.caseNumber = this._generateCaseNumber();
    return normalized;
  }

  _normalizeCases(){
    this.data.cases = Array.isArray(this.data.cases) ? this.data.cases.map(c => this._normalizeCase(c)) : [];
  }

  _normalizeTask(task){
    return Object.assign({ id: task.id || `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, title: '', status: 'Offen', due: new Date().toISOString().slice(0,10), description: '', created: task.created || Date.now() }, task);
  }

  async addPerson(person){
    const normalized = this._normalizePerson(person);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'persons', normalized.id), normalized);
    this.data.persons.push(normalized);
    await this._saveMeta();
    return normalized;
  }

  async updatePerson(id, patch){
    const existing = this.data.persons.find(x => x.id === id);
    if(!existing) return;
    Object.assign(existing, patch);
    const normalized = this._normalizePerson(existing);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'persons', id), normalized, { merge: true });
    return normalized;
  }

  async deletePerson(id){
    this.data.persons = this.data.persons.filter(x => x.id !== id);
    this.data.cases.forEach(c => { c.participants = c.participants.filter(pid => pid !== id); });
    await firestoreLib.deleteDoc(firestoreLib.doc(this.db, 'persons', id));
  }

  async addCase(caseRecord){
    const normalized = this._normalizeCase(caseRecord);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'cases', normalized.id), normalized);
    this.data.cases.push(normalized);
    await this._saveMeta();
    return normalized;
  }

  async updateCase(id, patch){
    const existing = this.data.cases.find(x => x.id === id);
    if(!existing) return;
    Object.assign(existing, patch);
    const normalized = this._normalizeCase(existing);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'cases', id), normalized, { merge: true });
    return normalized;
  }

  async deleteCase(id){
    this.data.cases = this.data.cases.filter(x => x.id !== id);
    await firestoreLib.deleteDoc(firestoreLib.doc(this.db, 'cases', id));
  }

  async addTask(task){
    const normalized = this._normalizeTask(task);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'tasks', normalized.id), normalized);
    this.data.tasks.push(normalized);
    return normalized;
  }

  async updateTask(id, patch){
    const existing = this.data.tasks.find(x => x.id === id);
    if(!existing) return;
    Object.assign(existing, patch);
    const normalized = this._normalizeTask(existing);
    await firestoreLib.setDoc(firestoreLib.doc(this.db, 'tasks', id), normalized, { merge: true });
    return normalized;
  }

  async deleteTask(id){
    this.data.tasks = this.data.tasks.filter(x => x.id !== id);
    await firestoreLib.deleteDoc(firestoreLib.doc(this.db, 'tasks', id));
  }
}

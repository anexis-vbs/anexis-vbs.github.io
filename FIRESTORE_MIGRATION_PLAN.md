# Firestore Migration Plan for ANEXIS

## Ziel
Vorbereiten des ANEXIS-Projekts auf die Umstellung der Persistenz von `localStorage` auf Firebase Firestore.

## Aktuelle Architektur
- Alle Daten werden aktuell in `app.js` über die `Storage`-Klasse in `localStorage` gespeichert.
- Personen liegen in `Storage.data.persons`.
- Vorgänge liegen in `Storage.data.cases`.
- Aufgaben liegen in `Storage.data.tasks`.
- Die UI nutzt `this.storage.data` direkt und ruft `addPerson`, `updateCase`, `deletePerson` usw. auf.

## Dateien für Datenhaltung
- `app.js` — zentrale Persistenzlogik und alle CRUD-Methoden.
- `firebase-config.js` — neue Konfigurationsdatei für Firebase.
- `storageService.js` — neues Modul zur Trennung von lokalem Speicher und Firestore.

## Konkrete Anpassungen
1. `app.js`
   - `Storage` bleibt als lokaler Fallback bestehen.
   - Neue `initStorage()`-Logik für die Auswahl zwischen lokalem Speicher und Firestore.
   - Firestore wird über neue `storageService.js`-Funktionen initialisiert.
   - UI bleibt bis auf die Storage-Initialisierung weitgehend unverändert.

2. `storageService.js`
   - `LocalStorageStorage` implementiert die bestehende `Storage`-API.
   - `FirestoreStorage` bietet die gleiche API mit Firestore-CRUD-Methoden.
   - `initFirebase()` lädt Firebase-Modulbibliotheken dynamisch.

3. `firebase-config.js`
   - Trägt die Firebase-Projektkonfiguration.
   - Schaltet Firestore mit `USE_FIRESTORE` ein oder aus.

## Teile, die geändert werden müssen
- `app.js`
  - Import von Firestore-Service.
  - Aufbau von `this.storage` abhängig von `USE_FIRESTORE`.
  - Asynchrone Initialisierung der Storage-Schicht.
  - Fallback auf `LocalStorageStorage` falls Firestore-Initialisierung fehlschlägt.

- `storageService.js`
  - Neues Modul mit `LocalStorageStorage` und `FirestoreStorage`.
  - Firestore-spezifische Lade- und Speichermethoden.

## Teile, die unverändert bleiben können
- UI-Renderlogik in `app.js` (Listen, Detailansichten, Edit-Formulare).
- `options.json` und Optionensets.
- `styles.css`.
- Theme-Management in `localStorage`.

## Firebase-Setup auf der Webseite
1. Öffne die Firebase Console: https://console.firebase.google.com/
2. Erstelle ein neues Projekt oder wähle ein bestehendes Projekt aus.
3. Klicke in deinem Firebase-Projekt auf das Zahnrad-Symbol und wähle „Projekteinstellungen“.
4. Scrolle zum Bereich „Ihre Apps“ und füge eine neue Web-App hinzu.
   - App-Nickname z. B. `ANEXIS-Web`.
   - Falls gefragt, kannst du „Firebase Hosting“ vorerst überspringen.
5. Kopiere die Firebase-Konfigurationsdaten aus dem Setup-Schritt.
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId`
6. Trage diese Werte in `firebase-config.js` ein.
7. Setze `USE_FIRESTORE` in `firebase-config.js` auf `true`.

## Firestore-Datenbank aktivieren
1. Gehe in der Firebase-Konsole zu „Firestore Database“.
2. Klicke auf „Datenbank erstellen“.
3. Wähle den Modus:
   - Für erste Tests: `Testmodus` (Achtung: offen für alle Anfragen, nur für Entwicklung nutzen).
   - Für späteren produktiven Einsatz: `Produktion` und passe die Sicherheitsregeln an.
4. Wähle eine Cloud Firestore-Region in deiner Nähe.
5. Erstelle die Datenbank.
6. Nach der Erstellung musst du nichts weiter einstellen, damit die App grundlegende Lese-/Schreib-Operationen ausführen kann, solange `USE_FIRESTORE = true` in `firebase-config.js` und die Projektkonfiguration korrekt ist.
7. Falls du später auf Produktion umstellst, passe die Firestore-Sicherheitsregeln an, damit nur berechtigte Nutzer lesen und schreiben können.

## Konfiguration der lokalen Webseite
1. Prüfe, dass deine Webseite über `http://` oder `https://` geladen wird. `file://` funktioniert normalerweise nicht mit der Firebase-Web-SDK-Modul-Installation.
2. Nutze einen einfachen lokalen Webserver, z. B.:
   - VS Code Live Server
   - `npx http-server .`
   - `python -m http.server 8000`
3. Öffne danach die Seite im Browser und vergewissere dich, dass `app.js` ohne Modul-Import-Fehler geladen wird.
4. Wenn die Seite geladen ist, sollte die App automatisch versuchen, sich mit Firestore zu verbinden, weil `USE_FIRESTORE` auf `true` gesetzt ist.
5. Die Konsole zeigt beim Laden der Seite an, ob die Verbindung erfolgreich ist oder ob ein Fehler in der Firebase-Konfiguration vorliegt.

## Was du nach der DB-Erstellung wirklich machen musst
1. In der Firebase-Konsole:
   - Firestore-Datenbank erstellen
   - Optional: Testmodus für schnelle lokale Tests nutzen
   - Optional: Sicherheitsregeln für Produktion konfigurieren
2. In `firebase-config.js`:
   - Firebase-Konfigurationswerte aus der Web-App hinzufügen
   - `USE_FIRESTORE = true` setzen
3. Im Projekt:
   - Webseite über einen lokalen Server öffnen
   - App neu laden
   - Browser-Konsole prüfen
4. Wenn die App funktioniert, ist sonst keine weitere Firebase-Konfiguration nötig.

## Validierung und Debugging
1. Öffne die Entwicklerkonsole deines Browsers.
2. Lade die Seite neu und suche nach Fehlern wie:
   - `Failed to fetch` oder `NetworkError`
   - `useFirestore is not defined`
   - `Firebase config contains invalid values`
3. Wenn alles korrekt ist, sollte die App wieder die Inhalte rendern und `USE_FIRESTORE = true` den Firestore-Fallback nutzen.

## Optional: Firebase Hosting einrichten
1. Wenn du die App im Web veröffentlichen möchtest, kannst du später Firebase Hosting nutzen.
2. Installiere Firebase CLI: `npm install -g firebase-tools`.
3. Führe `firebase login` und `firebase init hosting` im Projektordner aus.
4. Wähle dein Firebase-Projekt und den Build-Ordner/Root der Webseite.
5. Veröffentliche mit `firebase deploy`.

## Nächste Schritte
1. Firestore-Konfiguration in `firebase-config.js` eintragen.
2. `USE_FIRESTORE` auf `true` setzen.
3. Seite über einen lokalen Webserver öffnen.
4. Testen aller Person-/Vorgangs-CRUD-Flows mit Firestore.
5. Später Firestore-Sicherheitsregeln für den produktiven Einsatz prüfen.

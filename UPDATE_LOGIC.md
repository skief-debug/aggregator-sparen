# Auto-Updater Logik & Workflow

Diese Datei dient ausschließlich zur Dokumentation des automatischen Update-Prozesses über GitHub. Sie wird nicht von der App selbst gelesen, sondern dient KIs und Entwicklern als Anleitung.

## 1. Wie funktioniert der Auto-Updater?
Der Updater prüft bei jedem App-Start über die GitHub API, ob es ein neues Release im angegebenen Repository gibt.
- **Voraussetzung:** Das Repository muss auf "Public" (öffentlich) stehen, damit die App ohne Authentifizierung darauf zugreifen kann. (Alternativ: GitHub-Token implementieren, was für MVPs aber nicht empfohlen ist).
- **Ablauf:**
  1. App startet und holt sich die Info vom `latest` Release (`https://api.github.com/repos/OWNER/REPO/releases/latest`).
  2. Es wird die Version aus dem Release-Tag (z.B. `v1.0.1`) mit der aktuellen Version der App verglichen.
  3. Ist die Release-Version neuer, erscheint ein Modal-Dialog.
  4. Bestätigt der User, wird die an das Release angehängte `.apk` Datei heruntergeladen.
  5. Nach dem Download wird ein Android-Intent ausgelöst, um die APK zu installieren (benötigt `FLAG_ACTIVITY_NEW_TASK` und `FLAG_GRANT_READ_URI_PERMISSION`).

## 2. Wo liegt der Code? (Für andere Apps)
Wenn du diese Logik in einer anderen App verwenden willst, brauchst du folgende Datei:
- **Code-Pfad:** `apps/mobile/components/GithubUpdater.tsx`
Kopiere diese Komponente in dein neues Projekt und passe oben die Variablen `GITHUB_OWNER` und `GITHUB_REPO` an. Stelle außerdem sicher, dass die Expo-Pakete `expo-file-system`, `expo-intent-launcher`, `expo-constants` und `expo-device` installiert sind.
Außerdem muss in der `app.json` die Android-Berechtigung `REQUEST_INSTALL_PACKAGES` gesetzt sein.

## 3. Der CI/CD Workflow (Wie man Updates pusht)
Sobald du den Code geändert hast und ein Update an die Nutzer ausliefern willst, befolge diese Schritte:

1. **Änderungen pushen:**
   ```bash
   git add .
   git commit -m "Dein Update Text"
   git push origin master
   ```
2. **APK kompilieren:**
   Kompiliere die App (z.B. über EAS Build):
   ```bash
   npm run build:apk
   ```
3. **Release erstellen:**
   Sobald die `.apk` fertig ist, lade sie herunter und erstelle ein neues GitHub Release. Erhöhe dabei die Versionsnummer fortlaufend (z.B. von `v1.0.0` auf `v1.0.1`):
   ```bash
   gh release create v1.0.1 pfad/zur/app.apk --title "v1.0.1 Update" --notes "Was wurde geändert?"
   ```
4. **Fertig:** Die App deiner User wird das Update beim nächsten Start erkennen und die Installation vorschlagen.

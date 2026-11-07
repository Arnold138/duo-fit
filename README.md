# Duo Fit

Mon app d'entraînement **streetlifting + powerlifting**, installable sur l'iPhone comme une vraie app.

**Ouvrir l'app :** https://arnold138.github.io/duo-fit/
**Sur iPhone :** ouvrir le lien dans Safari → Partager → **Sur l'écran d'accueil**.

## Nouveautés de la version 1.1 — deux profils, corbeille, course

- **« Qui s'entraîne ? » au premier lancement :** **Arnold** (profil déjà chargé avec tout l'historique) ou **Nouveau profil**.
- **Nouveau profil :** prénom, poids, **exercices choisis** (tractions, squat, RDL… ou un exercice ajouté à la main), **une série récente par exercice** pour calculer les charges, **minimum et maximum d'exercices par séance**, et la course.
- **Séance du jour du profil perso :** les exercices les moins travaillés passent en premier ; le nombre du jour se règle entre le minimum et le maximum. Chaque exercice suit un cycle de 4 séances (RPE **7 → 7,5 → 8 → 6,5**).
- **Corbeille :** sur chaque série de la séance (elle ne compte pas), sur un exercice entier, sur un exercice de la séance du jour, et sur une séance du journal (avec confirmation).
- **Course :** km et allure de la semaine dans le Journal, 8 semaines de km dans Stats, dernières sorties.
- **Chacun son compte :** connexion ou **création de compte** dans l'app.
- **Course en saisie rapide :** bouton **+** → Course → km et durée ; l'allure et le niveau (VDOT) sont calculés. Strava n'est pas branché (son API est devenue payante en 2026) et Apple Santé n'est pas lisible depuis une app web.

**Sécurité :** format `duofit:v1` inchangé, seulement des champs ajoutés. Une séance supprimée est **marquée** supprimée (pas effacée), pour qu'un autre appareil ne la fasse pas revenir.

## Nouveautés de la version 1.0 — première version

- **Séance du jour :** un seul mouvement par séance, en rotation **dips → tractions → squat → bench**. Tu peux choisir un autre mouvement le jour même sans casser la rotation.
- **Charges calculées depuis mon historique** (coaching SBD4EVER 2023-2025 + streetlifting début 2026) : dips **+106**, tractions **+48**, squat **241**, bench **136** d'e1RM au départ.
- **Chaque séance saisie recale tout :** charges, reps, RPE et ressenti. L'e1RM = moyenne des 3 dernières séances. Plus dur que prévu ou « fatigué » → −5 % la fois d'après ; « douleur » au squat → reprise légère.
- **Cycles de 4 séances par mouvement :** RPE **7 → 7,5 → 8 → 6,5 (allégée)**. Pas de date, pas de compte à rebours, RPE 8 maximum.
- **Synchro iPhone + PC** avec **le même compte que Kioku** (Profil → Synchronisation).
- **Sauvegarde :** Profil → Sauvegarde → Exporter / Importer.
- **Duo :** le mode à deux arrive plus tard.

**Sécurité :** format `duofit:v1` ; la synchro réunit les séances des deux appareils, elle n'en supprime jamais.

## Comment c'est construit

- Un seul fichier `index.html` (aucune compilation), `manifest.webmanifest` + `sw.js` pour l'installation et le hors-ligne.
- Données : `localStorage` (`duofit:v1`) + table Supabase `duofit_state` dans le projet Kioku (une ligne JSON par compte, protégée par RLS). Schéma : `supabase/schema.sql`.
- Toute la progression (rotation, cycles, e1RM) est **recalculée à partir du journal**, donc deux appareils ne peuvent pas se contredire.
- Déploiement : GitHub Pages, branche `main`, dossier racine.

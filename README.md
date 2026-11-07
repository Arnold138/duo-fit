# Duo Fit

Mon app d'entraînement **streetlifting + powerlifting**, installable sur l'iPhone comme une vraie app.

**Ouvrir l'app :** https://arnold138.github.io/duo-fit/
**Sur iPhone :** ouvrir le lien dans Safari → Partager → **Sur l'écran d'accueil**.

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

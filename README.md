# AkaCare IA Quiz Frontend

Frontend web React + TypeScript pour le quiz IA (FHIR + ICD11), avec architecture modulaire et consommation du backend NestJS.

## Lancement

```bash
cd front
cp .env.example .env
npm install
npm run dev
```

L'application démarre par la page de connexion (`POST /auth/login`) puis enchaîne vers le quiz.

## Variables d'environnement

- `VITE_API_BASE_URL`: URL du backend API.
- En local (`npm run dev`): `.env.development` pointe vers `http://localhost:3000`.
- En production (`npm run build` / Vercel): `.env.production` pointe vers `https://backend-iaquizz.onrender.com`.

La base URL API est centralisée dans `src/shared/config/env.ts`, et consommée uniquement via `src/shared/lib/http/httpClient.ts`.

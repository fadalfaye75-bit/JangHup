# JàngHub - Plateforme Scolaire Universitaire

JàngHub est une application web moderne de gestion scolaire destinée aux universités et établissements supérieurs au Sénégal. Elle permet la gestion des emplois du temps, des annonces, des examens et des visioconférences.

## 🚀 Fonctionnalités

- **Authentification Sécurisée** : Gestion des rôles (Étudiant, Délégué, Admin).
- **Tableau de Bord** : Vue d'ensemble des cours et alertes.
- **Gestion Académique** : Emplois du temps, Examens (DS), Sondages.
- **Administration** : Panel complet pour gérer les utilisateurs et les classes.
- **Communication** : Fil d'actualité et intégration Visioconférence.

## 🛠 Installation & Développement

1.  **Cloner le projet**
2.  **Installer les dépendances** : `npm install`
3.  **Lancer en local** : `npm start` (ou `npm run dev`)

## 🗄️ Configuration Base de Données (Supabase)

Pour que l'application fonctionne, vous devez exécuter le script SQL fourni dans l'interface de Supabase (SQL Editor).

Ce script crée :
- Les tables : `profiles`, `classes`, `announcements`, `exams`, `schedules`, `polls`, `meetings`, `audit_logs`.
- Les buckets de stockage : `images`, `files`.
- Les politiques de sécurité (RLS).
- Le premier administrateur.

## 🌍 Déploiement (Vercel / Netlify)

L'application est prête à être déployée.

1.  Poussez votre code sur GitHub/GitLab.
2.  Importez le projet sur **Vercel** ou **Netlify**.
3.  **Variables d'Environnement** :
    Ajoutez les variables suivantes dans la configuration de votre hébergeur pour sécuriser l'application :

    ```env
    VITE_SUPABASE_URL=votre_url_supabase
    VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
    ```
    *(Si vous utilisez Create React App, utilisez `REACT_APP_SUPABASE_URL`)*

## 📱 Mobile

L'application est "Responsive" et conçue pour fonctionner comme une application native sur mobile.
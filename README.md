
# JàngHub - Plateforme Scolaire Universitaire

JàngHub est une application web moderne de gestion scolaire destinée aux universités et établissements supérieurs au Sénégal. Elle permet la gestion des emplois du temps, des annonces, des examens, des visioconférences et inclut un forum étudiant.

## 🚀 Fonctionnalités

- **Authentification Sécurisée** : Gestion des rôles (Étudiant, Délégué, Admin).
- **Tableau de Bord** : Vue d'ensemble des cours et alertes.
- **Gestion Académique** : Emplois du temps, Examens (DS), Sondages.
- **Forum Étudiant** : Espace de discussion et d'entraide (Support SQL inclus).
- **Administration** : Panel complet pour gérer les utilisateurs et les classes.
- **Communication** : Fil d'actualité et intégration Visioconférence.

## 🛠 Installation & Développement

1.  **Cloner le projet**
2.  **Installer les dépendances** : `npm install`
3.  **Lancer en local** : `npm start` (ou `npm run dev`)

## 🗄️ Configuration Base de Données (Supabase)

Pour que l'application fonctionne, vous devez exécuter les scripts SQL dans l'interface de Supabase (SQL Editor).

### 1. Initialisation des Tables (Nouveau)
1.  Ouvrez le fichier `db_schema.sql` situé à la racine du projet.
2.  Copiez tout le contenu.
3.  Collez-le dans l'éditeur SQL de Supabase (Tableau de bord Supabase > SQL Editor) et cliquez sur "Run".
4.  Cela créera toutes les tables nécessaires : `profiles`, `classes`, `announcements`, `exams`, `forum_posts`, etc.

### 2. Création du Compte Administrateur (Obligatoire)
Puisque l'inscription publique est désactivée par défaut dans l'interface de démo, vous devez créer le premier compte admin manuellement ou via le panneau d'inscription si vous l'activez :

1.  Allez dans **Supabase > Authentication > Users** et cliquez sur "Add User".
2.  Créez un utilisateur avec votre email (ex: `admin@janghub.sn`).
3.  Allez dans **Supabase > SQL Editor** et exécutez ce script pour donner les droits Admin :

```sql
UPDATE public.profiles
SET 
  role = 'ADMIN',
  class_level = 'ADMINISTRATION',
  full_name = 'Super Admin'
WHERE email = 'admin@janghub.sn'; -- ⚠️ Remplacez par votre email
```

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

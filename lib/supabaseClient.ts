import { createClient } from '@supabase/supabase-js';

// Détection intelligente des variables d'environnement (Supporte Vite, Next.js, CRA)
const getEnv = (key: string) => {
  // 1. Essayer import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // 2. Essayer process.env (Standard/CRA)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return null;
};

// Récupération des clés. 
// IMPORTANT: Vous devez configurer ces variables dans votre fichier .env ou sur Vercel/Netlify.
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ ATTENTION: Les clés Supabase ne sont pas détectées. Vérifiez votre fichier .env");
}

// Création du client. Si les clés sont absentes, on utilise des valeurs factices pour éviter le crash immédiat au chargement,
// mais les appels API échoueront logiquement.
export const supabase = createClient(
  supabaseUrl || 'https://votre-projet.supabase.co', 
  supabaseKey || 'votre-cle-publique'
);
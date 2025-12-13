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
const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY');

// Clés de secours fournies par l'utilisateur
const fallbackUrl = 'https://derbemxykhirylcmogtb.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmJlbXh5a2hpcnlsY21vZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjIwOTEsImV4cCI6MjA4MTEzODA5MX0.j96J7l_E9rpoOjxnzv62FxxzAjHP_SV6D6_IBb0GoeQ';

const supabaseUrl = envUrl || fallbackUrl;
const supabaseKey = envKey || fallbackKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ ATTENTION: Les clés Supabase ne sont pas détectées. Vérifiez votre fichier .env");
} else {
  console.log("JàngHub: Connexion Supabase initialisée.");
}

// Création du client
export const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);
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

// Récupération des clés avec fallback sur vos clés actuelles pour garantir le fonctionnement immédiat
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || process.env.REACT_APP_SUPABASE_URL || 'https://derbemxykhirylcmogtb.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmJlbXh5a2hpcnlsY21vZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjIwOTEsImV4cCI6MjA4MTEzODA5MX0.j96J7l_E9rpoOjxnzv62FxxzAjHP_SV6D6_IBb0GoeQ';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (!isValidUrl(supabaseUrl)) {
  console.error("ERREUR CRITIQUE: L'URL Supabase est invalide. Vérifiez vos variables d'environnement.");
}

export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co', 
  supabaseKey
);
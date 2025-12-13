import { createClient } from '@supabase/supabase-js';

// Configuration Supabase avec les clés fournies
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://derbemxykhirylcmogtb.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmJlbXh5a2hpcnlsY21vZ3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjIwOTEsImV4cCI6MjA4MTEzODA5MX0.j96J7l_E9rpoOjxnzv62FxxzAjHP_SV6D6_IBb0GoeQ';

// Validation pour éviter le crash "Invalid URL" si jamais la variable est vide
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (!isValidUrl(supabaseUrl)) {
  console.error("ERREUR CRITIQUE: L'URL Supabase est invalide.");
}

export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co', 
  supabaseKey
);
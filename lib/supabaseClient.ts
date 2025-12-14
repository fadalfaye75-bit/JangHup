import { createClient } from '@supabase/supabase-js';

// Configuration Supabase pour JàngHub
export const supabaseUrl = 'https://gddnyebjdsprkmaeijyw.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZG55ZWJqZHNwcmttYWVpanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTg3NTAsImV4cCI6MjA4MTIzNDc1MH0.kmxsY3mUyN592aLLs8Qy7bRrzKeQICuIuFSDXWoLP2c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lddfufxcrnqixfiyhrvc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZGZ1Znhjcm5xaXhmaXlocnZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMzQ0NTIsImV4cCI6MjA1NTkxMDQ1Mn0.iFp4F3zj6JnI2siIJ_CAef4M-33BKBgbHYMLCzR2Fxc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
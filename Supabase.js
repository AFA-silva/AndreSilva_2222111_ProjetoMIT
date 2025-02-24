import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rgxxbmvhuxwliqwzvwoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneHhibXZodXh3bGlxd3p2d29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjI3MzIsImV4cCI6MjA1NTk5ODczMn0.smO2ZGSANUI1d8pRpT4CimP3jqHIo4zqJ3SgMl_qQxk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
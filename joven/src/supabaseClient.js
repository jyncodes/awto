
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ojyapkmalpnfwskpozbx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeWFwa21hbHBuZndza3BvemJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mjk1MjMsImV4cCI6MjA3NTUwNTUyM30.gZYV9IOSUNIxnz5AVVPIQjA4D9Fl3Hk6ajEAx1HpEyI'
const supabase = createClient(supabaseUrl, supabaseKey)
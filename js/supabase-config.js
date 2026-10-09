// ==========================================
// AUREVIA - Configuração do Supabase
// ==========================================

const SUPABASE_URL = "https://jgamapbfexwhfpskjlzv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8ZMro3q10aPvlHgHq7CStA_dWOiGjz1";

// Inicializar o cliente Supabase (usando a biblioteca carregada via CDN)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
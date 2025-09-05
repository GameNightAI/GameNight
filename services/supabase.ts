import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure the URL has a protocol
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.startsWith('http')
  ? process.env.EXPO_PUBLIC_SUPABASE_URL
  : `https://${process.env.EXPO_PUBLIC_SUPABASE_URL}`;

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Safari-compatible storage wrapper
const safariCompatibleStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage setItem failed:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage removeItem failed:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safariCompatibleStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for web password reset flows
    flowType: 'pkce', // PKCE flow for better security and Safari compatibility
  },
  global: {
    headers: {
      'X-Client-Info': 'gamenyte-web',
    },
  },
});

// Safari-specific session recovery
export const initializeSupabaseSession = async () => {
  try {
    // Check if we have a session stored
    const session = await supabase.auth.getSession();

    if (session.data.session) {
      console.log('Session found, user is authenticated');
    } else {
      console.log('No session found, user is anonymous');
    }
  } catch (error) {
    console.warn('Error initializing Supabase session:', error);
  }
};

// Call initialization on import
initializeSupabaseSession();
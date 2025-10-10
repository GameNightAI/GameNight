import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting initial session:', error);
          // If there's an error getting the session, clear everything
          await handleAuthError(error);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        await clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', event, currentSession ? 'session exists' : 'no session');

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
            break;

          case 'SIGNED_OUT':
            console.log('User signed out');
            await clearAuthState();
            setLoading(false);
            break;

          case 'USER_UPDATED':
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            break;

          default:
            // For any other events, update the session
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Handle authentication errors
  const handleAuthError = async (error: AuthError) => {
    console.error('Authentication error detected:', {
      message: error.message,
      name: error.name,
      status: error.status,
    });

    // Check for refresh token errors
    if (
      error.message?.includes('refresh') ||
      error.message?.includes('Refresh Token') ||
      error.name === 'AuthApiError'
    ) {
      console.log('Token refresh failed - clearing auth state and signing out');
      await clearAuthState();

      // Sign out to ensure clean state
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error during sign out:', signOutError);
      }
    }
  };

  // Clear all auth-related state
  const clearAuthState = async () => {
    setSession(null);
    setUser(null);

    try {
      // Clear all Supabase auth keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key =>
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('sb-')
      );

      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('Cleared auth storage keys:', authKeys.length);
      }
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


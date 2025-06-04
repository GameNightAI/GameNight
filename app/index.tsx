import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/services/supabase';
import { LoadingState } from '@/components/LoadingState';

export default function Index() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    getSession();
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  // Changed the redirect path to point to the collection tab
  return <Redirect href="/(tabs)/collection" />;
}
import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/services/supabase';
import { LoadingState } from '@/components/LoadingState';
import { getLastVisitedTab } from '@/utils/storage';

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string>('/(tabs)/index');

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession) {
          // Get the last visited tab and redirect there
          const lastTab = await getLastVisitedTab();
          // Always default to index (tools) for now
          // TODO: Re-enable last tab navigation once tab conflicts are resolved
          setRedirectPath('/(tabs)/');
        }
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

  console.log('Redirecting to:', redirectPath);
  return <Redirect href={redirectPath as any} />;
}
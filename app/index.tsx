import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { getLastVisitedTab } from '@/utils/storage';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, loading } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string>('/(tabs)/index');

  useEffect(() => {
    async function setRedirect() {
      if (session) {
        // Get the last visited tab and redirect there
        const lastTab = await getLastVisitedTab();
        // Always default to index (tools) for now
        // TODO: Re-enable last tab navigation once tab conflicts are resolved
        setRedirectPath('/(tabs)/');
      }
    }

    setRedirect();
  }, [session]);

  if (loading) {
    return <LoadingState />;
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  console.log('Redirecting to:', redirectPath);
  return <Redirect href={redirectPath as any} />;
}
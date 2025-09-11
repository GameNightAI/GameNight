import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function ResetPasswordHandler() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const handleReset = async () => {
      addLog('🔍 Starting password reset handler...');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const fullUrl = window.location.href;
        addLog(`📍 Current URL: ${fullUrl}`);

        // Let's see what parameters we have
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const allParams: Record<string, string> = {};
        urlParams.forEach((value, key) => allParams[key] = value);
        hashParams.forEach((value, key) => allParams[key] = value);

        addLog(`🔑 Found parameters: ${Object.keys(allParams).join(', ')}`);

        if (allParams.error) {
          addLog(`❌ Error in URL: ${allParams.error}`);
          router.replace(`/auth/reset-password?error=${allParams.error}`);
          return;
        }

        // Check what we received
        if (allParams.access_token) {
          addLog('✅ Found access_token - this is implicit flow');
          await handleImplicitFlow(allParams);
        } else if (allParams.code) {
          addLog('✅ Found code - this is PKCE flow');
          await handlePKCEFlow(allParams.code);
        } else {
          addLog('❌ No access_token or code found');
          addLog(`Available params: ${JSON.stringify(allParams)}`);
          router.replace('/auth/reset-password?error=no_tokens');
        }
      }
    };

    const handleImplicitFlow = async (params: Record<string, string>) => {
      try {
        addLog('🔧 Using implicit flow with setSession...');

        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token || params.access_token
        });

        if (error) {
          addLog(`❌ setSession failed: ${error.message}`);
          router.replace('/auth/reset-password?error=session_failed');
          return;
        }

        if (data.session) {
          addLog(`✅ Session created! User: ${data.user?.email}`);
          router.replace('/auth/update-password');
        } else {
          addLog('❌ No session created');
          router.replace('/auth/reset-password?error=no_session');
        }
      } catch (err) {
        addLog(`💥 Implicit flow error: ${err}`);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handlePKCEFlow = async (code: string) => {
      try {
        addLog('🔧 Using PKCE flow with exchangeCodeForSession...');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          addLog(`❌ exchangeCodeForSession failed: ${error.message}`);
          router.replace('/auth/reset-password?error=code_exchange_failed');
          return;
        }

        if (data.session) {
          addLog(`✅ PKCE session created! User: ${data.user?.email}`);
          router.replace('/auth/update-password');
        } else {
          addLog('❌ No session from PKCE exchange');
          router.replace('/auth/reset-password?error=no_pkce_session');
        }
      } catch (err) {
        addLog(`💥 PKCE flow error: ${err}`);
        router.replace('/auth/reset-password?error=pkce_error');
      }
    };

    handleReset();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Password Reset</Text>
      <Text style={styles.subtitle}>Analyzing reset link...</Text>

      <View style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 20,
  },
  logContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    maxHeight: 400,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});
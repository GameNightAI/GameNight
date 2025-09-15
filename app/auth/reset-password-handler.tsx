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
      addLog('🔍 Processing password reset...');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Extract URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const allParams: Record<string, string> = {};
        urlParams.forEach((value, key) => allParams[key] = value);
        hashParams.forEach((value, key) => allParams[key] = value);

        addLog(`🔑 Parameters: ${Object.keys(allParams).join(', ')}`);

        if (allParams.error) {
          addLog(`❌ Error: ${allParams.error} (${allParams.error_code || 'no_code'})`);
          router.replace(`/auth/reset-password?error=${allParams.error}`);
          return;
        }

        // Process based on available tokens
        if (allParams.access_token) {
          addLog('✅ Using implicit flow');
          await handleImplicitFlow(allParams);
        } else if (allParams.code) {
          addLog('✅ Using PKCE flow');
          await handlePKCEFlow(allParams.code);
        } else {
          addLog('❌ No valid tokens found');
          router.replace('/auth/reset-password?error=no_tokens');
        }
      }
    };

    const handleImplicitFlow = async (params: Record<string, string>) => {
      try {
        addLog('🔧 Setting up session...');

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
          addLog(`✅ Session created for ${data.user?.email}`);
          router.replace('/auth/update-password');
        } else {
          addLog('❌ Session creation failed');
          router.replace('/auth/reset-password?error=no_session');
        }
      } catch (err) {
        addLog(`💥 Implicit flow error: ${err}`);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handlePKCEFlow = async (code: string) => {
      try {
        addLog('🔧 Exchanging code for session...');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          addLog(`❌ exchangeCodeForSession failed: ${error.message}`);
          router.replace('/auth/reset-password?error=code_exchange_failed');
          return;
        }

        if (data.session) {
          addLog(`✅ PKCE session created for ${data.user?.email}`);
          router.replace('/auth/update-password');
        } else {
          addLog('❌ PKCE session creation failed');
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
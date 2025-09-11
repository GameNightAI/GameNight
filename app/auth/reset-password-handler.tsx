import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';

export default function ResetPasswordHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev, info]);
  };

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        addDebugInfo('🔍 Starting PKCE password reset handler...');

        let allParams: Record<string, string> = {};

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const fullUrl = window.location.href;
          addDebugInfo(`📍 Full URL: ${fullUrl}`);

          // Extract ALL parameters from both search and hash
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));

          // Combine all parameters
          urlParams.forEach((value, key) => {
            allParams[key] = value;
          });
          hashParams.forEach((value, key) => {
            allParams[key] = value;
          });

          addDebugInfo(`🔑 All parameters: ${JSON.stringify(Object.keys(allParams))}`);
          addDebugInfo(`🔍 Parameter details:
            - code: ${allParams.code ? 'present' : 'missing'}
            - access_token: ${allParams.access_token ? 'present' : 'missing'}
            - type: ${allParams.type || 'none'}
            - error: ${allParams.error || 'none'}`);
        }

        // Handle errors first
        if (allParams.error) {
          addDebugInfo(`❌ URL contains error: ${allParams.error}`);
          router.replace(`/auth/reset-password?error=${allParams.error}`);
          return;
        }

        // PKCE flow - look for 'code' parameter
        if (allParams.code) {
          addDebugInfo('🎯 PKCE flow detected (code parameter present)');
          await handlePKCEFlow(allParams.code);
          return;
        }

        // Implicit flow fallback - look for access_token
        if (allParams.access_token && allParams.type === 'recovery') {
          addDebugInfo('🎯 Implicit flow detected (access_token present)');
          await handleImplicitFlow(allParams);
          return;
        }

        // No valid parameters found
        addDebugInfo('❌ No valid reset parameters found');
        addDebugInfo(`Available parameters: ${Object.keys(allParams).join(', ')}`);
        router.replace('/auth/reset-password?error=no_tokens');

      } catch (err) {
        addDebugInfo(`💥 Unexpected error: ${err}`);
        console.error('Error in password reset handler:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handlePKCEFlow = async (code: string) => {
      try {
        addDebugInfo('🔧 Verifying OTP token for password reset...');

        // Use verifyOtp for password reset tokens (not PKCE exchange)
        const { data, error } = await supabase.auth.verifyOtp({
          token: code,
          type: 'recovery'
        });

        if (error) {
          addDebugInfo(`❌ OTP verification failed: ${error.message}`);
          console.error('OTP verification error:', error);
          router.replace('/auth/reset-password?error=invalid_code');
          return;
        }

        if (!data.session || !data.user) {
          addDebugInfo('❌ No session created from PKCE exchange');
          router.replace('/auth/reset-password?error=missing_session');
          return;
        }

        addDebugInfo(`✅ OTP verified, session created for user: ${data.user.id}`);
        addDebugInfo(`Session expires: ${data.session.expires_at}`);

        // Verify the session is working
        const { data: userCheck, error: userError } = await supabase.auth.getUser();
        if (userError || !userCheck.user) {
          addDebugInfo(`❌ Session verification failed: ${userError?.message}`);
          router.replace('/auth/reset-password?error=session_verification_failed');
          return;
        }

        addDebugInfo('✅ Session verified successfully, redirecting...');
        setStatus('success');

        // Small delay to show success message
        setTimeout(() => {
          router.replace('/auth/update-password');
        }, 1000);

      } catch (err) {
        addDebugInfo(`💥 Error in PKCE flow: ${err}`);
        console.error('PKCE flow error:', err);
        router.replace('/auth/reset-password?error=pkce_error');
      }
    };

    const handleImplicitFlow = async (params: Record<string, string>) => {
      try {
        addDebugInfo('🔧 Setting up implicit flow session...');

        // Clear any existing session first
        await supabase.auth.signOut();
        await new Promise(resolve => setTimeout(resolve, 200));

        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token || params.access_token
        });

        if (error) {
          addDebugInfo(`❌ setSession error: ${error.message}`);
          router.replace('/auth/reset-password?error=invalid_link');
          return;
        }

        if (!data.session || !data.user) {
          addDebugInfo('❌ No session created from setSession');
          router.replace('/auth/reset-password?error=missing_session');
          return;
        }

        addDebugInfo(`✅ Implicit session created for user: ${data.user.id}`);

        // Verify the session works
        const { data: userCheck, error: userError } = await supabase.auth.getUser();
        if (userError || !userCheck.user) {
          addDebugInfo(`❌ Session verification failed: ${userError?.message}`);
          router.replace('/auth/reset-password?error=session_verification_failed');
          return;
        }

        addDebugInfo('✅ Session verified, redirecting...');
        setStatus('success');

        setTimeout(() => {
          router.replace('/auth/update-password');
        }, 1000);

      } catch (err) {
        addDebugInfo(`💥 Error in implicit flow: ${err}`);
        router.replace('/auth/reset-password?error=session_error');
      }
    };

    handlePasswordReset();
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Password Reset</Text>
      <Text style={styles.subtitle}>
        {status === 'processing' ? 'Please wait while we verify your reset link...' :
          status === 'success' ? 'Reset link verified! Redirecting...' : 'Processing...'}
      </Text>

      {/* Debug information - remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          {debugInfo.slice(-10).map((info, index) => (
            <Text key={index} style={styles.debugText}>
              {info}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 24,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 24,
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    maxHeight: 400,
  },
  debugTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
});
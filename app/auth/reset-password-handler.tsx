import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';

export default function ResetPasswordHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        setStatus('processing');
        let access_token: string | null = null;
        let refresh_token: string | null = null;
        let type: string | null = null;
        let code: string | null = null; // PKCE code fallback

        // Enhanced URL parameter extraction
        if (Platform.OS === 'web') {
          try {
            if (typeof window !== 'undefined') {
              console.log('Full URL:', window.location.href);
              console.log('Search params:', window.location.search);
              console.log('Hash params:', window.location.hash);

              // Use both hash and search params for better compatibility
              const urlParams = new URLSearchParams(window.location.search);
              const hashParams = new URLSearchParams(window.location.hash.substring(1));

              access_token = urlParams.get('access_token') || hashParams.get('access_token');
              refresh_token = urlParams.get('refresh_token') || hashParams.get('refresh_token');
              type = urlParams.get('type') || hashParams.get('type');
              code = urlParams.get('code') || hashParams.get('code');

              console.log('Web platform tokens:', {
                access_token: !!access_token,
                refresh_token: !!refresh_token,
                type,
                access_token_length: access_token?.length || 0,
                refresh_token_length: refresh_token?.length || 0,
                has_code: !!code
              });
            }
          } catch (error) {
            console.warn('Could not parse URL parameters:', error);
          }
        } else {
          // Mobile platform handling
          const initialURL = await Linking.getInitialURL();
          if (initialURL) {
            try {
              const url = new URL(initialURL);
              access_token = url.searchParams.get('access_token');
              refresh_token = url.searchParams.get('refresh_token');
              type = url.searchParams.get('type');
              code = url.searchParams.get('code');

              console.log('Mobile platform tokens:', { access_token: !!access_token, refresh_token: !!refresh_token, type });
            } catch (error) {
              console.error('Error parsing mobile URL:', error);
            }
          }

          // Listen for incoming links
          const subscription = Linking.addEventListener('url', (event) => {
            try {
              const url = new URL(event.url);
              const mobileAccessToken = url.searchParams.get('access_token');
              const mobileRefreshToken = url.searchParams.get('refresh_token');
              const mobileType = url.searchParams.get('type');

              if (mobileType === 'recovery' && mobileAccessToken) {
                handlePasswordResetFlow(mobileAccessToken, mobileRefreshToken);
              }
            } catch (error) {
              console.error('Error handling mobile deep link:', error);
            }
          });

          return () => subscription?.remove();
        }

        // Validate tokens and proceed with reset flow
        if (type === 'recovery' && access_token) {
          console.log('Valid recovery tokens found, proceeding with reset flow');
          await handlePasswordResetFlow(access_token, refresh_token);
        } else if (code) {
          // PKCE code flow fallback (Supabase may send a code instead of tokens)
          console.log('PKCE code detected, exchanging for session');
          const exchangeResult = await handlePkceCodeFlow(code);
          if (!exchangeResult) {
            router.replace('/auth/reset-password?error=invalid_link');
            return;
          }
          console.log('PKCE exchange succeeded, redirecting to update password');
          setTimeout(() => {
            router.replace('/auth/update-password');
          }, 100);
        } else {
          console.log('No valid recovery tokens found:', {
            type,
            hasAccessToken: !!access_token,
            access_token_value: access_token ? access_token.substring(0, 20) + '...' : 'null',
            refresh_token_value: refresh_token ? refresh_token.substring(0, 20) + '...' : 'null'
          });
          router.replace('/auth/reset-password?error=no_tokens');
        }
      } catch (err) {
        console.error('Error handling password reset:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handlePasswordResetFlow = async (accessToken: string, refreshToken: string | null) => {
      try {
        console.log('Setting session with tokens');

        // Set the session with the tokens from URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          router.replace('/auth/reset-password?error=invalid_link');
          return;
        }

        if (!data.session) {
          console.error('No session created despite no error');
          router.replace('/auth/reset-password?error=missing_session');
          return;
        }

        console.log('Session established successfully, redirecting to update password');
        // Add a small delay to ensure session is fully established
        setTimeout(() => {
          router.replace('/auth/update-password');
        }, 100);

      } catch (err) {
        console.error('Error in password reset flow:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    // Handle PKCE code exchange for session
    const handlePkceCodeFlow = async (pkceCode: string): Promise<boolean> => {
      try {
        console.log('Attempting PKCE code exchange for code:', pkceCode.substring(0, 20) + '...');

        // Use the correct Supabase PKCE exchange method
        const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);

        if (error) {
          console.error('PKCE exchange error:', error);
          return false;
        }

        if (!data?.session) {
          console.error('PKCE exchange returned no session');
          return false;
        }

        console.log('PKCE exchange successful, session established for user:', data.session.user?.id);
        return true;
      } catch (err) {
        console.error('Error during PKCE exchange:', err);
        return false;
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
        {Platform.OS === 'web'
          ? 'Please wait while we verify your reset link...'
          : 'Please wait while we process your password reset...'
        }
      </Text>
      {status === 'processing' && (
        <Text style={styles.statusText}>Verifying authentication tokens...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  statusText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
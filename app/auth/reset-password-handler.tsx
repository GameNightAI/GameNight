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
        console.log('Starting password reset handler...');

        let access_token: string | null = null;
        let refresh_token: string | null = null;
        let type: string | null = null;

        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            console.log('Full URL:', window.location.href);

            // Parse URL parameters from both search and hash
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));

            access_token = urlParams.get('access_token') || hashParams.get('access_token');
            refresh_token = urlParams.get('refresh_token') || hashParams.get('refresh_token');
            type = urlParams.get('type') || hashParams.get('type');

            console.log('Extracted tokens:', {
              hasAccessToken: !!access_token,
              hasRefreshToken: !!refresh_token,
              type: type,
              accessTokenLength: access_token?.length || 0
            });
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

              console.log('Mobile tokens extracted:', {
                hasAccessToken: !!access_token,
                hasRefreshToken: !!refresh_token,
                type: type
              });
            } catch (error) {
              console.error('Error parsing mobile URL:', error);
            }
          }

          // Listen for incoming links
          const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
          });

          return () => subscription?.remove();
        }

        // Proceed with session establishment
        await establishSession(access_token, refresh_token, type);

      } catch (err) {
        console.error('Error in password reset handler:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handleDeepLink = async (url: string) => {
      try {
        const urlObj = new URL(url);
        const access_token = urlObj.searchParams.get('access_token');
        const refresh_token = urlObj.searchParams.get('refresh_token');
        const type = urlObj.searchParams.get('type');

        if (type === 'recovery' && access_token) {
          await establishSession(access_token, refresh_token, type);
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    const establishSession = async (accessToken: string | null, refreshToken: string | null, type: string | null) => {
      try {
        // Validate we have the required tokens
        if (type !== 'recovery' || !accessToken) {
          console.log('Invalid tokens for recovery:', { type, hasAccessToken: !!accessToken });
          router.replace('/auth/reset-password?error=no_tokens');
          return;
        }

        console.log('Attempting to set session with tokens...');

        // Clear any existing session first
        await supabase.auth.signOut();

        // Wait a moment for sign out to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Set the new session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken
        });

        if (error) {
          console.error('Error setting session:', error);
          router.replace('/auth/reset-password?error=invalid_link');
          return;
        }

        if (!data.session || !data.user) {
          console.error('No session or user created');
          router.replace('/auth/reset-password?error=missing_session');
          return;
        }

        console.log('Session established successfully for user:', data.user.id);
        console.log('Session expires at:', data.session.expires_at);

        // Verify session is actually working
        const { data: sessionCheck, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !sessionCheck.user) {
          console.error('Session verification failed:', sessionError);
          router.replace('/auth/reset-password?error=session_verification_failed');
          return;
        }

        console.log('Session verified, redirecting to update password...');

        // Redirect to update password page
        router.replace('/auth/update-password');

      } catch (err) {
        console.error('Error establishing session:', err);
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
        Please wait while we verify your reset link...
      </Text>
      <Text style={styles.statusText}>
        {status === 'processing' ? 'Verifying authentication tokens...' : 'Redirecting...'}
      </Text>
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
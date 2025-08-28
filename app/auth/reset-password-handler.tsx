import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';

export default function ResetPasswordHandler() {
  const router = useRouter();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        let access_token: string | null = null;
        let refresh_token: string | null = null;
        let type: string | null = null;

        if (Platform.OS === 'web') {
          // Web platform: use URL search parameters
          const urlParams = new URLSearchParams(window.location.search);
          access_token = urlParams.get('access_token');
          refresh_token = urlParams.get('refresh_token');
          type = urlParams.get('type');
        } else {
          // Mobile platform: use expo-linking to get the initial URL
          const initialURL = await Linking.getInitialURL();
          if (initialURL) {
            const url = new URL(initialURL);
            access_token = url.searchParams.get('access_token');
            refresh_token = url.searchParams.get('refresh_token');
            type = url.searchParams.get('type');
          }

          // Also listen for incoming links (in case the app is already open)
          const subscription = Linking.addEventListener('url', (event) => {
            const url = new URL(event.url);
            const mobileAccessToken = url.searchParams.get('access_token');
            const mobileRefreshToken = url.searchParams.get('refresh_token');
            const mobileType = url.searchParams.get('type');

            if (mobileType === 'recovery' && mobileAccessToken) {
              handleMobilePasswordReset(mobileAccessToken, mobileRefreshToken);
            }
          });

          // Cleanup subscription
          return () => subscription?.remove();
        }

        // Handle the password reset flow
        if (type === 'recovery' && access_token) {
          await handlePasswordResetFlow(access_token, refresh_token);
        } else {
          // No valid recovery tokens, redirect to reset password page
          router.replace('/auth/reset-password?error=no_tokens');
        }
      } catch (err) {
        console.error('Error handling password reset:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handlePasswordResetFlow = async (accessToken: string, refreshToken: string | null) => {
      try {
        // Set the session with the tokens from URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          // Redirect to reset password page with error
          router.replace('/auth/reset-password?error=invalid_link');
          return;
        }

        // Successfully authenticated, redirect to update password
        router.replace('/auth/update-password');
      } catch (err) {
        console.error('Error in password reset flow:', err);
        router.replace('/auth/reset-password?error=unexpected_error');
      }
    };

    const handleMobilePasswordReset = async (accessToken: string, refreshToken: string | null) => {
      await handlePasswordResetFlow(accessToken, refreshToken);
    };

    handlePasswordReset();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Password Reset</Text>
      <Text style={styles.subtitle}>
        {Platform.OS === 'web'
          ? 'Please wait while we verify your reset link...'
          : 'Please wait while we process your password reset...'
        }
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
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
  },
});

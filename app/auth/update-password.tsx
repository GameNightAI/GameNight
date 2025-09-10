import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/services/supabase';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setCheckingAuth(true);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setError('Authentication error. Please try the reset link again.');
          return;
        }

        if (session && session.user) {
          console.log('Valid session found for user:', session.user.id);
          setIsAuthenticated(true);
        } else {
          console.log('No valid session found, checking for URL parameters');

          // Fallback: Check for authentication tokens in URL parameters
          let access_token: string | null = null;
          let refresh_token: string | null = null;

          if (Platform.OS === 'web') {
            // Web platform: check URL parameters
            try {
              const urlParams = new URLSearchParams(
                typeof window !== 'undefined' ? window.location.search : ''
              );
              access_token = urlParams.get('access_token');
              refresh_token = urlParams.get('refresh_token');
            } catch (error) {
              console.warn('Could not parse URL parameters:', error);
            }
          } else {
            // Mobile platform: check for deep link parameters
            const initialURL = await Linking.getInitialURL();
            if (initialURL) {
              const url = new URL(initialURL);
              access_token = url.searchParams.get('access_token');
              refresh_token = url.searchParams.get('refresh_token');
            }
          }

          if (access_token) {
            console.log('Found access token in URL, setting session');
            // Set the session with the tokens from URL
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token: refresh_token || access_token
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              setError('Invalid reset link. Please request a new password reset.');
            } else {
              console.log('Session established from URL parameters');
              setIsAuthenticated(true);
            }
          } else {
            console.log('No valid session or tokens found');
            setError('No valid session found. Please use the password reset link from your email.');
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setCheckingAuth(false);
      }
    };

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, !!session);
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setCheckingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    checkAuthStatus();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verifying Reset Link</Text>
        <Text style={styles.subtitle}>
          Please wait while we verify your password reset link...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Reset Link Required</Text>
        <Text style={styles.errorText}>
          {error || 'Please use the password reset link from your email to access this page.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/auth/reset-password')}
        >
          <Text style={styles.buttonText}>Request New Reset Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleUpdatePassword = async () => {
    // Add haptic feedback for mobile
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Validation
    if (!password.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Updating user password');

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        setError(error.message);
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: error.message
        });
      } else if (data.user) {
        console.log('Password updated successfully for user:', data.user.id);
        setSuccess(true);
        Toast.show({
          type: 'success',
          text1: 'Password Updated',
          text2: 'You can now log in with your new password.'
        });

        // Clear the session after successful password update
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login?message=password_updated');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected error updating password:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Unexpected Error',
        text2: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>Enter your new password below.</Text>

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="New password"
        secureTextEntry
        autoComplete="new-password"
      />

      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm new password"
        secureTextEntry
        autoComplete="new-password"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>Password updated! Redirecting to login...</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUpdatePassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => router.replace('/auth/login')}
      >
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 24,
    justifyContent: 'center',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    color: '#27ae60',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  backText: {
    color: '#1a2b5f',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textDecorationLine: 'underline',
  },
});
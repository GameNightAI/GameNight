import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  // Check for error parameters from redirects
  useEffect(() => {
    const errorParam = params.error as string;
    if (errorParam) {
      switch (errorParam) {
        case 'invalid_link':
          setError('The password reset link is invalid or has expired. Please request a new one.');
          break;
        case 'no_tokens':
          setError('No valid reset tokens found. Please use the link from your email.');
          break;
        case 'unexpected_error':
          setError('An unexpected error occurred. Please try again.');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    }
  }, [params.error]);

  if (!fontsLoaded) {
    return null;
  }

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Clear any existing session before sending reset email
      // This ensures the user goes through the full reset flow each time
      await supabase.auth.signOut();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password-handler',
      });
      if (error) {
        setError(error.message);
        Toast.show({ type: 'error', text1: 'Reset Failed', text2: error.message });
      } else {
        setSuccess(true);
        Toast.show({ type: 'success', text1: 'Reset Email Sent', text2: 'Check your inbox for instructions.' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      Toast.show({ type: 'error', text1: 'Unexpected Error', text2: err instanceof Error ? err.message : 'Failed to send reset email' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive a password reset link.</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>Reset email sent! Check your inbox.</Text>}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/auth/login')}>
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
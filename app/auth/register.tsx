import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { UserPlus } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { supabase } from '@/services/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }


  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Platform.OS === 'web' ? window.location.origin : 'gamenyte://auth/callback',
          data: {
            email_confirm: true,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          Toast.show({
            type: 'error',
            text1: 'Email Already In Use',
            text2: 'Please try logging in instead.',
          });
          setError('This email is already in use.');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: error.message || 'Something went wrong.',
          });
          setError(error.message || 'Failed to create account');
        }
      } else {
        Toast.show({
          type: 'success',
          text1: 'Account Created!',
        });

        // Delay redirect slightly to show toast
        setTimeout(() => {
          router.replace('/collection');
        }, 1500);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Unexpected Error',
        text2: err instanceof Error ? err.message : 'Something went wrong.',
      });
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(600)}
        style={styles.header}
      >
        <Image
          source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
          style={styles.backgroundImage}
        />
        <View style={styles.overlay} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>GameNyte</Text>
          <Text style={styles.subtitle}>
            The ultimate tool for organizing{'\n'}your next game night
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(300).duration(600)}
        style={styles.formContainer}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Choose a password"
            secureTextEntry
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <UserPlus color="#fff" size={20} />
          <Text style={styles.buttonText}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <Link href="/auth/login" asChild>
          <TouchableOpacity style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.signInText}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.85)',
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
    maxWidth: 280,
  },
  formContainer: {
    flex: 1,
    padding: 24,
    marginTop: -30,
    backgroundColor: '#f7f9fc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontFamily: 'Poppins-Regular',
  },
  button: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 12,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#1a2b5f',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  signInText: {
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-SemiBold',
  },
});
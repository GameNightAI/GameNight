import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { LogIn } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { supabase } from '@/services/supabase';

export default function LoginScreen() {
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

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sign in');
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
        <Text style={styles.title}>GameNyte</Text>
        <Text style={styles.subtitle}>The ultimate tool for organizing your next game night</Text>
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
            placeholder="Enter your password"
            secureTextEntry
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <LogIn color="#fff" size={20} />
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <Link href="/auth/register" asChild>
          <TouchableOpacity style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account? Create one
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
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    opacity: 0.9,
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
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#1a2b5f',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
});
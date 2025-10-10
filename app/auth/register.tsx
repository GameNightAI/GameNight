//On Android, test if the keyboard covers the form when the user taps on a text input - we can add behavior="height" to handle the issue

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/services/supabase';
import { useTheme } from '@/hooks/useTheme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { colors, typography, touchTargets, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = getStyles(colors, typography, isDark);

  const handleContinue = async () => {
    try {
      setLoading(true);
      setError(null);

      // Basic validation
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (password.length > 72) {
        setError('Password must be less than 72 characters');
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Check if account exists but profile is incomplete
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email,
        password,
      }).then(async (result) => {
        if (result.error) return { data: null, error: result.error };
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', result.data.user.id)
          .maybeSingle();
        if (!profile || !profile.username) {
          // Account exists but profile incomplete - resume flow
          return { data: { user: result.data.user, resume: true }, error: null };
        }
        return { data: null, error: { message: 'Account already exists and is complete' } };
      }).catch(() => ({ data: null, error: { message: 'Invalid credentials' } }));

      if (existingUser?.resume) {
        // Resume incomplete registration
        router.push({
          pathname: '/auth/register-profile',
          params: {
            email,
            password,
            userId: existingUser.user.id
          }
        });
        return;
      }

      if (existingUser && !existingUser.resume) {
        setError('Account already exists and is complete. Please sign in instead.');
        return;
      }

      // Attempt to create the user account first to check for email duplicates
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Platform.OS === 'web' ? window.location.origin : 'klack://auth/callback',
          data: {
            email_confirm: true,
          },
        },
      });

      if (authError) {
        console.log('Auth error:', authError);

        // Handle specific error cases by status code first
        if (authError.status === 422) {
          // 422 Unprocessable Entity - email already registered or validation error
          if (authError.message.includes('already registered') ||
            authError.message.includes('User already registered') ||
            authError.message.includes('duplicate key value')) {
            setError('This email is already registered. Please try logging in instead.');
            return;
          } else {
            setError('Invalid email or password format. Please check your input.');
            return;
          }
        } else if (authError.status === 400) {
          // 400 Bad Request - malformed request
          setError('Invalid request. Please check your input and try again.');
          return;
        } else if (authError.status === 429) {
          // 429 Too Many Requests - rate limiting
          setError('Too many attempts. Please wait a moment and try again.');
          return;
        } else if (authError.status && typeof authError.status === 'number' && authError.status >= 500) {
          // 5xx Server Errors
          setError('Server error. Please try again later.');
          return;
        } else if (authError.message.includes('Password should be at least')) {
          // Server-side password validation
          setError('Password must be at least 6 characters long.');
          return;
        } else if (authError.message.includes('Invalid email')) {
          // Server-side email validation
          setError('Please enter a valid email address.');
          return;
        } else {
          // Generic fallback
          setError(authError.message || 'Failed to create account. Please try again.');
          return;
        }
      }

      // If successful, store the user ID and proceed to profile completion
      if (authData.user) {
        router.push({
          pathname: '/auth/register-profile',
          params: {
            email,
            password,
            userId: authData.user.id
          }
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 20} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>👥</Text>
            </View>
            <Text style={styles.title}>Klack</Text>
          </View>
          <Text style={styles.subtitle}>
            The ultimate tool for organizing your next game night
          </Text>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Enter your email and password to get started</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Mail color={colors.textMuted} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  accessibilityLabel="Email address"
                  accessibilityHint="Enter your email address"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock color={colors.textMuted} size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Choose a password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  accessibilityLabel="Password"
                  accessibilityHint="Enter your password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={touchTargets.standard}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                >
                  {showPassword ? (
                    <EyeOff color={colors.textMuted} size={20} />
                  ) : (
                    <Eye color={colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              hitSlop={touchTargets.standard}
              onPress={handleContinue}
              disabled={loading}
              accessibilityLabel={loading ? "Validating account" : "Continue to profile setup"}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>
                {loading ? 'Validating...' : 'Continue'}
              </Text>
              <ArrowRight color={colors.card} size={20} />
            </TouchableOpacity>

            <Link href="/auth/login" asChild>
              <TouchableOpacity style={styles.loginLink} hitSlop={touchTargets.standard}>
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.signInText}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, typography: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? colors.background : colors.tints.neutral,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.card,
  },
  logoText: {
    fontSize: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    color: colors.text,
    fontSize: typography.fontSize.title1,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
    maxWidth: 280,
    color: colors.text,
    fontSize: typography.fontSize.body,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontFamily: typography.getFontFamily('bold'),
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text,
    fontSize: typography.fontSize.title2,
  },
  formSubtitle: {
    fontFamily: typography.getFontFamily('normal'),
    textAlign: 'center',
    marginBottom: 32,
    color: colors.textMuted,
    fontSize: typography.fontSize.body,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: typography.getFontFamily('semibold'),
    marginBottom: 8,
    color: colors.text,
    fontSize: typography.fontSize.caption1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: typography.getFontFamily('normal'),
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: typography.fontSize.footnote,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: typography.getFontFamily('semibold'),
    marginRight: 8,
    color: colors.card,
    fontSize: typography.fontSize.callout,
  },
  errorText: {
    fontFamily: typography.getFontFamily('normal'),
    marginBottom: 12,
    textAlign: 'center',
    color: colors.error,
    fontSize: typography.fontSize.caption1,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontFamily: typography.getFontFamily('normal'),
    color: colors.textMuted,
    fontSize: typography.fontSize.caption1,
  },
  signInText: {
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.primary,
  },
});
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthLayout() {
  const { colors, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: colors.primary,
        // iOS shadow
        ...(Platform.OS === 'ios' && {
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.2,
          shadowRadius: 2,
        }),
      },
      headerTintColor: colors.card,
      headerTitleStyle: {
        fontFamily: typography.getFontFamily('semibold'),
        fontSize: typography.fontSize.body,
        fontWeight: '600',
      },
      // Safe area handling
      contentStyle: {
        paddingTop: insets.top,
      },
    }}>
      <Stack.Screen
        name="login"
        options={{
          title: 'Welcome Back',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Reset Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="update-password"
        options={{
          title: 'Set New Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register-profile"
        options={{
          title: 'Complete Profile',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
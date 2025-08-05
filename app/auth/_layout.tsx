import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#1a2b5f' },
      headerTintColor: '#ffffff',
      headerTitleStyle: { fontFamily: 'Poppins-SemiBold' },
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
    </Stack>
  );
}
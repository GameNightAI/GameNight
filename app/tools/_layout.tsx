import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export default function ToolsLayout() {
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.card,
        headerTitleStyle: {
          fontFamily: typography.getFontFamily('semibold'),
          fontSize: typography.fontSize.headline,
        },
        headerBackTitle: Platform.OS === 'ios' ? 'Tools' : '',
        presentation: 'card',
        animation: 'slide_from_right',
        // Navigation and accessibility props
        gestureEnabled: true, // Enable swipe gestures for navigation
        gestureDirection: 'horizontal', // Natural swipe direction
      }}
    >
      <Stack.Screen
        name="first-player"
        options={{
          title: 'First Player Select',
          headerShown: true,
          headerBackTitle: Platform.OS === 'ios' ? 'Tools' : '',
        }}
      />
      <Stack.Screen
        name="digital-dice"
        options={{
          title: 'Digital Dice',
          headerShown: true,
          headerBackTitle: Platform.OS === 'ios' ? 'Tools' : '',
        }}
      />
      <Stack.Screen
        name="score-tracker"
        options={{
          title: 'Score Tracker',
          headerShown: true,
          headerBackTitle: Platform.OS === 'ios' ? 'Tools' : '',
        }}
      />
    </Stack>
  );
}
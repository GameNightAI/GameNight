import { Stack } from 'expo-router';

export default function ToolsLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#1a2b5f' },
      headerTintColor: '#ffffff',
      headerTitleStyle: { fontFamily: 'Poppins-SemiBold' },
    }}>
      <Stack.Screen
        name="first-player"
        options={{
          title: 'First Player Select',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
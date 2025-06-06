import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shuffle, Library, User, Vote } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#ff9654',
        tabBarInactiveTintColor: '#8d8d8d',
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: Math.max(8, insets.bottom) }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
      }}>
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ color, size }) => (
            <Library color={color} size={size} />
          ),
          headerTitle: 'My Collection',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'First Player',
          tabBarIcon: ({ color, size }) => (
            <Shuffle color={color} size={size} />
          ),
          headerTitle: 'Select First Player',
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          title: 'Polls',
          tabBarIcon: ({ color, size }) => (
            <Vote color={color} size={size} />
          ),
          headerTitle: 'Game Polls',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
          headerTitle: 'User Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a2b5f',
    borderTopWidth: 0,
    elevation: 0,
    height: 60,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#1a2b5f',
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Library, User, Vote, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { saveLastVisitedTab, getLastVisitedTab } from '@/utils/storage';

const EVENTS_SCREEN = false; // Set to true to show events screen

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [initialTab, setInitialTab] = useState<string | null>(null);

  // Use fallback values for web platform
  const safeAreaBottom = Platform.OS === 'web' ? 0 : insets.bottom;

  useEffect(() => {
    // Load the last visited tab on component mount
    const loadLastTab = async () => {
      const lastTab = await getLastVisitedTab();
      if (lastTab) {
        setInitialTab(lastTab);
      } else {
        // If no last tab is saved, default to index (tools) and save it
        setInitialTab('index');
        saveLastVisitedTab('index');
      }
    };
    loadLastTab();
  }, []);

  const handleTabPress = (tabName: string) => {
    // Save the current tab when user switches tabs
    saveLastVisitedTab(tabName);
  };

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#ff9654',
        tabBarInactiveTintColor: '#8d8d8d',
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(8, safeAreaBottom),
            height: 60 + Math.max(8, safeAreaBottom)
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
      }}
      screenListeners={{
        tabPress: (e) => {
          // Get the tab name from the event target
          const routeName = e.target;

          // Try to extract tab name from the route
          let tabName = 'index'; // default

          if (routeName) {
            // Try different approaches to extract the tab name
            const routeParts = routeName.split('/');
            const lastPart = routeParts[routeParts.length - 1];

            // Check if the last part is a valid tab name
            if (['collection', 'index', 'polls', 'profile'].includes(lastPart)) {
              tabName = lastPart;
            } else {
              // Fallback to string matching
              if (routeName.includes('collection')) tabName = 'collection';
              else if (routeName.includes('index') || routeName.includes('tools')) tabName = 'index';
              else if (routeName.includes('polls')) tabName = 'polls';
              else if (routeName.includes('profile')) tabName = 'profile';
            }
          }

          handleTabPress(tabName);
        },
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
          title: 'Tools',
          tabBarIcon: ({ color, size }) => (
            <Wrench color={color} size={size} />
          ),
          headerTitle: 'Game Tools',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} />
          ),
          headerTitle: 'Schedule Events',
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
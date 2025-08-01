import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Library, User, Vote, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { saveLastVisitedTab, getLastVisitedTab } from '@/utils/storage';

const EVENTS_SCREEN = false; // Set to true to show events screen

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [initialTab, setInitialTab] = useState<string | null>(null);

  useEffect(() => {
    // Load the last visited tab on component mount
    const loadLastTab = async () => {
      const lastTab = await getLastVisitedTab();
      if (lastTab) {
        setInitialTab(lastTab);
      } else {
        // If no last tab is saved, default to collection and save it
        setInitialTab('collection');
        saveLastVisitedTab('collection');
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
      }}
      initialRouteName={initialTab || undefined}
      screenListeners={{
        tabPress: (e) => {
          // Extract tab name from the target route
          const routeName = e.target;
          let tabName = 'collection'; // default

          if (routeName) {
            if (routeName.includes('collection')) tabName = 'collection';
            else if (routeName.includes('index')) tabName = 'index';
            else if (routeName.includes('polls')) tabName = 'polls';
            else if (routeName.includes('profile')) tabName = 'profile';
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
      {EVENTS_SCREEN && <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} />
          ),
          headerTitle: 'Schedule Events',
        }}
      />}
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
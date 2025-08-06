import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Shuffle, Dice6, Trophy } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { getLastVisitedTab } from '@/utils/storage';

const { height: screenHeight } = Dimensions.get('window');

export default function ToolsScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/(tabs)/collection');

  useEffect(() => {
    // Check if this is the default route and redirect to the appropriate tab
    const checkAndRedirect = async () => {
      const lastTab = await getLastVisitedTab();
      if (lastTab && lastTab !== 'index') {
        setRedirectTo(`/(tabs)/${lastTab}`);
      }
      setShouldRedirect(true);
    };
    checkAndRedirect();
  }, []);

  if (shouldRedirect) {
    return <Redirect href={redirectTo as any} />;
  }
  const router = useRouter();

  const tools = [
    {
      id: 'first-player',
      title: 'First Player Select',
      description: 'Randomly select who goes first',
      icon: Shuffle,
      color: '#ff9654',
      backgroundColor: '#fff5ef',
      onPress: () => router.push('/tools/first-player'),
    },
    {
      id: 'digital-dice',
      title: 'Digital Dice',
      description: 'Roll virtual dice for your games',
      icon: Dice6,
      color: '#10b981',
      backgroundColor: '#ecfdf5',
      onPress: () => router.push('/tools/digital-dice'),
    },
    {
      id: 'score-tracker',
      title: 'Score Tracker',
      description: 'Keep track of player scores',
      icon: Trophy,
      color: '#8b5cf6',
      backgroundColor: '#f3f4f6',
      onPress: () => router.push('/tools/score-tracker'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* Header Section with Background */}
      <View style={styles.headerSection}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
          style={styles.backgroundImage}
        />
        <View style={styles.overlay} />

        <View style={styles.headerContent}>
          {/*<Text style={styles.title}>Game Tools</Text>*/}
          <Text style={styles.subtitle}>Useful utilities for your board game sessions</Text>
        </View>
      </View>

      {/* Tools Content Section */}
      <View style={styles.toolsSection}>
        {tools.map((tool, index) => {
          const IconComponent = tool.icon;

          return (
            <Animated.View
              key={tool.id}
              entering={FadeIn.delay(index * 150).duration(400)}
              style={styles.toolCard}
            >
              <TouchableOpacity
                style={[styles.toolButton, { backgroundColor: tool.backgroundColor }]}
                onPress={tool.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.toolIconContainer}>
                  <IconComponent size={32} color={tool.color} />
                </View>

                <View style={styles.toolContent}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>

                <View style={styles.toolArrow}>
                  <View style={[styles.arrowIcon, { backgroundColor: tool.color }]} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: screenHeight,
  },
  headerSection: {
    height: Math.max(110, screenHeight * 0.1), // Reduced height slightly
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 43, 95, 0.85)',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 0, // Reduced from 40 to 20
    alignItems: 'flex-start',
    zIndex: 1,
  },
  /*title: {
    fontFamily: 'Poppins-Bold',
    fontSize: Math.min(32, screenHeight * 0.04), // Responsive font size
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },*/
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: Math.min(16, screenHeight * 0.02), // Responsive font size
    color: '#ffffff',
    textAlign: 'left',
    paddingTop: 0,
    opacity: 0.9,
    lineHeight: 22,
    // maxWidth: 300,
    marginTop: 30, // Shift up by about 20 units
  },
  toolsSection: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: screenHeight * 0.6, // Ensure minimum height for content
  },
  toolCard: {
    marginBottom: 16,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 80, // Ensure consistent height
  },
  toolIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolContent: {
    flex: 1,
    paddingRight: 12,
  },
  toolTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
    lineHeight: 22,
  },
  toolDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  toolArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
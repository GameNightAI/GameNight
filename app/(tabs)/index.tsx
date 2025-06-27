import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Shuffle, Dice6, Trophy } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ToolsScreen() {
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
      onPress: () => {
        // TODO: Implement digital dice functionality
        console.log('Digital Dice coming soon!');
      },
    },
    {
      id: 'score-tracker',
      title: 'Score Tracker',
      description: 'Keep track of player scores',
      icon: Trophy,
      color: '#8b5cf6',
      backgroundColor: '#f3f4f6',
      onPress: () => {
        // TODO: Implement score tracker functionality
        console.log('Score Tracker coming soon!');
      },
    },
  ];

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      <View style={styles.header}>
        <Text style={styles.title}>Game Tools</Text>
        <Text style={styles.subtitle}>Essential utilities for your board game sessions</Text>
      </View>

      <View style={styles.content}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: 200,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(26, 43, 95, 0.85)',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 20,
    padding: 20,
    paddingTop: 30,
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
  },
  toolTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  toolDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
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
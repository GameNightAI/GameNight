import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LogOut, CreditCard as Edit2, ExternalLink, Mail } from 'lucide-react-native';

import { supabase } from '@/services/supabase';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
      } else {
        router.replace('/auth/login');
      }
    };

    loadUserData();
  }, [router]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnBGG = () => {
    Linking.openURL('https://boardgamegeek.com');
  };

  if (!fontsLoaded || !email) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.profileHeader}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarLetter}>{email.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{email}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={styles.statsContainer}
      >
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>About this app</Text>
          <Text style={styles.infoText}>
            Manage your board game collection, invite friends to play games, and access key tools to make your board gaming easier and more fun.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Contact & Support</Text>
          <View style={styles.contactContainer}>
            <Text style={styles.contactText}>
              Questions, issues, or feature requests?{'\n'}
              Email us or join our Discord server!
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:GameNyteApp@gmail.com')}>
              <Mail size={64} color="#666666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://discord.gg/QdVWfscN')}>
              <Image
                source={require('@/assets/images/discord_symbol.svg')}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handleViewOnBGG}>
          <Image
            source={require('@/assets/images/Powered by BGG.webp')}
            style={styles.bggLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(400).duration(400)}
        style={styles.actionsContainer}
      >
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
          disabled={loading}
        >
          <LogOut size={20} color="#e74c3c" />
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
            {loading ? 'Logging out...' : 'Log Out'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a2b5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarLetter: {
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    color: '#ffffff',
  },
  username: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  bggLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bggLinkText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginRight: 4,
  },
  statsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  contactText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    flex: 1,
  },
  bggLogo: {
    width: '100%',
    height: 60,
    marginTop: 16,
  },
  actionsContainer: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginLeft: 12,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ffeeee',
  },
  logoutButtonText: {
    color: '#e74c3c',
  },
});
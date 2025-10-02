import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, CreditCard as Edit2, ExternalLink, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

import { supabase } from '@/services/supabase';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string | null>(null);
  const { colors, typography } = useTheme();
  const { announceForAccessibility, isReduceMotionEnabled, getReducedMotionStyle } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  // Use fallback values for web platform
  const safeAreaBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      announceForAccessibility('Successfully signed out');
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

  if (!email) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 80 + safeAreaBottom }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarLetter}>{email.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{email}</Text>
      </View>

      <View style={styles.statsContainer}>
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
            <TouchableOpacity
              accessibilityLabel="Email support"
              accessibilityRole="button"
              accessibilityHint="Opens your email app to contact support"
              onPress={() => Linking.openURL('mailto:GameNyteApp@gmail.com')}
              style={styles.iconButton}
            >
              <Mail size={28} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Open Discord server"
              accessibilityRole="button"
              accessibilityHint="Opens the GameNyte Discord invite link"
              onPress={() => Linking.openURL('https://discord.gg/FPX4hatRK2')}
              style={[styles.iconButton, styles.iconButtonSpacing]}
            >
              <Image
                source={require('@/assets/images/discord_symbol.svg')}
                resizeMode="contain"
                style={styles.discordIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <TouchableOpacity
            style={styles.actionButton}
            accessibilityLabel="Log out"
            accessibilityRole="button"
            accessibilityHint="Logs you out and returns to the login screen"
            onPress={handleLogout}
            disabled={loading}
          >
            <LogOut size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
              {loading ? 'Logging out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityLabel="View BoardGameGeek website"
          accessibilityRole="button"
          accessibilityHint="Opens boardgamegeek.com in your browser"
          onPress={handleViewOnBGG}
        >
          <Image
            source={require('@/assets/images/Powered by BGG.webp')}
            style={styles.bggLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80, // Base padding for tab bar
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
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
    fontFamily: typography.getFontFamily('bold'),
    fontSize: typography.fontSize.title1 * 1.25,
    color: '#ffffff',
  },
  username: {
    fontFamily: typography.getFontFamily('bold'),
    fontSize: typography.fontSize.title3,
    color: colors.primary,
    marginBottom: 8,
  },
  bggLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bggLinkText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: colors.accent,
    marginRight: 4,
  },
  statsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.success,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
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
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
    color: colors.textMuted,
    lineHeight: 22,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
    color: colors.textMuted,
    lineHeight: 22,
    flex: 1,
  },
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacing: {
    marginLeft: 12,
  },
  discordIcon: {
    width: 28,
    height: 28,
  },
  bggLogo: {
    width: '100%',
    height: 60,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 44,
  },
  actionButtonText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: colors.primary,
    marginLeft: 12,
  },
  logoutButtonText: {
    color: colors.error,
  },
});
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Modal, Dimensions, Platform, Switch } from 'react-native';
import { Dice6, RotateCcw, Plus, Minus, X, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideInDown,
  SlideOutUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { height: screenHeight } = Dimensions.get('window');

interface DiceResult {
  id: number;
  value: number;
  sides: number;
}

const STANDARD_DICE_SIDES = [2, 4, 6, 8, 10, 12, 20, 100];

export default function DigitalDiceScreen() {
  const [sides, setSides] = useState(6);
  const [numberOfDice, setNumberOfDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [results, setResults] = useState<DiceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSides, setCustomSides] = useState('');
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Load haptic setting on mount
  useEffect(() => {
    const loadHapticSetting = async () => {
      try {
        const saved = await AsyncStorage.getItem('dice_haptic_enabled');
        if (saved !== null) {
          setHapticEnabled(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Error loading haptic setting:', error);
      }
    };
    loadHapticSetting();
  }, []);

  // Save haptic setting when changed
  const toggleHaptic = async (value: boolean) => {
    setHapticEnabled(value);
    try {
      await AsyncStorage.setItem('dice_haptic_enabled', JSON.stringify(value));
    } catch (error) {
      console.log('Error saving haptic setting:', error);
    }
  };

  const rollDice = useCallback(() => {
    // Add haptic feedback for mobile (if enabled)
    if (Platform.OS !== 'web' && hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsRolling(true);
    setShowResults(false);
    setResults([]);

    // Generate random results
    const newResults: DiceResult[] = [];
    for (let i = 0; i < numberOfDice; i++) {
      newResults.push({
        id: i,
        value: Math.floor(Math.random() * sides) + 1,
        sides: sides,
      });
    }

    // Keep the same rolling screen duration (1000ms)
    setTimeout(() => {
      runOnJS(setResults)(newResults);
      runOnJS(setIsRolling)(false);
      runOnJS(setShowResults)(true);
    }, 1000);
  }, [sides, numberOfDice]);

  const resetDice = () => {
    setResults([]);
    setShowResults(false);
  };

  const handleSidesSelection = (selectedSides: number) => {
    setSides(selectedSides);
  };

  const handleCustomSides = () => {
    const customValue = parseInt(customSides);
    if (customValue && customValue >= 2 && customValue <= 1000) {
      setSides(customValue);
      setShowCustomModal(false);
      setCustomSides('');
    }
  };

  const adjustNumberOfDice = (increment: boolean) => {
    if (increment && numberOfDice < 10) {
      setNumberOfDice(numberOfDice + 1);
    } else if (!increment && numberOfDice > 1) {
      setNumberOfDice(numberOfDice - 1);
    }
  };

  const totalValue = results.reduce((sum, dice) => sum + dice.value, 0);

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      {/* Custom Sides Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Dice Sides</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCustomModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the number of sides (2-1000):
            </Text>

            <TextInput
              style={styles.customInput}
              value={customSides}
              onChangeText={setCustomSides}
              placeholder="Enter number of sides"
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!customSides || parseInt(customSides) < 2 || parseInt(customSides) > 1000) && styles.modalConfirmButtonDisabled
                ]}
                onPress={handleCustomSides}
                disabled={!customSides || parseInt(customSides) < 2 || parseInt(customSides) > 1000}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rolling Animation Overlay */}
      {isRolling && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.rollingOverlay}
        >
          <RollingDiceAnimation />
          <Text style={styles.rollingText}>Rolling...</Text>
        </Animated.View>
      )}

      {/* Results Overlay */}
      {showResults && !isRolling && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.resultsOverlay}
        >
          <Animated.View
            entering={SlideInDown.duration(800).springify()}
            exiting={SlideOutUp.duration(300)}
            style={styles.resultsCard}
          >
            <Text style={styles.resultsTitle}>Results</Text>

            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContainer}
              showsVerticalScrollIndicator={false}
            >
              {results.map((dice, index) => (
                <Animated.View
                  key={dice.id}
                  entering={ZoomIn.delay(index * 100).duration(300)}
                  style={styles.resultDice}
                >
                  <Dice6 size={32} color="#10b981" />
                  <Text style={styles.resultValue}>{dice.value}</Text>
                </Animated.View>
              ))}
            </ScrollView>

            {numberOfDice > 1 && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>{totalValue}</Text>
              </View>
            )}

            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.rollAgainButton}
                onPress={rollDice}
              >
                <RotateCcw size={20} color="#ffffff" />
                <Text style={styles.rollAgainText}>Roll Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeResultsButton}
                onPress={resetDice}
              >
                <Text style={styles.closeResultsText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Digital Dice</Text>
          <Text style={styles.subtitle}>Roll virtual dice for your board games</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Dice Sides Configuration */}
          <View style={styles.configSection}>
            <Text style={styles.configLabel}>Number of Sides</Text>
            <View style={styles.sidesGrid}>
              {STANDARD_DICE_SIDES.map((sideOption) => (
                <TouchableOpacity
                  key={sideOption}
                  style={[
                    styles.sideOption,
                    sides === sideOption && styles.sideOptionSelected
                  ]}
                  onPress={() => handleSidesSelection(sideOption)}
                >
                  <Text style={[
                    styles.sideOptionText,
                    sides === sideOption && styles.sideOptionTextSelected
                  ]}>
                    d{sideOption}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.sideOption,
                  styles.customSideOption,
                  !STANDARD_DICE_SIDES.includes(sides) && styles.sideOptionSelected
                ]}
                onPress={() => setShowCustomModal(true)}
              >
                <Text style={[
                  styles.sideOptionText,
                  !STANDARD_DICE_SIDES.includes(sides) && styles.sideOptionTextSelected
                ]}>
                  {!STANDARD_DICE_SIDES.includes(sides) ? `d${sides}` : 'Other'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Number of Dice Configuration */}
          <View style={styles.configSection}>
            <Text style={styles.configLabel}>Number of Dice</Text>
            <View style={styles.configRow}>
              <TouchableOpacity
                style={[styles.adjustButton, numberOfDice <= 1 && styles.adjustButtonDisabled]}
                onPress={() => adjustNumberOfDice(false)}
                disabled={numberOfDice <= 1}
              >
                <Minus size={20} color={numberOfDice <= 1 ? "#cccccc" : "#10b981"} />
              </TouchableOpacity>

              <View style={styles.valueContainer}>
                <Text style={styles.valueText}>{numberOfDice}</Text>
                <Text style={styles.valueSubtext}>{numberOfDice === 1 ? 'die' : 'dice'}</Text>
              </View>

              <TouchableOpacity
                style={[styles.adjustButton, numberOfDice >= 10 && styles.adjustButtonDisabled]}
                onPress={() => adjustNumberOfDice(true)}
                disabled={numberOfDice >= 10}
              >
                <Plus size={20} color={numberOfDice >= 10 ? "#cccccc" : "#10b981"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewContainer}>
              {Array.from({ length: numberOfDice }, (_, index) => (
                <View key={index} style={styles.previewDice}>
                  <Dice6 size={24} color="#10b981" />
                </View>
              ))}
            </View>
            <Text style={styles.previewText}>
              Rolling {numberOfDice} {numberOfDice === 1 ? 'die' : 'dice'} with {sides} sides each
            </Text>
          </View>

          {/* Roll Button */}
          <TouchableOpacity
            style={[styles.rollButton, isRolling && styles.rollButtonDisabled]}
            onPress={rollDice}
            disabled={isRolling}
          >
            <Dice6 size={24} color="#ffffff" />
            <Text style={styles.rollButtonText}>
              {isRolling ? 'Rolling...' : 'Roll Dice'}
            </Text>
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color="#666666" />
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dice Settings</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSettings(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  {Platform.OS === 'web'
                    ? 'Haptic feedback is not available on web'
                    : 'Feel vibrations when rolling dice'
                  }
                </Text>
              </View>
              <Switch
                value={hapticEnabled}
                onValueChange={toggleHaptic}
                disabled={Platform.OS === 'web'}
                trackColor={{ false: '#e1e5ea', true: '#ff9654' }}
                thumbColor={hapticEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Rolling Animation Component - now only shows one die
function RollingDiceAnimation() {
  return (
    <View style={styles.rollingDiceContainer}>
      <RollingDice />
    </View>
  );
}

function RollingDice() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  React.useEffect(() => {
    // Slower rotation animation - increased duration from 250ms to 800ms
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );

    // Slower scale animation - increased duration from 125ms to 400ms per cycle
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 400 }),
        withTiming(1, { duration: 400 })
      ),
      -1,
      true
    );
  }, []);

  return (
    <Animated.View style={[styles.rollingDice, animatedStyle]}>
      <Dice6 size={48} color="#10b981" />
    </Animated.View>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: screenHeight,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: Math.min(32, screenHeight * 0.04),
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: Math.min(16, screenHeight * 0.02),
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
    paddingBottom: 40,
    minHeight: screenHeight * 0.7,
  },
  configSection: {
    marginBottom: 32,
  },
  configLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
    textAlign: 'center',
  },
  sidesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  sideOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sideOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  customSideOption: {
    minWidth: 80,
  },
  sideOptionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  sideOptionTextSelected: {
    color: '#10b981',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adjustButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  valueText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#1a2b5f',
  },
  valueSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: -4,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  previewLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewDice: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  previewText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  rollButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 20,
  },
  rollButtonDisabled: {
    opacity: 0.7,
  },
  rollButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#ffffff',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  customInput: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  rollingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  rollingDiceContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  rollingDice: {
    // Removed marginHorizontal since we only have one die now
  },
  rollingText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
  },
  resultsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  resultsTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultsScroll: {
    maxHeight: 200,
  },
  resultsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  resultDice: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
  },
  resultValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#10b981',
    marginTop: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginRight: 8,
  },
  totalValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#10b981',
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  rollAgainButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollAgainText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  closeResultsButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeResultsText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  settingsButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  settingDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});
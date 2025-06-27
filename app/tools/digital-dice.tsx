import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Dice6, RotateCcw, Plus, Minus } from 'lucide-react-native';
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

interface DiceResult {
  id: number;
  value: number;
  sides: number;
}

export default function DigitalDiceScreen() {
  const [sides, setSides] = useState(6);
  const [numberOfDice, setNumberOfDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [results, setResults] = useState<DiceResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const rollDice = useCallback(() => {
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

    // Simulate rolling animation duration
    setTimeout(() => {
      runOnJS(setResults)(newResults);
      runOnJS(setIsRolling)(false);
      runOnJS(setShowResults)(true);
    }, 2000);
  }, [sides, numberOfDice]);

  const resetDice = () => {
    setResults([]);
    setShowResults(false);
  };

  const adjustSides = (increment: boolean) => {
    if (increment && sides < 100) {
      setSides(sides + 1);
    } else if (!increment && sides > 2) {
      setSides(sides - 1);
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
      <Image
        source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      {/* Rolling Animation Overlay */}
      {isRolling && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.rollingOverlay}
        >
          <RollingDiceAnimation numberOfDice={numberOfDice} />
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

      <View style={styles.header}>
        <Text style={styles.title}>Digital Dice</Text>
        <Text style={styles.subtitle}>Roll virtual dice for your board games</Text>
      </View>

      <View style={styles.content}>
        {/* Dice Sides Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Number of Sides</Text>
          <View style={styles.configRow}>
            <TouchableOpacity
              style={[styles.adjustButton, sides <= 2 && styles.adjustButtonDisabled]}
              onPress={() => adjustSides(false)}
              disabled={sides <= 2}
            >
              <Minus size={20} color={sides <= 2 ? "#cccccc" : "#10b981"} />
            </TouchableOpacity>
            
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{sides}</Text>
              <Text style={styles.valueSubtext}>sides</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.adjustButton, sides >= 100 && styles.adjustButtonDisabled]}
              onPress={() => adjustSides(true)}
              disabled={sides >= 100}
            >
              <Plus size={20} color={sides >= 100 ? "#cccccc" : "#10b981"} />
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
      </View>
    </View>
  );
}

// Rolling Animation Component
function RollingDiceAnimation({ numberOfDice }: { numberOfDice: number }) {
  return (
    <View style={styles.rollingDiceContainer}>
      {Array.from({ length: numberOfDice }, (_, index) => (
        <RollingDice key={index} delay={index * 100} />
      ))}
    </View>
  );
}

function RollingDice({ delay }: { delay: number }) {
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
    rotation.value = withRepeat(
      withTiming(360, { duration: 500, easing: Easing.linear }),
      -1,
      false
    );
    
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 250 }),
        withTiming(1, { duration: 250 })
      ),
      -1,
      true
    );
  }, []);

  return (
    <Animated.View style={[styles.rollingDice, animatedStyle, { marginLeft: delay }]}>
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
  rollingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  rollingDiceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  rollingDice: {
    marginHorizontal: 8,
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
});
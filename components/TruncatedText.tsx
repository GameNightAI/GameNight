import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  textStyle?: any;
  buttonStyle?: any;
  buttonTextStyle?: any;
  expandText?: string;
  collapseText?: string;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 35,
  textStyle,
  buttonStyle,
  buttonTextStyle,
  expandText = 'Show more',
  collapseText = 'Show less',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  if (!text || text.length <= maxLength) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const displayText = isExpanded ? text : `${text.substring(0, maxLength)}...`;
  const buttonText = isExpanded ? collapseText : expandText;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    announceForAccessibility(isExpanded ? 'Text collapsed' : 'Text expanded');
  };

  return (
    <View style={styles.container}>
      <Text style={textStyle}>{displayText}</Text>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={handleToggle}
        hitSlop={touchTargets.small}
        accessibilityLabel={isExpanded ? 'Collapse text' : 'Expand text'}
        accessibilityRole="button"
        accessibilityHint={isExpanded ? 'Collapses the full text' : 'Shows the full text'}
      >
        <Text style={[styles.buttonText, buttonTextStyle]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    marginLeft: 4,
  },
  buttonText: {
    color: colors.primary,
    fontSize: typography.fontSize.caption1,
    fontFamily: typography.getFontFamily('semibold'),
    textDecorationLine: 'underline',
  },
});

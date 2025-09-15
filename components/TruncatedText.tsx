import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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

  if (!text || text.length <= maxLength) {
    return <Text style={textStyle}>{text}</Text>;
  }

  const displayText = isExpanded ? text : `${text.substring(0, maxLength)}...`;
  const buttonText = isExpanded ? collapseText : expandText;

  return (
    <View style={styles.container}>
      <Text style={textStyle}>{displayText}</Text>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={() => setIsExpanded(!isExpanded)}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      >
        <Text style={[styles.buttonText, buttonTextStyle]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    marginLeft: 4,
  },
  buttonText: {
    color: '#0070f3',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

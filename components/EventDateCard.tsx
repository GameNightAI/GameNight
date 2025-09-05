import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { format } from 'date-fns';

import { EVENT_VOTING_OPTIONS, EVENT_ICON_MAP, EventVoteType, getEventIconColor, getEventVoteBgColor, getEventVoteBorderColor } from './eventVotingOptions';
import { PollEvent } from '@/types/poll';
import { TruncatedText } from './TruncatedText';

interface EventDateCardProps {
  eventDate: PollEvent;
  index: number;
  selectedVote?: EventVoteType;
  onVote: (eventId: string, voteType: EventVoteType) => void;
  disabled?: boolean;
  voteCounts?: { yes: number; no: number; maybe: number };
  displayLocation: string;
  displayTime: string;
}

export const EventDateCard = ({
  eventDate,
  index,
  selectedVote,
  onVote,
  disabled = false,
  voteCounts,
  displayLocation,
  displayTime
}: EventDateCardProps) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 500;
  const isSmallScreen = width < 400;


  const getButtonStyle = (voteType: EventVoteType) => {
    const isSelected = selectedVote === voteType;
    return [
      styles.voteButton,
      isSmallScreen && styles.voteButtonSmall,
      {
        backgroundColor: getEventVoteBgColor(voteType, isSelected),
        borderColor: getEventVoteBorderColor(voteType, isSelected),
        borderWidth: isSelected ? 3 : 2,
        shadowColor: isSelected ? getEventVoteBorderColor(voteType, isSelected) : 'transparent',
        shadowOpacity: isSelected ? 0.25 : 0,
        shadowRadius: isSelected ? 8 : 0,
        elevation: isSelected ? 4 : 0,
      },
    ];
  };

  const date = new Date(eventDate.event_date);

  return (
    <Animated.View entering={FadeIn.delay(index * 100)} style={styles.card}>
      {/* Main content area */}
      <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
        {/* Date info and details row */}
        <View style={[styles.dateInfoRow, isMobile && styles.dateInfoRowMobile]}>
          <View style={styles.dateIcon}>
            <Calendar size={isSmallScreen ? 20 : 24} color="#8b5cf6" />
          </View>
          <View style={[styles.dateInfo, isMobile && styles.dateInfoMobile]}>
            <Text style={[styles.dateText, isSmallScreen && styles.dateTextSmall]}>
              {format(date, 'EEEE, MMMM d, yyyy')}
            </Text>
            <View style={styles.dateDetails}>
              <View style={styles.dateDetailRow}>
                <MapPin size={isSmallScreen ? 12 : 14} color="#6b7280" />
                <TruncatedText
                  text={displayLocation}
                  maxLength={35}
                  textStyle={[styles.dateDetailText, isSmallScreen && styles.dateDetailTextSmall]}
                  buttonTextStyle={[styles.truncateButtonText, isSmallScreen && styles.truncateButtonTextSmall]}
                />
              </View>
              <View style={styles.dateDetailRow}>
                <Clock size={isSmallScreen ? 12 : 14} color="#6b7280" />
                <Text style={[styles.dateDetailText, isSmallScreen && styles.dateDetailTextSmall]}>
                  {displayTime}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Voting buttons row - moved below date info for mobile */}
        <View style={[styles.voteButtonsContainer, isMobile && styles.voteButtonsContainerMobile]}>
          {EVENT_VOTING_OPTIONS.map(option => {
            const IconComponent = EVENT_ICON_MAP[option.icon];
            return (
              <View key={option.value} style={styles.voteButtonWrapper}>
                <TouchableOpacity
                  style={getButtonStyle(option.value)}
                  onPress={() => onVote(eventDate.id, option.value)}
                  disabled={disabled}
                >
                  <IconComponent
                    size={isSmallScreen ? 16 : 20}
                    color={getEventIconColor(option.value, selectedVote === option.value)}
                  />
                </TouchableOpacity>
                <Text style={styles.voteButtonLabel}>{option.label}</Text>
                {voteCounts && (
                  <Text style={styles.voteCount}>
                    {option.value === 2 ? voteCounts.yes :
                      option.value === 1 ? voteCounts.maybe :
                        voteCounts.no}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mainContentMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'flex-start',
  },
  dateInfoRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateInfoMobile: {
    flex: 1,
    marginRight: 0,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  dateTextSmall: {
    fontSize: 13,
    marginBottom: 2,
  },
  dateDetails: {
    gap: 4,
  },
  dateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateDetailText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  dateDetailTextSmall: {
    fontSize: 11,
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voteButtonWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  voteButtonsContainerMobile: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  voteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteButtonLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  voteCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    color: '#1a2b5f',
    marginTop: 1,
    textAlign: 'center',
  },
  voteButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  truncateButtonText: {
    color: '#0070f3',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  truncateButtonTextSmall: {
    fontSize: 10,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';

import { EVENT_VOTING_OPTIONS, EVENT_ICON_MAP, EventVoteType, getEventIconColor, getEventVoteBgColor, getEventVoteBorderColor } from './eventVotingOptions';
import { PollEvent } from '@/types/poll';

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

  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleExpanded = () => setIsExpanded((prev) => !prev);

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
      <TouchableOpacity
        style={styles.expandTouchable}
        activeOpacity={0.85}
        onPress={toggleExpanded}
      >
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
                  <Text style={[styles.dateDetailText, isSmallScreen && styles.dateDetailTextSmall]}>
                    {displayLocation}
                  </Text>
                </View>
                <View style={styles.dateDetailRow}>
                  <Clock size={isSmallScreen ? 12 : 14} color="#6b7280" />
                  <Text style={[styles.dateDetailText, isSmallScreen && styles.dateDetailTextSmall]}>
                    {displayTime}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <Text style={[styles.infoText, isSmallScreen && styles.infoTextSmall]}>Vote</Text>
              {isExpanded ? (
                <ChevronDown size={isSmallScreen ? 20 : 24} color="#ff9654" />
              ) : (
                <ChevronRight size={isSmallScreen ? 20 : 24} color="#ff9654" />
              )}
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
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.expandedContent}
        >
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                <Calendar size={16} color="#8b5cf6" />
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {format(date, 'MMMM d, yyyy')}
                </Text>
              </View>
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                <Clock size={16} color="#6b7280" />
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {displayTime}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                <MapPin size={16} color="#ef4444" />
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {displayLocation}
                </Text>
              </View>
              {voteCounts && (
                <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                  <Text style={styles.detailLabel}>Total Votes</Text>
                  <Text style={styles.detailValue}>
                    {voteCounts.yes + voteCounts.no + voteCounts.maybe}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}
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
  chevronContainer: {
    marginLeft: 'auto',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  infoTextSmall: {
    fontSize: 10,
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
  expandTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 8,
  },
  detailItemSmall: {
    borderRadius: 4,
  },
  detailLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginTop: 2,
    textAlign: 'center',
  },
});

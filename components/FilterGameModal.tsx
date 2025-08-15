import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import { Search, X, ChevronDown, Clock } from 'lucide-react-native';
import Select from 'react-select';
import { Game } from '@/types/game';
import { useDeviceType } from '@/hooks/useDeviceType';
import { isSafari } from '@/utils/safari-polyfill';

interface FilterOption {
  value: any;
  label: string;
  min?: number;
  max?: number;
}

interface FilterGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilter: () => void;
  playerCount: FilterOption[];
  playTime: FilterOption[];
  age: FilterOption[];
  gameType: FilterOption[];
  complexity: FilterOption[];
  setPlayerCount: (value: FilterOption[]) => void;
  setPlayTime: (value: FilterOption[]) => void;
  setAge: (value: FilterOption[]) => void;
  setGameType: (value: FilterOption[]) => void;
  setComplexity: (value: FilterOption[]) => void;
}

export const FilterGameModal: React.FC<FilterGameModalProps> = ({
  isVisible,
  onClose,
  onApplyFilter,
  playerCount,
  playTime,
  age,
  gameType,
  complexity,
  setPlayerCount,
  setPlayTime,
  setAge,
  setGameType,
  setComplexity,
}) => {
  const deviceType = useDeviceType();

  // Dynamic z-index management for dropdowns
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  // Function to get dynamic z-index for each filter section
  const getFilterSectionZIndex = (index: number) => {
    if (openDropdownIndex === null) return 1000;
    if (openDropdownIndex === index) return 99999;
    return 1000;
  };

  // Function to handle dropdown open/close events
  const handleDropdownChange = (index: number, isOpen: boolean) => {
    setOpenDropdownIndex(isOpen ? index : null);
  };

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+'])
    .map(_ => ({ value: parseInt(_), label: _ }));
  const timeOptions = [
    { value: 1, min: 1, max: 30, label: '30 min or less' },
    { value: 31, min: 31, max: 60, label: '31-60 min' },
    { value: 61, min: 61, max: 90, label: '61-90 min' },
    { value: 91, min: 91, max: 120, label: '91-120 min' },
    { value: 121, min: 121, max: 999999999, label: 'More than 120 min' },
  ];
  const ageOptions = [
    { value: 1, min: 1, max: 5, label: '5 and under' },
    { value: 6, min: 6, max: 7, label: '6-7' },
    { value: 8, min: 8, max: 9, label: '8-9' },
    { value: 10, min: 10, max: 11, label: '10-11' },
    { value: 12, min: 12, max: 13, label: '12-13' },
    { value: 14, min: 14, max: 15, label: '14-15' },
    { value: 16, min: 16, max: 999, label: '16 and up' },
  ];
  const typeOptions = ['Competitive', 'Cooperative', 'Team-based']
    .map(_ => ({ value: _, label: _ }));
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy']
    .map((_, i) => ({ value: i + 1, label: _ }));

  const handleFilter = () => {
    //onApplyFilter()
    //onSearch(players, time, playTime === '120+');
    onClose();
  };

  // Safari-compatible select styles with dynamic z-index
  const getSelectStyles = (index: number) => {
    const baseSelectStyles = {
      control: (baseStyles: any, state: any) => {
        return {
          ...baseStyles,
          fontFamily: 'Poppins-Regular',
          fontSize: 14,
          borderColor: '#e1e5ea',
          borderRadius: 8,
          minHeight: 40,
          boxShadow: 'none',
          '&:hover': {
            borderColor: '#ff9654',
          },
          // Safari-specific fixes
          ...(isSafari() && {
            WebkitAppearance: 'none',
            WebkitBorderRadius: 8,
          }),
        }
      },
      container: (baseStyles: any, state: any) => ({
        ...baseStyles,
        marginBottom: 6,
        position: 'relative',
        zIndex: getFilterSectionZIndex(index),
      }),
      menu: (baseStyles: any, state: any) => ({
        ...baseStyles,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e1e5ea',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: getFilterSectionZIndex(index),
        position: 'absolute',
        maxHeight: 'none',
        overflow: 'hidden',
        // Safari-specific fixes
        ...(isSafari() && {
          WebkitBorderRadius: 8,
        }),
      }),
      menuList: (baseStyles: any, state: any) => ({
        ...baseStyles,
        maxHeight: 160,
        overflow: 'auto',
        // Safari-specific scrollbar styling
        ...(isSafari() && {
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
          },
        }),
      }),
      clearIndicator: (baseStyles: any, state: any) => ({
        ...baseStyles,
        color: '#666666',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
        padding: '2px 6px',
        cursor: 'pointer',
        '&:hover': {
          color: '#ff9654',
        },
        // Hide the default SVG icon
        '& svg': {
          display: 'none',
        },
        '&::after': {
          content: '"CLR"',
          display: 'block',
        },
      }),
      multiValueLabel: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
      }),
      noOptionsMessage: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
      }),
      option: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: state.isSelected ? '#ff9654' : '#333333',
        backgroundColor: state.isSelected ? '#fff5ef' : 'transparent',
        '&:hover': {
          backgroundColor: '#fff5ef',
        },
      }),
      placeholder: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#999999',
      }),
    };

    return baseSelectStyles;
  };

  if (!isVisible) return null;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Games</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={18} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Filter your collection to find the perfect game for your group.{'\n'}
        All filters are optional.
      </Text>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 4, paddingTop: 2 }}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.filterSection, { zIndex: getFilterSectionZIndex(0) }]}>
          <Select
            placeholder="Player count"
            value={playerCount}
            onChange={(value) => setPlayerCount(Array.from(value || []))}
            options={playerOptions}
            defaultValue={[]}
            isMulti
            isClearable
            isSearchable={false}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            styles={getSelectStyles(0)}
            onMenuOpen={() => handleDropdownChange(0, true)}
            onMenuClose={() => handleDropdownChange(0, false)}
          />
        </View>

        <View style={[styles.filterSection, { zIndex: getFilterSectionZIndex(1) }]}>
          <Select
            placeholder="Play time"
            value={playTime}
            onChange={(value) => setPlayTime(Array.from(value || []))}
            options={timeOptions}
            defaultValue={[]}
            isMulti
            isClearable
            isSearchable={false}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            styles={getSelectStyles(1)}
            onMenuOpen={() => handleDropdownChange(1, true)}
            onMenuClose={() => handleDropdownChange(1, false)}
          />
        </View>

        <View style={[styles.filterSection, { zIndex: getFilterSectionZIndex(2) }]}>
          <Select
            placeholder="Age range"
            value={age}
            onChange={(value) => setAge(Array.from(value || []))}
            options={ageOptions}
            isMulti
            isClearable
            isSearchable={false}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            styles={getSelectStyles(2)}
            onMenuOpen={() => handleDropdownChange(2, true)}
            onMenuClose={() => handleDropdownChange(2, false)}
          />
        </View>

        <View style={[styles.filterSection, { zIndex: getFilterSectionZIndex(3) }]}>
          <Select
            placeholder="Co-op / competitive"
            value={gameType}
            onChange={(value) => setGameType(Array.from(value || []))}
            defaultValue={[]}
            options={typeOptions}
            isMulti
            isClearable
            isSearchable={false}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            styles={getSelectStyles(3)}
            onMenuOpen={() => handleDropdownChange(3, true)}
            onMenuClose={() => handleDropdownChange(3, false)}
          />
        </View>

        <View style={[styles.filterSection, { zIndex: getFilterSectionZIndex(4) }]}>
          <Select
            placeholder="Game complexity"
            value={complexity}
            onChange={(value) => setComplexity(Array.from(value || []))}
            defaultValue={[]}
            options={complexityOptions}
            isMulti
            isClearable
            isSearchable={false}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            styles={getSelectStyles(4)}
            onMenuOpen={() => handleDropdownChange(4, true)}
            onMenuClose={() => handleDropdownChange(4, false)}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleFilter}
      >
        <Search color="#fff" size={18} />
        <Text style={styles.searchButtonText}>Filter Games</Text>
      </TouchableOpacity>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.overlay}>
        <View style={{
          maxWidth: '95%',
          maxHeight: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={styles.dialog}>
            {content}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

export const filterGames = (
  games: Game[],
  playerCount: FilterOption[],
  playTime: FilterOption[],
  age: FilterOption[],
  gameType: FilterOption[],
  complexity: FilterOption[]
) => {
  return games.filter(game => {
    let is_match = true;

    if (playerCount.length) {
      is_match &&= playerCount.some((p: FilterOption) => (
        // Ignore game.min_players when 15+ is selected,
        // since the number of actual players could be arbitrarily large.
        (game.min_players <= p.value || p.value === 15)
        && p.value <= game.max_players
      ));
    }

    if (playTime.length) {
      is_match &&= playTime.some((t: FilterOption) => {
        const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
        // Perhaps this should incorporate game.minplaytime and game.maxplaytime more sensibly
        return (
          t.min! <= game.playing_time
          && game.playing_time <= t.max!
        );
      });
    }

    if (age.length) {
      is_match &&= age.some((a: FilterOption) => (
        a.min! <= game.minAge
        && game.minAge <= a.max!
      ));
    }

    if (gameType.length) {
      is_match &&= gameType.some((t: FilterOption) => {
        switch (t.value) {
          case 'Competitive':
            return !game.is_cooperative
          case 'Cooperative':
            return game.is_cooperative
          case 'Team-based':
            return game.is_teambased
        }
      });
    }

    if (complexity.length) {
      is_match &&= complexity.some((c: FilterOption) => (
        game.complexity_tier === c.value
      ));
    }

    return is_match;
  });
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 12,
    zIndex: 999999,
    height: 'auto',
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    paddingBottom: 6,
    paddingTop: 12,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
    paddingTop: 2,
  },
  filterScrollView: {
    flex: 1,
    minHeight: 0,
  },
  filterSection: {
    marginBottom: 6,
    position: 'relative',
  },
  searchButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
  },
});

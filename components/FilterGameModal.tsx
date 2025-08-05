import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView, Dimensions } from 'react-native';
import { Search, X, ChevronDown, Clock } from 'lucide-react-native';
import Select from 'react-select';
import { Game } from '@/types/game';

interface FilterGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilter: () => void;
  playerCount: any;
  playTime: any;
  age: any;
  gameType: any;
  complexity: any;
  setPlayerCount: any;
  setPlayTime: any;
  setAge: any;
  setGameType: any;
  setComplexity: any;
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
  
  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+'])
    .map(_ => ({value: parseInt(_), label: _}));
  const timeOptions = [
    {value: 1, min: 1, max: 30, label: '30 min or less'},
    {value: 31, min: 31, max: 60, label: '31-60 min'},
    {value: 61, min: 61, max: 90, label: '61-90 min'},
    {value: 91, min: 91, max: 120, label: '91-120 min'},
    {value: 121, min: 121, max: 999999999, label: 'More than 120 min'},
  ];
  const ageOptions = [
    {value: 1, min: 1, max: 5, label: '5 and under'},
    {value: 6, min: 6, max: 7, label: '6-7'},
    {value: 8, min: 8, max: 9, label: '8-9'},
    {value: 10, min: 10, max: 11, label: '10-11'},
    {value: 12, min: 12, max: 13, label: '12-13'},
    {value: 14, min: 14, max: 15, label: '14-15'},
    {value: 16, min: 16, max: 999, label: '16 and up'},
  ];
  const typeOptions = ['Competitive', 'Cooperative', 'Team-based']
    .map(_ => ({value: _, label: _}));
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy']
    .map((_, i) => ({value: i+1, label: _}));

  const handleFilter = () => {
    //onApplyFilter()
    //onSearch(players, time, playTime === '120+');
    onClose();
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Games</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Filter your collection to find the perfect game for your group.{'\n'}
        All filters are optional.
      </Text>

      <Select
        placeholder="Player count"
        value={playerCount}
        onChange={setPlayerCount}
        options={playerOptions}
        defaultValue={[]}
        isMulti
        isClearable
        blurInputOnSelect
        closeMenuOnSelect={false}
        styles={selectStyles}
      />

      <Select
        placeholder="Play time"
        value={playTime}
        onChange={setPlayTime}
        options={timeOptions}
        defaultValue={[]}
        isMulti
        isClearable
        blurInputOnSelect
        closeMenuOnSelect={false}
        styles={selectStyles}
      />

      <Select
        placeholder="Age range"
        value={age}
        onChange={setAge}
        defaultValue={[]}
        options={ageOptions}
        isMulti
        isClearable
        blurInputOnSelect
        closeMenuOnSelect={false}
        styles={selectStyles}
      />

      <Select
        placeholder="Co-op / competitive"
        value={gameType}
        onChange={setGameType}
        defaultValue={[]}
        options={typeOptions}
        isMulti
        isClearable
        blurInputOnSelect
        closeMenuOnSelect={false}
        styles={selectStyles}
      />

      <Select
        placeholder="Game complexity"
        value={complexity}
        onChange={setComplexity}
        defaultValue={[]}
        options={complexityOptions}
        isMulti
        isClearable
        blurInputOnSelect
        closeMenuOnSelect={false}
        styles={selectStyles}
      />

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleFilter}
      >
        <Search color="#fff" size={20} />
        <Text style={styles.searchButtonText}>Filter Games</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        {content}
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

export const filterGames = (games, playerCount, playTime, age, gameType, complexity) => {
  return games.filter(game => {
    let is_match = true;
    
    if (playerCount.length) {
      is_match &&= playerCount.some(p => (
        // Ignore game.min_players when 15+ is selected,
        // since the number of actual players could be arbitrarily large.
        (game.min_players <= p.value || p.value === 15)
        && p.value <= game.max_players    
      ));
    }
    
    if (playTime.length) {
      is_match &&= playTime.some(t => {
        const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
        // Perhaps this should incorporate game.minplaytime and game.maxplaytime more sensibly
        return (
          t.min <= game.playing_time
          && game.playing_time <= t.max
        );
      });
    }
    
    if (age.length) {
      is_match &&= age.some(a => (
        a.min <= game.minAge
        && game.minAge <= a.max
      ));
    }
    
    if (gameType.length) {
      is_match &&= gameType.some(t => {
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
      is_match &&= complexity.some(c => (
        game.complexity_tier === c.value
      ));
    }
    
    return is_match;
  });
};

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 24,
    position: 'relative',
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  dropdownButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  dropdownAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    ...(Platform.OS === 'web' ? { zIndex: 999 } : {}),
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#fff5ef',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  dropdownItemTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  searchButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },  
});

const selectStyles = {
  control: (baseStyles, state) => {
  // console.log(state);
  return {
    ...baseStyles,
    ...styles.dropDownContainer,
  }},
  container: (baseStyles, state) => ({
    ...baseStyles,
    ...styles.dropDownContainer,
    marginBottom: 8,
  }),
  menu: (baseStyles, state) => ({
    ...baseStyles,
    ...styles.dropDown,
  }),
  menuList: (baseStyles, state) => ({
    ...baseStyles,
    ...styles.dropDown,
  }),
  multiValueLabel: (baseStyles, state) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
  }),
  noOptionsMessage: (baseStyles, state) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    ...styles.dropdownItem,
    ...styles.dropdownItemText,
  }),
  placeholder: (baseStyles, state) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  }),
};

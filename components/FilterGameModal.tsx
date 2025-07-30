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

export const filterGames = (games, playerCount, playTime, age, gameType, complexity) => {
  return games.filter((game) => {
    let is_match = true;
    
    // TODO: Change this to multiselect
    if (playerCount) {
      const count = parseInt(playerCount)
      is_match &&= (
        // ignore game.min_players when 15+ is selected, since the number of actual players is arbitrarily large in this case.
        (game.min_players <= count || count === 15)
        && game.max_players >= count
      );
    }
    
    if (playTime && playTime.length) {
      let time_filter = false;
      playTime.map(t => {
      // This should really incorporate game.minplaytime and game.maxplaytime
        //console.log(t);
        time_filter ||= (t.min <= game.playing_time && game.playing_time <= t.max); // any (||=)
      });
      is_match &&= time_filter;
    }
    
    if (age && age.length) {
      let age_filter = false;
      age.map(a => {
        //console.log(a);
        age_filter ||= (a.min <= game.minAge && game.minAge <= a.max);
      });
      is_match &&= age_filter;
    }
    
    if (gameType && gameType.length) {
      let type_filter = false;
      gameType.map(t => {
        //console.log(t);
        let col;
        switch (t.value) {
          case 'Competitive':
            type_filter ||= !game.is_cooperative
          case 'Cooperative':
            type_filter ||= game.is_cooperative
          case 'Team-based':
            type_filter ||= game.is_teambased
        }
      });
      is_match &&= type_filter;
    }
    
    if (complexity && complexity.length) {
      let complexity_filter = false;
      complexity.map(c => {
        //console.log(c);
        complexity_filter ||= game.complexity_tier === c.value
      });  
      is_match &&= complexity_filter
    }
    
    return is_match;
  });
};

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
  // Filter states
  // const [playerCount, setPlayerCount] = useState<string>('');
  // const [playTime, setPlayTime] = useState([]);
  // const [age, setAge] = useState([]);
  // const [gameType, setGameType] = useState([]);
  // const [complexity, setComplexity] = useState([]);
  
  // Dropdown visibility states
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  // const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  // const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  // const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  // const [showComplexityDropdown, setShowComplexityDropdown] = useState(false);

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+']);
  const timeOptions = [
    {value: 30, min: 1, max: 30, label: '30 minutes or less'},
    {value: 31, min: 31, max: 60, label: '31-60 minutes'},
    {value: 61, min: 61, max: 90, label: '61-90 minutes'},
    {value: 91, min: 91, max: 120, label: '91-120 minutes'},
    {value: 121, min: 121, max: 999999999, label: 'More than 120 minutes'},
  ];
  const ageOptions = [
    {value: 0, min: 0, max: 5, label: '5 and under'},
    {value: 6, min: 6, max: 7, label: '6-7'},
    {value: 8, min: 8, max: 9, label: '8-9'},
    {value: 10, min: 10, max: 11, label: '10-11'},
    {value: 12, min: 12, max: 13, label: '12-13'},
    {value: 14, min: 14, max: 15, label: '14-15'},
    {value: 16, min: 16, max: 999, label: '16 and up'},
  ];
  const typeOptions = ['Competitive', 'Cooperative', 'Team-based'].map((_) => ({value: _, label: _}));
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy'].map((_, i) => {return {value: i+1, label: _}});

  const handleFilter = () => {
    const players = playerCount === '15+' ? '15' : playerCount;
    const time = playTime === '120+' ? '120' : playTime;
    onApplyFilter()
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
        Filter your collection to find the perfect game for your group. All filters are optional.
      </Text>

      <View style={[styles.inputSection, { zIndex: 2 }]}>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              setShowPlayerDropdown(!showPlayerDropdown);
              //setShowTimeDropdown(false);
            }}
          >
            <Text style={styles.dropdownButtonText}>
              {playerCount || 'Select player count'}
            </Text>
            <ChevronDown size={20} color="#666666" />
          </TouchableOpacity>

          {showPlayerDropdown && (
            <View style={[styles.dropdown, styles.dropdownAbsolute]}>
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {playerOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      playerCount === option && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setPlayerCount(option);
                      setShowPlayerDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      playerCount === option && styles.dropdownItemTextSelected
                    ]}>
                      {option} {option === '1' ? 'player' : 'players'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <Select
        placeholder="Select play time"
        value={playTime}
        onChange={option => {
          console.log('Selected option:', option);
          setPlayTime(option);
        }}
        options={timeOptions}
        defaultValue={[]}
        isMulti
        isClearable
        closeMenuOnSelect={false}
        styles={{
          container: styles.dropDownContainer,
        }}
      />

      <Select
        placeholder="Select age range"
        value={age}
        onChange={setAge}
        defaultValue={[]}
        options={ageOptions}
        isMulti
        isClearable
        closeMenuOnSelect={false}
      />

      <Select
        placeholder="Select Co-op/Competitive"
        value={gameType}
        onChange={(option) => {
          console.log('Selected option:', option);
          setGameType(option);
        }}
        defaultValue={[]}
        options={typeOptions}
        isMulti
        isClearable
        closeMenuOnSelect={false}
      />

      <Select
        placeholder="Select game complexity"
        value={complexity}
        onChange={setComplexity}
        defaultValue={[]}
        options={complexityOptions}
        isMulti
        isClearable
        closeMenuOnSelect={false}
      />

      <TouchableOpacity
        style={[styles.searchButton, styles.searchButtonDisabled]}
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
    padding: 16,
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

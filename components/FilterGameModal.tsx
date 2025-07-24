import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView, Dimensions } from 'react-native';
import { Search, X, ChevronDown, Clock } from 'lucide-react-native';
import Select from 'react-select';

interface FilterGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSearch: (players: string, time?: string, unlimited?: boolean) => void;
}

export const FilterGameModal: React.FC<FilterGameModalProps> = ({
  isVisible,
  onClose,
  onSearch,
}) => {
  // Filter states
  const [playerCount, setPlayerCount] = useState<string>('');
  const [playTime, setPlayTime] = useState<string>('');
  const [minAge, setMinAge] = useState([]);
  const [gameType, setGameType] = useState([]);
  const [complexity, setComplexity] = useState([]);
  
  // Dropdown visibility states
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showComplexityDropdown, setShowComplexityDropdown] = useState(false);

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+']);
  const timeOptions = ['30', '60', '90', '120+'];
  const ageOptions = ['6+', '8+', '10+', '12+', '14+', '16+'].map((_) => {return {value: _, label: _}});
  const typeOptions = ['Any', 'Competitive', 'Cooperative', 'Team-based'].map((_) => {return {value: _, label: _}});
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy'].map((_) => {return {value: _, label: _}});

  const handleSearch = () => {
    if (!playerCount) return;
    const players = playerCount === '15+' ? '15' : playerCount;
    const time = playTime === '120+' ? '120' : playTime;
    onSearch(players, time, playTime === '120+');
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
              setShowTimeDropdown(false);
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

      <View style={[styles.inputSection, { zIndex: 1 }]}>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              setShowTimeDropdown(!showTimeDropdown);
              setShowPlayerDropdown(false);
            }}
          >
            <Text style={styles.dropdownButtonText}>
              {playTime ? `${playTime} minutes` : 'Select play time'}
            </Text>
            <Clock size={20} color="#666666" />
          </TouchableOpacity>

          {showTimeDropdown && (
            <View style={[styles.dropdown, styles.dropdownAbsolute]}>
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {timeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      playTime === option && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setPlayTime(option);
                      setShowTimeDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      playTime === option && styles.dropdownItemTextSelected
                    ]}>
                      {option} minutes
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <Select
        value={minAge}
        onChange={setMinAge}
        defaultValue={[]}
        options={ageOptions}
        isMulti
        isClearable
        closeMenuOnSelect={false}
      />

      <Select
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
        value={complexity}
        onChange={setComplexity}
        defaultValue={[]}
        options={complexityOptions}
        isMulti
        isClearable
        closeMenuOnSelect={false}
      />

      <TouchableOpacity
        style={[styles.searchButton, !playerCount && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={!playerCount}
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

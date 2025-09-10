import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import Select, { components as selectComponents } from 'react-select';
import { isSafari } from '@/utils/safari-polyfill';
import { Game } from '@/types/game';

interface FilterOption {
  value: any;
  label: string;
  min?: number;
  max?: number;
}

interface FilterConfig {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: FilterOption[];
  onChange: (value: FilterOption[]) => void;
}

interface FilterGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: () => void;
  title?: string;
  description?: string;
  applyButtonText?: string;
  filterConfigs: FilterConfig[];
}

export const FilterGameModal: React.FC<FilterGameModalProps> = ({
  isVisible,
  onClose,
  onApplyFilters,
  title = "Filter Your Collection",
  description = "All filters (optional)",
  applyButtonText = "Apply Filters",
  filterConfigs,
}) => {
  const CustomValueContainer = (props: any) => {
    const {
      selectProps,
      getValue,
      children,
    } = props;

    const selectedValues = getValue();

    let displayText = selectProps.placeholder;
    if (selectedValues.length > 0) {
      displayText = `${selectProps.placeholder} (${selectedValues.length} selected)`;
    }

    return (
      <selectComponents.ValueContainer {...props}>
        <Text style={{
          fontFamily: 'Poppins-Regular',
          fontSize: 14,
          color: '#333',
          position: 'absolute', // Position it absolutely
          top: '50%', // Center vertically
          left: 10, // Align to left
          transform: 'translateY(-50%)', // Perfect vertical centering
          zIndex: 1, // Ensure it's above other elements
        }}>
          {displayText}
        </Text>

        {children}
      </selectComponents.ValueContainer>
    );
  };
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const modalContainerRef = useRef<View>(null);

  const getFilterSectionZIndex = (index: number) => {
    if (openDropdownIndex === null) return 1000;
    if (openDropdownIndex === index) {
      // Give the last dropdown (complexity) an even higher z-index
      return index === filterConfigs.length - 1 ? 9999999 : 99999;
    }
    return 1000;
  };

  const handleDropdownChange = (index: number, isOpen: boolean) => {
    setOpenDropdownIndex(isOpen ? index : null);

    // Check if this is the last dropdown (complexity) opening
    const isLastDropdown = index === filterConfigs.length - 1;

    // Auto-scroll when the last dropdown (complexity) opens
    if (isOpen && isLastDropdown) {

      // Small delay to ensure the dropdown is rendered before scrolling
      setTimeout(() => {
        // Scroll to show the last dropdown with enough space for the dropdown menu
        const dropdownHeight = 200; // maxHeight from menuList styles
        const extraPadding = 30; // Extra padding for better visibility
        const scrollOffset = dropdownHeight + extraPadding;

        // Try scrolling the ScrollView first
        scrollViewRef.current?.scrollTo({
          y: scrollOffset,
          animated: true
        });

        // Also try scrolling the modal container if available
        if (modalContainerRef.current) {
          // For web, we can use window.scrollTo as a fallback
          if (Platform.OS === 'web') {
            window.scrollTo({
              top: scrollOffset,
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
  };

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+'])
    .map(_ => ({ value: parseInt(_), label: _ }));
  const timeOptions = [
    { value: 1, min: 1, max: 30, label: '30 min or less' },
    { value: 31, min: 31, max: 60, label: '31-60 min' },
    { value: 61, min: 61, max: 90, label: '61-90 min' },
    { value: 91, min: 91, max: 120, label: '91-120 min' },
    { value: 121, min: 121, max: Infinity, label: 'More than 120 min' },
  ];
  const ageOptions = [
    { value: 1, min: 1, max: 5, label: '5 and under' },
    { value: 6, min: 6, max: 7, label: '6-7' },
    { value: 8, min: 8, max: 9, label: '8-9' },
    { value: 10, min: 10, max: 11, label: '10-11' },
    { value: 12, min: 12, max: 13, label: '12-13' },
    { value: 14, min: 14, max: 15, label: '14-15' },
    { value: 16, min: 16, max: Infinity, label: '16 and up' },
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

  const toggleFilterOption = (
    option: FilterOption,
    currentValues: FilterOption[],
    setter: (value: FilterOption[]) => void
  ) => {
    const isSelected = currentValues.some(v => v.value === option.value);
    if (isSelected) {
      setter(currentValues.filter(v => v.value !== option.value));
    } else {
      setter([...currentValues, option]);
    }
  };

  const clearAllFilters = () => {
    filterConfigs.forEach(config => {
      config.onChange([]);
    });
  }

  const handleApplyFilters = () => {
    onApplyFilters();
  };

  // Select styles with Safari-friendly tweaks and dynamic z-index support
  const getSelectStyles = (index: number) => {
    const baseSelectStyles = {
      control: (baseStyles: any) => ({
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
        ...(isSafari?.() && {
          WebkitAppearance: 'none',
          WebkitBorderRadius: 8,
        }),
      }),
      container: (baseStyles: any) => ({
        ...baseStyles,
        marginBottom: 6,
        position: 'relative',
        zIndex: getFilterSectionZIndex(index),
      }),
      menu: (baseStyles: any) => ({
        ...baseStyles,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e1e5ea',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: getFilterSectionZIndex(index),
        position: 'absolute',
        maxHeight: 'none',
        overflow: 'visible',
        ...(isSafari?.() && {
          WebkitBorderRadius: 8,
        }),
      }),
      menuList: (baseStyles: any) => ({
        ...baseStyles,
        maxHeight: 200, // Increased to accommodate all 5 complexity options
        overflow: 'auto',
      }),
      option: (baseStyles: any, state: any) => ({
        ...baseStyles,
        backgroundColor: state.isFocused ? '#fff5ef' : 'transparent',
        color: '#333333',
      }),
      placeholder: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#999999',
      }),
      // clearIndicator: (baseStyles: any) => ({
      //   ...baseStyles,
      //   color: '#666666',
      //   fontSize: 11,
      //   fontFamily: 'Poppins-SemiBold',
      //   padding: '2px 6px',
      //   cursor: 'pointer',
      //   '&:hover': { color: '#ff9654' },
      //   '& svg': { display: 'none' },
      //   '&::after': { content: '"CLR"', display: 'block' },
      // }),
      multiValueLabel: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
      }),
      noOptionsMessage: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
      }),
    };

    return baseSelectStyles;
  };

  if (!isVisible) return null;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={18} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        {description}
      </Text>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 4, paddingTop: 2 }}
        showsVerticalScrollIndicator={true}
      >
        {filterConfigs.map((config, index) => (
          <View key={config.key} style={[styles.filterSection, { zIndex: getFilterSectionZIndex(index) }]}>
            <Select
              placeholder={config.placeholder}
              value={config.value}
              onChange={(value) => config.onChange(Array.from(value || []))}
              options={config.options}
              defaultValue={[]}
              isMulti
              isClearable
              isSearchable={false}
              closeMenuOnSelect={false}
              blurInputOnSelect={false}
              hideSelectedOptions={false}
              styles={getSelectStyles(index)}
              onMenuOpen={() => handleDropdownChange(index, true)}
              onMenuClose={() => handleDropdownChange(index, false)}
              formatOptionLabel={(option: any) => {
                const isSelected = config.value.some(v => v.value === option.value);
                return (
                  <View style={styles.optionRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={12} color="#ffffff" />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                  </View>
                );
              }}
              components={{
                ...selectComponents,
                ValueContainer: CustomValueContainer,
                MultiValue: () => null, // Hides default multi-value pills
                Placeholder: () => null,
              }}
            />
          </View>
        ))}

        {/* Clear All Button */}
        <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
          <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={handleApplyFilters}
      >
        <Text style={styles.applyButtonText}>{applyButtonText}</Text>
      </TouchableOpacity>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.overlay}>
        <View
          ref={modalContainerRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            overflow: 'visible',
          }}
        >
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
      is_match &&= playerCount.some(({ value }) => (
        // Ignore game.min_players when 15+ is selected,
        // since the number of actual players could be arbitrarily large.
        (Math.min(game.min_players, game.min_exp_players || Infinity) <= value || value === 15)
        && value <= (Math.max(game.max_players, game.max_exp_players))
      ));
    }

    if (playTime.length) {
      is_match &&= playTime.some((t: FilterOption) => {
        const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
        // Perhaps this should incorporate game.minplaytime and game.maxplaytime more sensibly
        return (
          t.min! <= time
          && time <= t.max!
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
    overflow: 'visible',
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
    overflow: 'visible',
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
  filterSection: {
    marginBottom: 6,
    position: 'relative',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  checkboxSelected: {
    backgroundColor: '#ff9654',
    borderColor: '#ff9654',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  optionTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  applyButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  applyButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  clearAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333333',
  },
  debugText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ff9654',
    textAlign: 'center',
    backgroundColor: '#fff5ef',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
});

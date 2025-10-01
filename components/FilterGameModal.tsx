import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import Select, { components as selectComponents } from 'react-select';
import { isSafari } from '@/utils/safari-polyfill';
import { Game } from '@/types/game';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

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
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();

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
          fontFamily: typography.getFontFamily('normal'),
          fontSize: typography.fontSize.subheadline,
          color: colors.text,
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
          // Use window.scrollTo as a fallback for web
          if (typeof window !== 'undefined') {
            window.scrollTo({
              top: scrollOffset,
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
  };


  const clearAllFilters = () => {
    filterConfigs.forEach(config => {
      config.onChange([]);
    });
    announceForAccessibility('All filters cleared');
  }

  const handleApplyFilters = () => {
    announceForAccessibility('Filters applied successfully');
    onApplyFilters();
  };

  // Select styles with Safari-friendly tweaks and dynamic z-index support
  const getSelectStyles = (index: number) => {
    const baseSelectStyles = {
      control: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: typography.getFontFamily('normal'),
        fontSize: typography.fontSize.subheadline,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: 8,
        minHeight: 44,
        boxShadow: 'none',
        '&:hover': {
          borderColor: colors.accent,
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
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.card,
      }),
      option: (baseStyles: any, state: any) => ({
        ...baseStyles,
        backgroundColor: state.isFocused ? colors.tints.accent : 'transparent',
        color: colors.text,
      }),
      placeholder: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: typography.getFontFamily('normal'),
        fontSize: typography.fontSize.body,
        color: colors.textMuted,
      }),
      multiValueLabel: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: typography.getFontFamily('normal'),
        fontSize: typography.fontSize.caption1,
        color: colors.text,
      }),
      noOptionsMessage: (baseStyles: any) => ({
        ...baseStyles,
        fontFamily: typography.getFontFamily('normal'),
        fontSize: typography.fontSize.caption1,
        color: colors.textMuted,
      }),
    };

    return baseSelectStyles;
  };

  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  if (!isVisible) return null;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityHint="Closes the filter modal"
          hitSlop={touchTargets.small}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        {description}
      </Text>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
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
                      {isSelected && <Check size={12} color={colors.card} />}
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
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={clearAllFilters}
          accessibilityLabel="Clear all filters"
          accessibilityHint="Removes all applied filters"
          hitSlop={touchTargets.small}
        >
          <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={handleApplyFilters}
        accessibilityLabel="Apply filters"
        accessibilityHint="Applies the selected filters to the collection"
        hitSlop={touchTargets.small}
      >
        <Text style={styles.applyButtonText}>{applyButtonText}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.overlay}>
      <View
        ref={modalContainerRef}
        style={styles.dialog}
      >
        {content}
      </View>
    </View>
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

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.tints.neutral,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    padding: 20,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 8,
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,

  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.text,
  },
  description: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.caption1,
    color: colors.textMuted,
    marginBottom: 8,
    paddingTop: 2,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollViewContent: {
    paddingBottom: 4,
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
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: colors.card,
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  optionText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.footnote,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.accent,
    fontFamily: typography.getFontFamily('semibold'),
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 0,
  },
  applyButtonText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  clearAllButtonText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: colors.text,
  },
  debugText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.caption1,
    color: colors.accent,
    textAlign: 'center',
    backgroundColor: colors.tints.accent,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
});

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { playerOptions, ageOptions } from '@/utils/filterOptions';

interface Option {
  label: string;
  value: string | number;
}

type FilterType = 'dropdown' | 'number' | 'textinput';

interface FilterFieldProps {
  type: FilterType;
  label: string;
  placeholder?: string;
  options?: Option[];
  value: any;
  onChange: (value: any) => void;
  // When true, render numeric range inputs (max with optional min)
  range?: boolean;
  maxPlaceholder?: string;
  minPlaceholder?: string;
  // Range type for determining which preset options to use
  rangeType?: 'playerCount' | 'age';
}

export const FilterField: React.FC<FilterFieldProps> = ({
  type,
  label,
  placeholder = '',
  options = [],
  value,
  onChange,
  range = false,
  maxPlaceholder,
  minPlaceholder,
  rangeType
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [minModalVisible, setMinModalVisible] = useState(false);
  const { colors, typography, touchTargets } = useTheme();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  if (range) {
    // Range mode: show Max first; reveal Min once Max has content
    const currentMin: number | undefined = Array.isArray(value) && value[0]?.min != null ? value[0].min : undefined;
    const currentMax: number | undefined = Array.isArray(value) && value[0]?.max != null ? value[0].max : undefined;

    // Get the appropriate options based on range type
    const rangeOptions = rangeType === 'playerCount' ? playerOptions : ageOptions;

    const updateRange = (min: number | undefined, max: number | undefined) => {
      if (min != null && max != null && min > max) {
        Alert.alert(
          'Invalid Range',
          'Minimum value cannot be greater than maximum value. Please select a lower minimum value.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (min == null && max == null) {
        onChange([]);
        return;
      }

      onChange([{ label: 'range', value: 'range', min, max }]);
    };

    const selectMaxValue = (selectedValue: number) => {
      // For player count, auto-set min to max value initially
      const initialMin = rangeType === 'playerCount' ? selectedValue : currentMin;
      updateRange(initialMin, selectedValue);
    };

    const selectMinValue = (selectedValue: number) => {
      updateRange(selectedValue, currentMax);
    };

    const getDisplayText = (value: number | undefined, placeholder: string, isMax: boolean = true) => {
      if (value == null) return placeholder;
      const option = rangeOptions.find(opt => opt.value === value);
      const valueLabel = option ? option.label : String(value);
      const rangeLabel = isMax ? '(Max Range)' : '(Min Range)';
      return `${valueLabel} ${rangeLabel}`;
    };

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>

        {/* Max Value Selection */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label} - Maximum`}
          accessibilityHint="Opens maximum value options"
          hitSlop={touchTargets.small}
        >
          <Text style={currentMax != null ? styles.inputText : styles.inputPlaceholder}>
            {getDisplayText(currentMax, maxPlaceholder || 'Select Max', true)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Min Value Selection - only show if max is selected */}
        {currentMax != null && (
          <TouchableOpacity
            style={[styles.input, styles.minInput]}
            onPress={() => setMinModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${label} - Minimum`}
            accessibilityHint="Opens minimum value options"
            hitSlop={touchTargets.small}
          >
            <Text style={currentMin != null ? styles.inputText : styles.inputPlaceholder}>
              {getDisplayText(currentMin, minPlaceholder || 'Select Min', false)}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Max Value Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
          presentationStyle="overFullScreen"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer} accessible accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label} - Maximum</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={touchTargets.small}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                keyboardShouldPersistTaps="handled"
                data={rangeOptions}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => {
                  const isSelected = currentMax === item.value;
                  return (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => {
                        selectMaxValue(item.value as number);
                        setModalVisible(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!isSelected }}
                      hitSlop={touchTargets.small}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={colors.card} />}
                      </View>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => {
                  updateRange(currentMin, undefined);
                  setModalVisible(false);
                }} hitSlop={touchTargets.small}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  hitSlop={touchTargets.small}
                >
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Min Value Modal */}
        <Modal
          visible={minModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMinModalVisible(false)}
          presentationStyle="overFullScreen"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer} accessible accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label} - Minimum</Text>
                <TouchableOpacity
                  onPress={() => setMinModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={touchTargets.small}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                keyboardShouldPersistTaps="handled"
                data={rangeOptions}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => {
                  const isSelected = currentMin === item.value;
                  const isDisabled = currentMax != null && (item.value as number) > currentMax;
                  return (
                    <TouchableOpacity
                      style={[styles.optionRow, isDisabled && styles.optionRowDisabled]}
                      onPress={() => {
                        if (!isDisabled) {
                          selectMinValue(item.value as number);
                          setMinModalVisible(false);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!isSelected, disabled: isDisabled }}
                      hitSlop={touchTargets.small}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected, isDisabled && styles.checkboxDisabled]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={colors.card} />}
                      </View>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                          isDisabled && styles.optionLabelDisabled
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => {
                  updateRange(undefined, currentMax);
                  setMinModalVisible(false);
                }} hitSlop={touchTargets.small}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMinModalVisible(false)}
                  hitSlop={touchTargets.small}
                >
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (type === 'number' || type === 'textinput') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.accent}
          selectionColor={colors.accent}
          value={value?.toString()}
          onChangeText={(text) => {
            if (type === 'number') {
              const parsed = parseFloat(text);
              onChange(isNaN(parsed) ? 0 : parsed);
            } else {
              onChange(text);
            }
          }}
          keyboardType={type === 'number' ? 'numeric' : 'default'}
          returnKeyType={type === 'number' ? 'done' : 'default'}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    );
  }

  // Dropdown case
  const toggleSelection = (option: Option) => {
    const exists = value?.some((v: Option) => v.value === option.value);
    if (exists) {
      onChange(value.filter((v: Option) => v.value !== option.value));
    } else {
      onChange([...(value || []), option]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens filter options"
        hitSlop={touchTargets.small}
      >
        <Text style={value?.length ? styles.inputText : styles.inputPlaceholder}>
          {value?.length ? `${value.length} selected` : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer} accessible accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={touchTargets.small}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No options available</Text>
              </View>
            ) : (
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={options}
                keyExtractor={(item) => item.value.toString()}
                renderItem={({ item }) => {
                  const isSelected = value?.some((v: Option) => v.value === item.value);
                  return (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() => toggleSelection(item)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: !!isSelected }}
                      hitSlop={touchTargets.small}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={colors.card} />}
                      </View>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => onChange([])} hitSlop={touchTargets.small}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={touchTargets.small}
              >
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.footnote,
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  inputText: {
    color: colors.text,
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
  },
  inputPlaceholder: {
    color: colors.textMuted,
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 8,
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
    color: colors.text,
    backgroundColor: colors.card,
  },
  minInput: {
    marginTop: 8,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  optionLabelDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.tints.neutral,
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textMuted,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionLabel: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.footnote,
    color: colors.text,
  },
  optionLabelSelected: {
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.accent,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.footnote,
    color: colors.textMuted,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  clearButton: {
    color: colors.textMuted,
    fontFamily: typography.getFontFamily('semibold'),
  },
  doneButton: {
    color: colors.accent,
    fontFamily: typography.getFontFamily('semibold'),
  },
});


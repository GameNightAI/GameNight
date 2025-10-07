import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

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
  // Optional input clamps
  clamp?: { min?: number; max?: number };
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
  clamp
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { colors, typography, touchTargets } = useTheme();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  if (range) {
    // Range mode: show Max first; reveal Min once Max has content
    const currentMin: number | undefined = Array.isArray(value) && value[0]?.min != null ? value[0].min : undefined;
    const currentMax: number | undefined = Array.isArray(value) && value[0]?.max != null ? value[0].max : undefined;

    const coerceWithinClamp = (n: number | undefined) => {
      if (n == null || isNaN(n)) return undefined;
      const minC = clamp?.min ?? undefined;
      const maxC = clamp?.max ?? undefined;
      let out = n;
      if (minC != null && out < minC) out = minC;
      if (maxC != null && out > maxC) out = maxC;
      return out;
    };

    const updateRange = (min: number | undefined, max: number | undefined) => {
      const finalMin = coerceWithinClamp(min);
      const finalMax = coerceWithinClamp(max);
      if (finalMin == null && finalMax == null) {
        onChange([]);
        return;
      }
      // Enforce inclusive bounds ordering: if min > max, swap
      let outMin = finalMin;
      let outMax = finalMax;
      if (outMin != null && outMax != null && outMin > outMax) {
        const t = outMin; outMin = outMax; outMax = t;
      }
      onChange([{ label: 'range', value: 'range', min: outMin, max: outMax }]);
    };

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.rangeRow}>
          <TextInput
            style={[styles.textInput, styles.rangeField]}
            placeholder={maxPlaceholder || 'Max'}
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.accent}
            selectionColor={colors.accent}
            value={currentMax != null ? String(currentMax) : ''}
            onChangeText={(text) => {
              const parsed = parseFloat(text);
              updateRange(currentMin, isNaN(parsed) ? undefined : parsed);
            }}
            keyboardType={'number-pad'}
            returnKeyType={'done'}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {currentMax != null && (
            <TextInput
              style={[styles.textInput, styles.rangeField]}
              placeholder={minPlaceholder || 'Min'}
              placeholderTextColor={colors.textMuted}
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              value={currentMin != null ? String(currentMin) : ''}
              onChangeText={(text) => {
                const parsed = parseFloat(text);
                updateRange(isNaN(parsed) ? undefined : parsed, currentMax);
              }}
              keyboardType={'number-pad'}
              returnKeyType={'done'}
              autoCorrect={false}
              autoCapitalize="none"
            />
          )}
        </View>
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

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={colors.textMuted}
                cursorColor={colors.accent}
                selectionColor={colors.accent}
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchTerm?.length ? (
                <TouchableOpacity
                  onPress={() => setSearchTerm('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={touchTargets.small}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {filteredOptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No results</Text>
              </View>
            ) : (
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={filteredOptions}
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
  rangeRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  rangeField: {
    flex: 1,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: colors.card,
    columnGap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.subheadline,
    color: colors.text,
    padding: 0,
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


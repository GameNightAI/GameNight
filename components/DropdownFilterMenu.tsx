import React, { useState } from 'react';
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
}

export const FilterField: React.FC<FilterFieldProps> = ({
  type,
  label,
  placeholder = '',
  options = [],
  value,
  onChange
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (type === 'number' || type === 'textinput') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
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
      >
        <Text style={styles.inputText}>
          {value?.length ? `${value.length} selected` : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{label}</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = value?.some((v: Option) => v.value === item.value);
                return (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => toggleSelection(item)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => onChange([])}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#aaa',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
  },
  optionLabelSelected: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  clearButton: {
    color: '#666',
  },
  doneButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

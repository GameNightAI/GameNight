import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import CreateEventModal from '@/components/CreateEventModal';

const { width } = Dimensions.get('window');

type TabType = 'all' | 'created' | 'invited';

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header with Create Event Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'created' && styles.activeTab]}
              onPress={() => setActiveTab('created')}
            >
              <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>Created</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'invited' && styles.activeTab]}
              onPress={() => setActiveTab('invited')}
            >
              <Text style={[styles.tabText, activeTab === 'invited' && styles.activeTabText]}>Invited</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Event List Placeholder */}
      <ScrollView contentContainerStyle={styles.listContent}>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            {activeTab === 'all' && 'All events you created or are invited to will appear here.'}
            {activeTab === 'created' && 'Events you created will appear here.'}
            {activeTab === 'invited' && 'Events you are invited to will appear here.'}
          </Text>
        </View>
      </ScrollView>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={(payload) => {
          // handle event creation here (e.g., save to backend or state)
          setCreateModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 8,
  },
  header: {
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginRight: 8,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  tabsWrapper: {
    width: '100%',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    flexShrink: 1,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#1a2b5f',
    fontFamily: 'Poppins-SemiBold',
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  placeholderBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    maxWidth: width - 32,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
}); 
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME_KEY = 'voter_name';
const VOTED_PREFIX = 'voted_';
const VOTE_UPDATED_PREFIX = 'vote_updated_';
const LAST_TAB_KEY = 'last_visited_tab';

// Safari-compatible storage with fallbacks
class SafariCompatibleStorage {
  private memoryFallback: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      // Also store in memory as fallback
      this.memoryFallback.set(key, value);
    } catch (error) {
      console.warn(`AsyncStorage setItem failed for key ${key}:`, error);
      // Fallback to memory storage
      this.memoryFallback.set(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        // Update memory fallback
        this.memoryFallback.set(key, value);
        return value;
      }
    } catch (error) {
      console.warn(`AsyncStorage getItem failed for key ${key}:`, error);
    }

    // Fallback to memory storage
    return this.memoryFallback.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`AsyncStorage removeItem failed for key ${key}:`, error);
    }
    // Always remove from memory fallback
    this.memoryFallback.delete(key);
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('AsyncStorage clear failed:', error);
    }
    // Always clear memory fallback
    this.memoryFallback.clear();
  }
}

// Create a singleton instance
const storage = new SafariCompatibleStorage();

// Export the storage methods
export const saveUsername = async (username: string): Promise<void> => {
  await storage.setItem(USERNAME_KEY, username);
};

export const getUsername = async (): Promise<string | null> => {
  return await storage.getItem(USERNAME_KEY);
};

export const removeUsername = async (): Promise<void> => {
  await storage.removeItem(USERNAME_KEY);
};

// Voting-specific storage methods
export const saveVotedFlag = async (pollId: string): Promise<void> => {
  await storage.setItem(`${VOTED_PREFIX}${pollId}`, 'true');
};

export const getVotedFlag = async (pollId: string): Promise<boolean> => {
  const flag = await storage.getItem(`${VOTED_PREFIX}${pollId}`);
  return flag === 'true';
};

export const saveVoteUpdatedFlag = async (pollId: string): Promise<void> => {
  await storage.setItem(`${VOTE_UPDATED_PREFIX}${pollId}`, 'true');
};

export const getVoteUpdatedFlag = async (pollId: string): Promise<boolean> => {
  const flag = await storage.getItem(`${VOTE_UPDATED_PREFIX}${pollId}`);
  return flag === 'true';
};

export const removeVoteUpdatedFlag = async (pollId: string): Promise<void> => {
  await storage.removeItem(`${VOTE_UPDATED_PREFIX}${pollId}`);
};

// Tab navigation storage methods
export const saveLastVisitedTab = async (tabName: string): Promise<void> => {
  await storage.setItem(LAST_TAB_KEY, tabName);
};

export const getLastVisitedTab = async (): Promise<string | null> => {
  return await storage.getItem(LAST_TAB_KEY);
};

export const removeLastVisitedTab = async (): Promise<void> => {
  await storage.removeItem(LAST_TAB_KEY);
};

// Export the storage instance for direct access if needed
export { storage };
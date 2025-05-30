import AsyncStorage from '@react-native-async-storage/async-storage';

const USERNAME_KEY = '@bgg_username';

export const storeUsername = async (username: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(USERNAME_KEY, username);
  } catch (e) {
    console.error('Error saving username:', e);
  }
};

export const getUsername = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(USERNAME_KEY);
  } catch (e) {
    console.error('Error getting username:', e);
    return null;
  }
};

export const clearUsername = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USERNAME_KEY);
  } catch (e) {
    console.error('Error clearing username:', e);
  }
};
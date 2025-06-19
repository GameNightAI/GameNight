import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid'; // or use nanoid

export async function getOrCreateAnonId(): Promise<string> {
  const key = 'anon_id';
  let id = await AsyncStorage.getItem(key);

  if (!id) {
    id = uuidv4(); // or nanoid()
    await AsyncStorage.setItem(key, id);
  }

  return id;
}
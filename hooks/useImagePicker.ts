import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface ImageData {
  uri: string;
  name: string;
  type: string;
}

interface UseImagePickerReturn {
  image: ImageData | null;
  loading: boolean;
  error: string | null;
  pickImage: (fromCamera: boolean) => Promise<void>;
  clearImage: () => void;
  reset: () => void;
}

export const useImagePicker = (): UseImagePickerReturn => {
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearImage = useCallback(() => {
    // Clear the current image from memory
    if (image?.uri) {
      // Force garbage collection of image URI
      setImage(null);
    }
  }, [image]);

  const reset = useCallback(() => {
    clearImage();
    setError(null);
    setLoading(false);
  }, [clearImage]);

  const pickImage = useCallback(async (fromCamera: boolean) => {
    try {
      setLoading(true);
      setError(null);

      // Cancel any ongoing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Check permissions first
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Media library permission is required to select photos.');
          return;
        }
      }

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.7,
          allowsEditing: false,
          // Optimize for memory usage
          exif: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.7,
          allowsEditing: false,
          // Optimize for memory usage
          exif: false,
        });
      }

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const imageData: ImageData = {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.type || 'image/jpeg',
        };

        // Clear previous image before setting new one
        clearImage();
        setImage(imageData);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Operation was aborted, don't show error
        return;
      }
      console.error('Error picking image:', err);
      setError(err instanceof Error ? err.message : 'Failed to pick image');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [clearImage]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearImage();
  }, [clearImage]);

  return {
    image,
    loading,
    error,
    pickImage,
    clearImage,
    reset,
  };
};

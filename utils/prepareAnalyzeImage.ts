import { Image, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_EDGE = 1024;
const MAX_PAYLOAD_LENGTH = 4_000_000;
const JPEG_MIME = 'image/jpeg';

export type PreparedAnalyzeImage = {
  imageBase64: string;
  mimeType: typeof JPEG_MIME;
};

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

function computeResizeDimensions(width: number, height: number): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) {
    return null;
  }

  const scale = MAX_EDGE / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Could not read prepared photo.');
    }
    const blob = await response.blob();
    return blobToBase64(blob);
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Could not encode prepared photo.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function prepareAnalyzeImage(uri: string): Promise<PreparedAnalyzeImage> {
  let resize: { width: number; height: number } | null = null;

  try {
    const { width, height } = await getImageSize(uri);
    resize = computeResizeDimensions(width, height);
  } catch {
    resize = { width: MAX_EDGE, height: MAX_EDGE };
  }

  const actions = resize ? [{ resize }] : [];

  let manipulated;
  try {
    manipulated = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
  } catch {
    throw new Error("Couldn't prepare photo. Try again or choose a different image.");
  }

  const imageBase64 = await readUriAsBase64(manipulated.uri);
  const mimeType = JPEG_MIME;

  const payloadLength = JSON.stringify({ imageBase64, mimeType }).length;
  if (payloadLength > MAX_PAYLOAD_LENGTH) {
    throw new Error('Photo is too large. Try a closer crop or retake.');
  }

  return { imageBase64, mimeType };
}

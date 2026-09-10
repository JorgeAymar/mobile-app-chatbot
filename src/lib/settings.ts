import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'es';

export type Settings = {
  baseUrl: string;
  model: string;
  authHeader: string; // optional, e.g. "Bearer xxx" or "Basic xxx" if your reverse proxy requires it
  language: Language;
};

const STORAGE_KEY = 'ollama_chat_settings';

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://ollama.labshub.cc',
  model: 'gpt-oss:20b-cloud',
  // Don't hardcode the token here: set it from the Profile tab (stored on-device only).
  authHeader: '',
  language: 'en',
};

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

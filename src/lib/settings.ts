import AsyncStorage from '@react-native-async-storage/async-storage';

export type Settings = {
  baseUrl: string;
  model: string;
  authHeader: string; // optional, e.g. "Bearer xxx" or "Basic xxx" if your reverse proxy requires it
};

const STORAGE_KEY = 'ollama_chat_settings';

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://ollama.labshub.cc',
  model: 'gpt-oss:20b-cloud',
  // No pongas el token aquí: configúralo desde la pantalla de ⚙️ (se guarda solo en el dispositivo).
  authHeader: '',
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

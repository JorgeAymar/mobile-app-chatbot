import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './ollama';

export type StoredMessage = ChatMessage & { id: string };

export type Conversation = {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'ollama_chat_history';

export async function loadConversations(): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const list: Conversation[] = JSON.parse(raw);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function upsertConversation(conversation: Conversation): Promise<void> {
  const list = await loadConversations();
  const idx = list.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) list[idx] = conversation;
  else list.push(conversation);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function deleteConversation(id: string): Promise<void> {
  const list = await loadConversations();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((c) => c.id !== id)));
}

export async function clearConversations(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function titleFromMessages(messages: StoredMessage[], fallback = 'New conversation'): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return fallback;
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  return text.length > 40 ? `${text.slice(0, 40)}…` : text || fallback;
}

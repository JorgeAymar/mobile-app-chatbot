import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { streamChat } from '../lib/ollama';
import { chatViaClaude } from '../lib/claude';
import { DEFAULT_SETTINGS, Settings, loadSettings } from '../lib/settings';
import { useI18n } from '../lib/i18n';
import {
  Conversation,
  StoredMessage,
  loadConversations,
  titleFromMessages,
  upsertConversation,
} from '../lib/history';

export default function ChatScreen({
  conversationId,
  onConversationChange,
}: {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<StoredMessage>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef<string | null>(conversationId);
  const createdAtRef = useRef<number>(Date.now());

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    idRef.current = conversationId;
    if (!conversationId) {
      setMessages([]);
      createdAtRef.current = Date.now();
      return;
    }
    loadConversations().then((list) => {
      const found = list.find((c) => c.id === conversationId);
      if (found) {
        setMessages(found.messages);
        createdAtRef.current = found.createdAt;
      }
    });
  }, [conversationId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const persist = useCallback(async (msgs: StoredMessage[]) => {
    if (!msgs.length) return;
    if (!idRef.current) {
      idRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      onConversationChange(idRef.current);
    }
    const conversation: Conversation = {
      id: idRef.current,
      title: titleFromMessages(msgs, t.newConversation),
      messages: msgs,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    };
    await upsertConversation(conversation);
  }, [onConversationChange, t.newConversation]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput('');

    const userMsg: StoredMessage = { id: `${Date.now()}-u`, role: 'user', content: text };
    const assistantId = `${Date.now()}-a`;
    const history = [...messages, userMsg];

    const withAssistant = [...history, { id: assistantId, role: 'assistant' as const, content: '' }];
    setMessages(withAssistant);
    setSending(true);
    scrollToEnd();

    const controller = new AbortController();
    abortRef.current = controller;

    let finalMessages = withAssistant;

    try {
      const respond = settings.useClaudeRouting ? chatViaClaude : streamChat;
      await respond(
        settings,
        history.map(({ role, content }) => ({ role, content })),
        (delta) => {
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m));
            finalMessages = next;
            return next;
          });
          scrollToEnd();
        },
        controller.signal
      );
      await persist(finalMessages);
    } catch (err: any) {
      setError(err?.message ?? 'Error al conectar con Ollama');
      const withoutEmpty = withAssistant.filter((m) => m.id !== assistantId || m.content);
      setMessages(withoutEmpty);
      if (withoutEmpty.length) await persist(withoutEmpty);
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, messages, settings, scrollToEnd, persist]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    idRef.current = null;
    createdAtRef.current = Date.now();
    setMessages([]);
    setError(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orion Chat IA</Text>
        <Pressable onPress={newChat} hitSlop={12}>
          <Text style={styles.newChat}>{t.newChat}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
              {item.content || (sending ? '…' : '')}
            </Text>
          </View>
        )}
        onContentSizeChange={scrollToEnd}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.typeMessage}
            placeholderTextColor="#999"
            multiline
            editable={!sending}
          />
          {sending ? (
            <Pressable style={styles.sendBtn} onPress={stop}>
              <ActivityIndicator color="#fff" size="small" />
            </Pressable>
          ) : (
            <Pressable style={styles.sendBtn} onPress={send} disabled={!input.trim()}>
              <Text style={styles.sendText}>{t.send}</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 18, fontWeight: '600' },
  newChat: { fontSize: 14, color: '#0a84ff', fontWeight: '600' },
  list: { padding: 12, gap: 8 },
  bubble: { maxWidth: '85%', padding: 10, borderRadius: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0a84ff' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  userText: { color: '#fff', fontSize: 15 },
  assistantText: { color: '#111', fontSize: 15 },
  error: { color: '#d00', paddingHorizontal: 16, paddingBottom: 4, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#0a84ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontWeight: '600' },
});

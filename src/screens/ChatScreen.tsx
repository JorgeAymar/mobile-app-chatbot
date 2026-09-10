import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage, streamChat } from '../lib/ollama';
import { DEFAULT_SETTINGS, Settings, loadSettings, saveSettings } from '../lib/settings';

type Message = ChatMessage & { id: string };

export default function ChatScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput('');

    const userMsg: Message = { id: `${Date.now()}-u`, role: 'user', content: text };
    const assistantId = `${Date.now()}-a`;
    const history = [...messages, userMsg];

    setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);
    setSending(true);
    scrollToEnd();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        settings,
        history.map(({ role, content }) => ({ role, content })),
        (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
          );
          scrollToEnd();
        },
        controller.signal
      );
    } catch (err: any) {
      setError(err?.message ?? 'Error al conectar con Ollama');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content));
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, messages, settings, scrollToEnd]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ollama Chat</Text>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12}>
          <Text style={styles.settingsIcon}>⚙️</Text>
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
            placeholder="Escribe un mensaje…"
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
              <Text style={styles.sendText}>Enviar</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <SettingsModal
        visible={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={async (s) => {
          setSettings(s);
          await saveSettings(s);
          setSettingsOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function SettingsModal({
  visible,
  settings,
  onClose,
  onSave,
}: {
  visible: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (visible) setDraft(settings);
  }, [visible, settings]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Configuración</Text>

          <Text style={styles.label}>URL del servidor (VPS)</Text>
          <TextInput
            style={styles.modalInput}
            value={draft.baseUrl}
            onChangeText={(v) => setDraft({ ...draft, baseUrl: v })}
            placeholder="https://tu-dominio.com"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Modelo</Text>
          <TextInput
            style={styles.modalInput}
            value={draft.model}
            onChangeText={(v) => setDraft({ ...draft, model: v })}
            placeholder="llama3.1"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Header Authorization (opcional)</Text>
          <TextInput
            style={styles.modalInput}
            value={draft.authHeader}
            onChangeText={(v) => setDraft({ ...draft, authHeader: v })}
            placeholder="Bearer xxxxx"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalCancel]} onPress={onClose}>
              <Text style={styles.modalBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalSave]} onPress={() => onSave(draft)}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  settingsIcon: { fontSize: 20 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancel: { backgroundColor: '#eee' },
  modalSave: { backgroundColor: '#0a84ff' },
  modalBtnText: { fontWeight: '600' },
});

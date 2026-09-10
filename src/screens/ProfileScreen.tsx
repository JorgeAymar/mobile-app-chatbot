import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { testConnection } from '../lib/ollama';
import { DEFAULT_SETTINGS, Language, Settings, loadSettings, saveSettings } from '../lib/settings';
import { useI18n } from '../lib/i18n';

export default function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; models: string[] } | { ok: false; error: string } | null
  >(null);
  const [showAuthHeader, setShowAuthHeader] = useState(false);

  useEffect(() => {
    loadSettings().then(setDraft);
  }, []);

  const onChange = (patch: Partial<Settings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const onSave = async () => {
    await saveSettings(draft);
    setSaved(true);
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(draft);
    setTestResult(result);
    setTesting(false);
  };

  const onSelectLang = (l: Language) => {
    setLang(l);
    onChange({ language: l });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.profile}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>{t.appearance}</Text>
        <Text style={styles.label}>{t.language}</Text>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => onSelectLang('en')}
          >
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>English</Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, lang === 'es' && styles.langBtnActive]}
            onPress={() => onSelectLang('es')}
          >
            <Text style={[styles.langBtnText, lang === 'es' && styles.langBtnTextActive]}>Español</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>{t.remoteServer}</Text>

        <Text style={styles.label}>{t.serverUrl}</Text>
        <TextInput
          style={styles.input}
          value={draft.baseUrl}
          onChangeText={(v) => onChange({ baseUrl: v })}
          placeholder="https://your-domain.com"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t.model}</Text>
        <TextInput
          style={styles.input}
          value={draft.model}
          onChangeText={(v) => onChange({ model: v })}
          placeholder="gpt-oss:20b-cloud"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>{t.authHeader}</Text>
        <View style={styles.authRow}>
          <TextInput
            style={[styles.input, styles.authInput]}
            value={draft.authHeader}
            onChangeText={(v) => onChange({ authHeader: v })}
            placeholder="Bearer xxxxx"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showAuthHeader}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowAuthHeader((s) => !s)}>
            <Text style={styles.eyeBtnText}>{showAuthHeader ? '🙈' : '👁️'}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.testBtn]} onPress={onTest} disabled={testing}>
            {testing ? (
              <ActivityIndicator color="#0a84ff" size="small" />
            ) : (
              <Text style={styles.testBtnText}>{t.testConnection}</Text>
            )}
          </Pressable>
          <Pressable style={[styles.btn, styles.saveBtn]} onPress={onSave}>
            <Text style={styles.saveBtnText}>{saved ? t.saved : t.save}</Text>
          </Pressable>
        </View>

        {testResult && (
          <View style={[styles.resultBox, testResult.ok ? styles.resultOk : styles.resultError]}>
            {testResult.ok ? (
              <>
                <Text style={styles.resultTitle}>{t.connectionOk}</Text>
                <Text style={styles.resultBody}>
                  {testResult.models.length
                    ? `${t.availableModels}: ${testResult.models.join(', ')}`
                    : t.serverRespondedNoModels}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultTitle}>{t.connectionFailed}</Text>
                <Text style={styles.resultBody}>{testResult.error}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16, gap: 4 },
  section: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  label: { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 14 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  langBtnActive: { backgroundColor: '#0a84ff', borderColor: '#0a84ff' },
  langBtnText: { fontWeight: '600', color: '#333' },
  langBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  authRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authInput: { flex: 1 },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  eyeBtnText: { fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  testBtn: { backgroundColor: '#eef4ff', borderWidth: 1, borderColor: '#0a84ff' },
  testBtnText: { color: '#0a84ff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#0a84ff' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  resultBox: { marginTop: 16, padding: 12, borderRadius: 10 },
  resultOk: { backgroundColor: '#e8f8ee' },
  resultError: { backgroundColor: '#fdecec' },
  resultTitle: { fontWeight: '700', marginBottom: 4 },
  resultBody: { fontSize: 13, color: '#333' },
});

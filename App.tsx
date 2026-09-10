import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ChatScreen from './src/screens/ChatScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { LanguageProvider, useI18n } from './src/lib/i18n';

type Tab = 'chat' | 'history' | 'profile';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <RootNav />
      </LanguageProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

function RootNav() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);

  const openConversation = (id: string) => {
    setConversationId(id);
    setTab('chat');
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === 'chat' && (
          <ChatScreen conversationId={conversationId} onConversationChange={setConversationId} />
        )}
        {tab === 'history' && <HistoryScreen onOpenConversation={openConversation} />}
        {tab === 'profile' && <ProfileScreen />}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
        <View style={styles.tabBar}>
          <TabButton label={t.chat} icon="💬" active={tab === 'chat'} onPress={() => setTab('chat')} />
          <TabButton
            label={t.history}
            icon="🕘"
            active={tab === 'history'}
            onPress={() => setTab('history')}
          />
          <TabButton
            label={t.profile}
            icon="👤"
            active={tab === 'profile'}
            onPress={() => setTab('profile')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1 },
  tabBarSafeArea: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' },
  tabBar: { flexDirection: 'row', paddingTop: 6, paddingBottom: 4 },
  tabButton: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, color: '#999' },
  tabLabelActive: { color: '#0a84ff', fontWeight: '600' },
});

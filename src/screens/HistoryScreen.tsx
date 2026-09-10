import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Conversation, clearConversations, deleteConversation, loadConversations } from '../lib/history';
import { useI18n } from '../lib/i18n';

export default function HistoryScreen({
  onOpenConversation,
}: {
  onOpenConversation: (id: string) => void;
}) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(() => {
    loadConversations().then(setConversations);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onDelete = (id: string) => {
    Alert.alert(t.deleteConversationTitle, t.deleteConversationConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(id);
          refresh();
        },
      },
    ]);
  };

  const onClearAll = () => {
    if (!conversations.length) return;
    Alert.alert(t.clearHistoryTitle, t.clearHistoryConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteAll,
        style: 'destructive',
        onPress: async () => {
          await clearConversations();
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.history}</Text>
        <Pressable onPress={onClearAll} hitSlop={12}>
          <Text style={styles.trash}>🗑️</Text>
        </Pressable>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t.noHistory}</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() => onOpenConversation(item.id)}
              onLongPress={() => onDelete(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.messages.length} {t.messages} · {new Date(item.updatedAt).toLocaleString()}
                </Text>
              </View>
              <Pressable onPress={() => onDelete(item.id)} hitSlop={10}>
                <Text style={styles.itemDelete}>✕</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
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
  trash: { fontSize: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center' },
  list: { padding: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f6f6f6',
    marginBottom: 8,
    gap: 10,
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  itemMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  itemDelete: { fontSize: 16, color: '#c00', paddingHorizontal: 4 },
});

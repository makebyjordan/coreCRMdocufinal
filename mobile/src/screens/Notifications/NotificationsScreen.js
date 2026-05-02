import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../api/client';

const TYPE_CONFIG = {
  TASK_DUE:           { emoji: '⏰', color: '#d97706', bg: '#fef3c7' },
  EXPEDIENT_ASSIGNED: { emoji: '📋', color: '#2563eb', bg: '#dbeafe' },
  DOCUMENT_SIGNED:    { emoji: '✅', color: '#16a34a', bg: '#dcfce7' },
  PHASE_CHANGE:       { emoji: '🔄', color: '#7c3aed', bg: '#ede9fe' },
  NEW_MESSAGE:        { emoji: '💬', color: '#0891b2', bg: '#cffafe' },
  DEFAULT:            { emoji: '🔔', color: '#64748b', bg: '#f1f5f9' },
};

function NotifItem({ item, onRead }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.DEFAULT;
  const timeAgo = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })
    : '';

  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => !item.read && onRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBubble, { backgroundColor: cfg.bg }]}>
        <Text style={styles.icon}>{cfg.emoji}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !item.read && styles.itemTitleBold]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body || item.message}</Text>
        <Text style={styles.itemTime}>{timeAgo}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications-mobile'],
    queryFn: () => api.get('/notifications?limit=30').then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-mobile'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-mobile'] }),
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header con "Marcar todas" */}
      {unreadCount > 0 && (
        <View style={styles.topBar}>
          <Text style={styles.unreadBadge}>{unreadCount} sin leer</Text>
          <TouchableOpacity onPress={() => markAllMutation.mutate()}>
            <Text style={styles.markAll}>Marcar todas leídas</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#1e40af']} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>Sin notificaciones</Text>
          </View>
        ) : (
          notifications.map(n => (
            <NotifItem key={n.id} item={n} onRead={(id) => markReadMutation.mutate(id)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  unreadBadge: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  markAll: { fontSize: 13, color: '#64748b', textDecorationLine: 'underline' },
  scroll: { paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  itemUnread: { backgroundColor: '#eff6ff' },
  iconBubble: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  icon: { fontSize: 18 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, color: '#374151', marginBottom: 3 },
  itemTitleBold: { fontWeight: '700', color: '#1e293b' },
  itemBody: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e40af', marginTop: 6, marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});

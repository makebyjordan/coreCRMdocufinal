import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';

function StatCard({ emoji, label, value, color = '#1e40af' }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AlertItem({ alert }) {
  return (
    <View style={styles.alertItem}>
      <Text style={styles.alertIcon}>⚠️</Text>
      <Text style={styles.alertText} numberOfLines={2}>{alert.message || alert.title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore(s => s.user);
  const nav = useNavigation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
  });

  const stats = data?.stats || {};
  const alerts = alertsData?.alerts || [];

  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#1e40af']} />}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{user?.name || 'Usuario'} 👋</Text>
          <Text style={styles.role}>{user?.role || ''}</Text>
        </View>

        {/* KPIs */}
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.statsGrid}>
          <StatCard emoji="📋" label="Expedientes activos" value={stats.activeExpedients} color="#1e40af" />
          <StatCard emoji="✅" label="Cerrados este mes" value={stats.closedThisMonth} color="#16a34a" />
          <StatCard emoji="👥" label="Clientes" value={stats.totalClients} color="#7c3aed" />
          <StatCard emoji="💰" label="Comisiones (mes)" value={stats.commissionsMonth ? `${stats.commissionsMonth.toLocaleString('es-ES')} €` : '—'} color="#d97706" />
        </View>

        {/* Alertas */}
        {alerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Alertas pendientes</Text>
            <View style={styles.alertsList}>
              {alerts.slice(0, 5).map((a, i) => (
                <AlertItem key={a.id || i} alert={a} />
              ))}
            </View>
          </>
        )}

        {/* Accesos rápidos */}
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.qaButton} onPress={() => nav.navigate('Expedients')}>
            <Text style={styles.qaEmoji}>📋</Text>
            <Text style={styles.qaLabel}>Expedientes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaButton} onPress={() => nav.navigate('Clients')}>
            <Text style={styles.qaEmoji}>👥</Text>
            <Text style={styles.qaLabel}>Clientes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qaButton} onPress={() => nav.navigate('Notifications')}>
            <Text style={styles.qaEmoji}>🔔</Text>
            <Text style={styles.qaLabel}>Alertas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { backgroundColor: '#1e40af', borderRadius: 16, padding: 20, marginBottom: 24 },
  greeting: { fontSize: 14, color: '#93c5fd' },
  userName: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  role: { fontSize: 12, color: '#93c5fd', marginTop: 4, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statEmoji: { fontSize: 22, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  alertsList: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  alertItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertIcon: { fontSize: 16, marginRight: 10 },
  alertText: { flex: 1, fontSize: 13, color: '#374151' },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  qaButton: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  qaEmoji: { fontSize: 24, marginBottom: 6 },
  qaLabel: { fontSize: 12, color: '#374151', fontWeight: '600' },
});

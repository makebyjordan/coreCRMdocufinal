import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/client';

const PHASE_COLORS = {
  CAPTACION: '#7c3aed',
  VALORACION: '#2563eb',
  PUBLICACION: '#0891b2',
  VISITAS: '#059669',
  OFERTA: '#d97706',
  ACUERDO: '#dc2626',
  FIRMAS: '#16a34a',
  ENTREGA: '#374151',
};

function ExpedientCard({ item, onPress }) {
  const phaseColor = PHASE_COLORS[item.currentPhase] || '#64748b';
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{item.code}</Text>
        <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20', borderColor: phaseColor }]}>
          <Text style={[styles.phaseText, { color: phaseColor }]}>{item.currentPhase}</Text>
        </View>
      </View>
      {item.propertyAddress && (
        <Text style={styles.cardAddress} numberOfLines={1}>📍 {item.propertyAddress}</Text>
      )}
      {item.client && (
        <Text style={styles.cardClient} numberOfLines={1}>
          👤 {item.client.firstName} {item.client.lastName}
        </Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.cardType}>{item.operationType}</Text>
        {item.askingPrice && (
          <Text style={styles.cardPrice}>{Number(item.askingPrice).toLocaleString('es-ES')} €</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ExpedientsScreen() {
  const [search, setSearch] = useState('');
  const nav = useNavigation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['expedients-mobile'],
    queryFn: () => api.get('/expedients?limit=50').then(r => r.data),
  });

  const expedients = data?.data || [];
  const filtered = search.length > 1
    ? expedients.filter(e =>
        e.code?.toLowerCase().includes(search.toLowerCase()) ||
        e.propertyAddress?.toLowerCase().includes(search.toLowerCase()) ||
        `${e.client?.firstName} ${e.client?.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : expedients;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Buscador */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar expediente, dirección o cliente..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color="#1e40af" size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ExpedientCard
              item={item}
              onPress={() => nav.navigate('ExpedientDetail', { id: item.id, code: item.code })}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay expedientes</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#1e40af']} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardCode: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  phaseBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  phaseText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAddress: { fontSize: 13, color: '#475569', marginBottom: 4 },
  cardClient: { fontSize: 13, color: '#475569', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});

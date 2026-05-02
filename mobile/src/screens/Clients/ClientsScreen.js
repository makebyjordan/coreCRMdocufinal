import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

function ClientCard({ item }) {
  const initials = `${item.firstName?.[0] || ''}${item.lastName?.[0] || ''}`.toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
        {item.email && <Text style={styles.detail}>✉️ {item.email}</Text>}
        {item.phone && <Text style={styles.detail}>📞 {item.phone}</Text>}
        {item.clientType && <Text style={styles.tag}>{item.clientType}</Text>}
      </View>
      {item.phone && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
          <Text style={styles.callBtn}>📞</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ClientsScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clients-mobile'],
    queryFn: () => api.get('/clients?limit=50').then(r => r.data),
  });

  const clients = data?.data || [];
  const filtered = search.length > 1
    ? clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      )
    : clients;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por nombre, email o teléfono..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1e40af" size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ClientCard item={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay clientes</Text>
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
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e40af', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 3 },
  detail: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  tag: { fontSize: 10, color: '#1e40af', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  callBtn: { fontSize: 22, paddingLeft: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});

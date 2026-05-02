import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';

function ProfileRow({ emoji, label, onPress, danger }) {
  return (
    <TouchableOpacity
      style={[styles.row, danger && styles.rowDanger]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const initials = user
    ? `${user.name?.split(' ')[0]?.[0] || ''}${user.name?.split(' ')[1]?.[0] || ''}`.toUpperCase()
    : 'U';

  function handleLogout() {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'Usuario'}</Text>
          </View>
        </View>

        {/* Opciones */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cuenta</Text>
          <View style={styles.card}>
            <ProfileRow emoji="🔔" label="Notificaciones push" onPress={() => {}} />
            <ProfileRow emoji="🔒" label="Cambiar contraseña" onPress={() => {}} />
            <ProfileRow emoji="🛡️" label="Autenticación en 2 pasos" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.card}>
            <ProfileRow emoji="ℹ️" label="Versión 1.0.0" onPress={() => {}} />
            <ProfileRow emoji="📞" label="Soporte" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <ProfileRow emoji="🚪" label="Cerrar sesión" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },
  profileHeader: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1e40af', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  roleBadge: { backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowDanger: { borderBottomWidth: 0 },
  rowEmoji: { fontSize: 18, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  rowLabelDanger: { color: '#dc2626' },
  chevron: { fontSize: 18, color: '#cbd5e1' },
});

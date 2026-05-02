import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import api from '../../api/client';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function ExpedientDetailScreen() {
  const route = useRoute();
  const { id } = route.params;

  const { data: exp, isLoading } = useQuery({
    queryKey: ['expedient-detail-mobile', id],
    queryFn: () => api.get(`/expedients/${id}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1e40af" size="large" />
      </View>
    );
  }

  if (!exp) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Expediente no encontrado</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.code}>{exp.code}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{exp.operationType}</Text>
          </View>
          <View style={[styles.phaseBadge, { backgroundColor: '#1e40af20' }]}>
            <Text style={[styles.phaseText, { color: '#1e40af' }]}>{exp.currentPhase}</Text>
          </View>
        </View>

        {/* Propiedad */}
        <Section title="🏠 Inmueble">
          <InfoRow label="Dirección" value={exp.propertyAddress} />
          <InfoRow label="Ciudad" value={exp.propertyCity} />
          <InfoRow label="Referencia catastral" value={exp.cadastralRef} />
          <InfoRow label="Superficie" value={exp.surfaceArea ? `${exp.surfaceArea} m²` : null} />
          <InfoRow label="Precio" value={exp.askingPrice ? `${Number(exp.askingPrice).toLocaleString('es-ES')} €` : null} />
        </Section>

        {/* Cliente */}
        {exp.client && (
          <Section title="👤 Cliente">
            <InfoRow label="Nombre" value={`${exp.client.firstName} ${exp.client.lastName}`} />
            <InfoRow label="Email" value={exp.client.email} />
            <InfoRow label="Teléfono" value={exp.client.phone} />
            {exp.client.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${exp.client.phone}`)}
              >
                <Text style={styles.callButtonText}>📞 Llamar al cliente</Text>
              </TouchableOpacity>
            )}
          </Section>
        )}

        {/* Notas */}
        {exp.notes && (
          <Section title="📝 Notas">
            <Text style={styles.notesText}>{exp.notes}</Text>
          </Section>
        )}

        {/* Fecha */}
        <Section title="📅 Fechas">
          <InfoRow label="Creado" value={exp.createdAt ? new Date(exp.createdAt).toLocaleDateString('es-ES') : null} />
          <InfoRow label="Última actualización" value={exp.updatedAt ? new Date(exp.updatedAt).toLocaleDateString('es-ES') : null} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: '#94a3b8' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { backgroundColor: '#1e40af', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'flex-start', gap: 8 },
  code: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  typeBadge: { backgroundColor: '#ffffff20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, color: '#ffffff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  phaseBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  phaseText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  sectionContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#1e293b', fontWeight: '600', flex: 1, textAlign: 'right', paddingLeft: 16 },
  callButton: { marginTop: 12, backgroundColor: '#1e40af', borderRadius: 10, padding: 12, alignItems: 'center' },
  callButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
});

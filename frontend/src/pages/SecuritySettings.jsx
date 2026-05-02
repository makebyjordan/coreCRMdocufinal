import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import PushNotificationSetup from '../components/Mobile/PushNotificationSetup';

export default function SecuritySettings() {
  const [mfaStep, setMfaStep] = useState('idle'); // idle | setup | verify
  const [mfaData, setMfaData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => api.get('/security/sessions').then(r => r.data.sessions),
  });

  const initMFAMutation = useMutation({
    mutationFn: () => api.post('/security/2fa/setup'),
    onSuccess: (res) => {
      setMfaData(res.data);
      setMfaStep('verify');
    },
  });

  const verifyMFAMutation = useMutation({
    mutationFn: () => api.post('/security/2fa/verify', { secret: mfaData.secret, code: totpCode }),
    onSuccess: () => {
      setMfaStep('done');
      setTotpCode('');
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => api.post(`/security/sessions/${sessionId}/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-sessions'] }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => api.post('/security/sessions/revoke-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-sessions'] }),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Seguridad</h1>

      {/* MFA */}
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Autenticación en Dos Pasos (MFA)</h2>
        {mfaStep === 'idle' && (
          <button
            onClick={() => { setMfaStep('setup'); initMFAMutation.mutate(); }}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Activar MFA
          </button>
        )}
        {mfaStep === 'verify' && mfaData && (
          <div className="space-y-4">
            <p className="text-gray-600">Escanea este código QR con tu app autenticadora:</p>
            <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48" />
            <p className="text-sm text-gray-500">Código manual: <code className="bg-gray-100 px-2 py-1 rounded">{mfaData.manualCode}</code></p>
            <div className="flex gap-3">
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                maxLength={6}
                className="border rounded px-3 py-2 w-40"
              />
              <button
                onClick={() => verifyMFAMutation.mutate()}
                disabled={totpCode.length !== 6}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Verificar
              </button>
            </div>
          </div>
        )}
        {mfaStep === 'done' && (
          <div className="text-green-600 font-semibold">✓ MFA activado correctamente</div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <h2 className="text-xl font-semibold mb-6">Notificaciones Push</h2>
        <PushNotificationSetup />
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Sesiones Activas</h2>
          <button
            onClick={() => revokeAllMutation.mutate()}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Cerrar todas
          </button>
        </div>
        {isLoading ? (
          <div>Cargando...</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-500">No hay sesiones activas</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex justify-between items-center p-4 border rounded">
                <div>
                  <div className="font-medium">{session.userAgent || 'Navegador desconocido'}</div>
                  <div className="text-sm text-gray-500">
                    IP: {session.ipAddress || 'N/A'} · Última actividad: {new Date(session.lastActivityAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => revokeSessionMutation.mutate(session.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

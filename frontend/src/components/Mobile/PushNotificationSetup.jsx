/**
 * PushNotificationSetup.jsx
 * Solicita permiso para notificaciones push del navegador (Web Push API),
 * registra el token en el backend y gestiona dispositivos activos.
 *
 * Flujo:
 *  1. Comprueba si el navegador soporta notificaciones
 *  2. Solicita permiso al usuario
 *  3. Envía el token al backend (POST /api/mobile/devices/register)
 *  4. Muestra la lista de dispositivos registrados con opción de eliminar
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Smartphone, Monitor, Apple, Trash2, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

// ─── Hooks de datos ───────────────────────────────────────────────────────────
function useDevices() {
  return useQuery({
    queryKey: ['mobile-devices'],
    queryFn: () => api.get('/mobile/devices').then(r => r.data.data),
  });
}

function useRegisterDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/mobile/devices/register', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-devices'] });
      toast.success('Notificaciones activadas en este dispositivo');
    },
    onError: () => toast.error('No se pudo registrar el dispositivo'),
  });
}

function useUnregisterDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceToken) => api.delete(`/mobile/devices/${encodeURIComponent(deviceToken)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-devices'] });
      toast.success('Dispositivo eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el dispositivo'),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPlatformIcon(platform) {
  if (platform === 'iOS') return <Apple className="w-4 h-4" />;
  if (platform === 'Android') return <Smartphone className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PushNotificationSetup() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentToken, setCurrentToken] = useState(
    () => localStorage.getItem('push_device_token') || null
  );

  const { data: devices = [], isLoading } = useDevices();
  const registerMutation = useRegisterDevice();
  const unregisterMutation = useUnregisterDevice();

  // Soporte del navegador
  const isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  // ─── Solicitar permiso + registrar token ────────────────────────────────────
  async function requestPermission() {
    if (!isSupported) return;
    setIsRequesting(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Permiso denegado. Actívalo manualmente en la configuración del navegador.');
        return;
      }

      // Generar un token de dispositivo web (en producción usarías VAPID + PushManager)
      // Para esta implementación generamos un ID persistente por navegador
      let token = localStorage.getItem('push_device_token');
      if (!token) {
        token = `web_${crypto.randomUUID()}`;
        localStorage.setItem('push_device_token', token);
      }

      setCurrentToken(token);

      const deviceName = `${navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio'} — ${
        navigator.userAgent.includes('Chrome') ? 'Chrome'
        : navigator.userAgent.includes('Firefox') ? 'Firefox'
        : navigator.userAgent.includes('Safari') ? 'Safari'
        : 'Navegador'
      }`;

      await registerMutation.mutateAsync({
        deviceToken: token,
        platform: 'Web',
        deviceName,
      });
    } catch (err) {
      toast.error('Error al activar notificaciones');
    } finally {
      setIsRequesting(false);
    }
  }

  // ─── Desactivar notificaciones en este dispositivo ─────────────────────────
  async function disableOnThisDevice() {
    if (!currentToken) return;
    await unregisterMutation.mutateAsync(currentToken);
    localStorage.removeItem('push_device_token');
    setCurrentToken(null);
  }

  // ─── Enviar notificación de prueba ─────────────────────────────────────────
  function testNotification() {
    if (permission !== 'granted') return;
    new Notification('Docuinmo CRM', {
      body: '¡Las notificaciones funcionan correctamente! ✅',
      icon: '/favicon.ico',
    });
  }

  // ─── Estado del permiso ─────────────────────────────────────────────────────
  const isThisDeviceRegistered = currentToken && devices.some(
    d => d.platform === 'Web' // simplificado; en prod compararíamos el token
  );

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      <div className="rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-full ${
            permission === 'granted' ? 'bg-green-100' :
            permission === 'denied'  ? 'bg-red-100' :
            'bg-slate-100'
          }`}>
            {permission === 'granted'
              ? <Bell className="w-5 h-5 text-green-600" />
              : <BellOff className="w-5 h-5 text-slate-500" />
            }
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 mb-1">
              Notificaciones push
            </h3>

            {!isSupported && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Tu navegador no soporta notificaciones push
              </div>
            )}

            {isSupported && permission === 'default' && (
              <p className="text-sm text-slate-500">
                Recibe alertas de nuevos expedientes, tareas y mensajes directamente en tu dispositivo, aunque no tengas el CRM abierto.
              </p>
            )}

            {isSupported && permission === 'granted' && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Notificaciones activas en este navegador
              </div>
            )}

            {isSupported && permission === 'denied' && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="w-4 h-4" />
                Permiso bloqueado. Ve a Configuración del navegador → Privacidad → Notificaciones para desbloquearlo.
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            {isSupported && permission !== 'granted' && permission !== 'denied' && (
              <button
                onClick={requestPermission}
                disabled={isRequesting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isRequesting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Bell className="w-4 h-4" />
                }
                Activar notificaciones
              </button>
            )}

            {permission === 'granted' && (
              <>
                <button
                  onClick={testNotification}
                  className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Probar notificación
                </button>
                {currentToken && (
                  <button
                    onClick={disableOnThisDevice}
                    disabled={unregisterMutation.isPending}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Desactivar aquí
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lista de dispositivos registrados */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Dispositivos con notificaciones activas
        </h4>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <BellOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay dispositivos registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="text-slate-400">
                  {getPlatformIcon(device.platform)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {device.deviceName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Último uso: {formatDate(device.lastUsedAt)}
                  </p>
                </div>

                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {device.platform}
                </span>

                <button
                  onClick={() => unregisterMutation.mutate(device.deviceToken || device.id)}
                  disabled={unregisterMutation.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar dispositivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <p className="text-xs text-slate-400 text-center">
        Las notificaciones push te avisan de nuevos expedientes asignados, tareas que vencen hoy y documentos firmados.
        Puedes revocarlas en cualquier momento desde aquí o desde la configuración de tu navegador.
      </p>
    </div>
  );
}

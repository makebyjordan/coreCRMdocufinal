import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/client';

/**
 * Registra el token de push notifications en el servidor.
 * Solo funciona en dispositivos físicos (no simuladores).
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('[Push] Las notificaciones push requieren un dispositivo físico');
    return null;
  }

  // Verificar / solicitar permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permiso denegado');
    return null;
  }

  // Android: canal de notificaciones
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Docuinmo CRM',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1e40af',
    });
  }

  // Obtener token Expo push
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenData.data;

  // Registrar en backend
  try {
    await api.post('/mobile/devices/register', {
      deviceToken: expoPushToken,
      platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
      deviceName: `${Device.modelName || 'Dispositivo'} (${Platform.OS})`,
    });
    console.log('[Push] Token registrado:', expoPushToken);
  } catch (err) {
    console.warn('[Push] Error al registrar token:', err.message);
  }

  return expoPushToken;
}

/**
 * Hook para escuchar notificaciones recibidas en primer plano
 * y manejar taps sobre notificaciones.
 */
export function usePushNotificationListeners(onNotification, onResponse) {
  const notifListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Notificación llegó mientras la app está abierta
    notifListener.current = Notifications.addNotificationReceivedListener(onNotification);

    // Usuario tocó la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
      Notifications.removeNotificationSubscription(notifListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [onNotification, onResponse]);
}

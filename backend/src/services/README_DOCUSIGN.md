# Activar la integración con DocuSign

Pasos para pasar del esqueleto actual a una integración funcional contra DocuSign Demo.

## 1. Instalar la SDK
```bash
cd backend
npm install docusign-esign
```

## 2. Crear cuenta y app en DocuSign

1. Crear cuenta gratis en https://developers.docusign.com.
2. En el panel: **Apps and Keys** → **Add App and Integration Key** → anotar el `Integration Key`.
3. En el detalle de la app, sección **Service Integration**, generar un par RSA y descargar la clave privada.
4. Anotar también el `User ID` (en la página de tu perfil) y el `Account ID` (en la URL del panel).

## 3. Configurar el backend

1. Copiar la clave privada a `backend/docusign-private.key`.
2. Rellenar las variables `DOCUSIGN_*` en `.env`.
3. En el primer arranque, el servicio fallará con un error que incluye una URL de consentimiento. Visitarla con el navegador y aceptar. Esto es un paso único.

## 4. Implementar las funciones del servicio

Reemplazar los `throw new DocuSignNotConfiguredError()` de `docusign.service.js` por la implementación real usando la SDK. Cada función tiene su contrato documentado en JSDoc.

Referencias útiles:
- https://github.com/docusign/docusign-esign-node-client
- https://developers.docusign.com/docs/esign-rest-api/how-to/

## 5. Configurar webhooks (DocuSign Connect)

1. Para desarrollo local, levantar un túnel: `ngrok http 4000`.
2. En el panel de DocuSign: **Settings** → **Connect** → **Add Configuration** → **Custom**.
3. URL: `https://<tu-ngrok>.ngrok.io/api/webhooks/docusign`.
4. Formato: JSON.
5. Eventos: `Envelope and Recipients` (todos los estados).
6. Generar un secret HMAC y pegarlo en `DOCUSIGN_WEBHOOK_SECRET` del `.env`.

## 6. Pasar a producción

Cambiar en `.env`:
- `DOCUSIGN_BASE_URL=https://www.docusign.net/restapi` 
- `DOCUSIGN_OAUTH_BASE_URL=account.docusign.com` 
- `PUBLIC_BASE_URL=https://tu-dominio-real.com` 

Y reconfigurar Connect apuntando al dominio real.

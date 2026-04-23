# 🚀 Instrucciones para Iniciar los Servidores

## PROBLEMA DETECTADO
Los servidores Node.js no se están iniciando automáticamente. Sigue estos pasos manuales:

---

## 📋 PASO 1: Abrir Terminales

Abre **DOS** terminales en tu IDE (VS Code):

- Terminal 1: Para el Backend
- Terminal 2: Para el Frontend

---

## 🔧 PASO 2: Iniciar Backend (Terminal 1)

```bash
cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/backend"
npm install
node server.js
```

**Verificación:** Abre http://localhost:4000/health en navegador
Debe mostrar: `{"status":"ok"}`

---

## 🎨 PASO 3: Iniciar Frontend (Terminal 2)

```bash
cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/frontend"
npm install
npm run dev
```

**Verificación:** Abre http://localhost:5173 en navegador

---

## 🔍 Si hay errores de sintaxis

Ejecuta estos comandos de verificación:

```bash
# Verificar backend
cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/backend"
node -c server.js
node -c src/controllers/expedients.controller.js
node -c src/services/calendar-sync.service.js
node -c src/controllers/calendar.controller.js

# Verificar frontend
cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/frontend"
npm run build
```

---

## 📁 Archivos Modificados (Integración Calendario)

### Backend:
- `prisma/schema.prisma` - Relación Signature ↔ CalendarEvent
- `src/services/calendar-sync.service.js` - NUEVO
- `src/controllers/expedients.controller.js` - CRUD firmas
- `src/routes/expedients.routes.js` - Rutas firmas
- `src/controllers/calendar.controller.js` - Filtros por tipo
- `scripts/backfill-calendar-events.js` - NUEVO

### Frontend:
- `src/pages/Calendar.jsx` - Filtros y modal unificado
- `src/pages/ExpedientDetail.jsx` - Panel de firmas
- `src/pages/Dashboard.jsx` - Widget próximos eventos

---

## 🎯 Funcionalidades Implementadas

1. **Firmas → Calendario:** Al crear una firma, aparece automáticamente en el calendario como evento FIRMA (morado)
2. **Estados de firma:** PENDIENTE → ENVIADO → FIRMADO (cambia a verde) → EXPIRADO (rojo)
3. **Filtros en calendario:** Botones para mostrar/ocultar VISITA, FIRMA, LLAMADA, REUNION, OTRO
4. **Modal unificado:** Click en cualquier evento abre modal con detalles específicos según tipo
5. **Dashboard:** Widget "Próximos eventos" con los 5 eventos más cercanos
6. **Panel de firmas:** En expedientes, nueva pestaña "Firmas" para gestionar documentos pendientes

---

## 🆘 Si sigue sin funcionar

1. Verifica que Node.js esté instalado:
   ```bash
   node --version  # Debe mostrar v18+
   npm --version
   ```

2. Limpia caché y reinstala:
   ```bash
   cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/backend"
   rm -rf node_modules package-lock.json
   npm install
   
   cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1/frontend"
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Verifica el archivo .env existe en backend/

---

## ✅ Prueba Final

Una vez iniciados ambos servidores:

1. Abre http://localhost:5173
2. Inicia sesión con: `admin@agencia.com` / `Admin1234!`
3. Ve a un expediente → pestaña "Firmas"
4. Crea una nueva firma
5. Ve al Calendario - debe aparecer el evento FIRMA
6. Ve al Dashboard - debe aparecer en "Próximos eventos"

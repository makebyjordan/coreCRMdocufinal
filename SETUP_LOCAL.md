# 🚀 Guía de Setup Local - Docuinmo CRM + Phase 2 AI/ML

## Requisitos Previos

```bash
Node.js 18+
PostgreSQL 14+
npm o yarn
```

---

## 1️⃣ CONFIGURAR BACKEND

### Paso 1.1: Instalar dependencias
```bash
cd backend
npm install
```

### Paso 1.2: Variables de entorno
Crear `.env` en la carpeta `backend/`:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/docuinmo"
DIRECT_URL="postgresql://user:password@localhost:5432/docuinmo"

# JWT
JWT_SECRET=your-secret-key-here

# Emails
EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# S3 (opcional)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=docuinmo-files

# ⭐ CLAUDE AI (PHASE 2)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
NODE_ENV=development

# Puertos
PORT=4000
```

**Obtén ANTHROPIC_API_KEY:**
1. Ve a https://console.anthropic.com
2. Crea una cuenta o inicia sesión
3. Genera una API key
4. Cópiala en `ANTHROPIC_API_KEY`

### Paso 1.3: Database - Crear y migrar
```bash
# Crear base de datos PostgreSQL
createdb docuinmo

# Aplicar migraciones Prisma
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### Paso 1.4: Iniciar backend
```bash
npm run dev
```

**Esperado:**
```
[nodemon] 4.0.1
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): src/**/* .env
[nodemon] watching extensions: js,json
✓ Server listening on port 4000
```

Backend está en: `http://localhost:4000`

---

## 2️⃣ CONFIGURAR FRONTEND

### Paso 2.1: Instalar dependencias
```bash
cd frontend
npm install
```

### Paso 2.2: Variables de entorno
Crear `.env.local` en `frontend/`:

```env
VITE_API_URL=http://localhost:4000/api
```

### Paso 2.3: Iniciar frontend
```bash
npm run dev
```

**Esperado:**
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h + enter to show help
```

Frontend está en: `http://localhost:5173`

---

## 3️⃣ VERIFICAR INSTALACIÓN

### Paso 3.1: Test Backend Health
```bash
curl http://localhost:4000/api/health
```

### Paso 3.2: Test Frontend
Abre en navegador: `http://localhost:5173`
- Deberías ver la página de Login
- El proxy `/api` redirige a `localhost:4000`

### Paso 3.3: Verificar IA/ML está disponible
```bash
# Con token JWT válido
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/ai/stats
```

---

## 4️⃣ CREDENCIALES DE PRUEBA

En base de datos, necesitas insertar un usuario:

```sql
-- En psql o herramienta DB
INSERT INTO users (id, email, password, name, role, active, "createdAt", "updatedAt")
VALUES (
  'user123',
  'admin@example.com',
  '$2b$10$...',  -- bcrypt hash de 'password123'
  'Admin User',
  'ADMINISTRACION',
  true,
  NOW(),
  NOW()
);
```

O usa la API:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User"
  }'
```

Luego login en `http://localhost:5173/login`

---

## 5️⃣ VER FASE 2 (IA/ML) EN ACCIÓN

### A. En Dashboard
1. Login con credenciales
2. Verás "Inteligencia Artificial" en sidebar (Analytics & Tools)
3. Click para ver hub central de IA

### B. Crear Cliente y Ver Predicción
1. Ve a Clientes → Nuevo Cliente
2. Llena datos y guarda
3. En ficha del cliente, verás widget "Predicción de valor"
4. Click para generar predicción con IA

### C. Crear Expediente y Ver Recomendaciones
1. Ve a Expedientes → Nuevo Expediente
2. Rellena datos y guarda
3. En detalles del expediente, verás tabs:
   - "Recomendaciones inteligentes" (con análisis de IA)
   - "Generador de plantillas" (genera documentos personalizados)

### D. Detectar Clientes Dormidos
1. Ve a Inteligencia Artificial → Tab "Clientes inactivos"
2. Verás lista de clientes sin actividad > 90 días
3. Cada uno tiene plan de reactivación sugerido

### E. Analizar Documentos (OCR)
1. Ve a un Expediente → Tab Documentos
2. Sube un documento
3. Click en botón "Analizar con IA"
4. IA extrae datos y valida integridad

---

## 6️⃣ TROUBLESHOOTING

### Error: "ANTHROPIC_API_KEY is not set"
```bash
# Verificar que está en .env
cat backend/.env | grep ANTHROPIC_API_KEY

# Si no está, agregarlo y reinicia servidor
# npm run dev
```

### Error: "Cannot find module 'ai.service.js'"
```bash
# Asegúrate de que creamos los archivos:
ls -la backend/src/services/ai.service.js
ls -la backend/src/controllers/ai.controller.js
ls -la backend/src/routes/ai.routes.js
```

### Error: "Table does not exist"
```bash
# Aplicar migraciones nuevas
npx prisma migrate dev

# Si fallan, reset (⚠️ borra datos):
npx prisma migrate reset
```

### Lentitud en predicciones
- Es normal: Claude API toma 2-3 segundos por análisis
- Se cachean automáticamente después

### Token JWT inválido
- Realiza login nuevamente en `http://localhost:5173/login`
- El token se guarda en localStorage

---

## 7️⃣ VERIFICAR ARCHIVOS CREADOS

Asegúrate de que estos archivos existen:

**Backend:**
```
backend/src/services/ai.service.js           ✓
backend/src/controllers/ai.controller.js      ✓
backend/src/routes/ai.routes.js              ✓
backend/prisma/schema.prisma (actualizado)   ✓
```

**Frontend:**
```
frontend/src/pages/AIIntelligence.jsx                    ✓
frontend/src/components/AI/ClientPredictionWidget.jsx    ✓
frontend/src/components/AI/DormantClientDetector.jsx     ✓
frontend/src/components/AI/SmartRecommendations.jsx      ✓
frontend/src/components/AI/TemplateGenerator.jsx         ✓
frontend/src/components/AI/DocumentAnalyzer.jsx          ✓
frontend/src/App.jsx (actualizado)                       ✓
frontend/src/components/Layout/Sidebar.jsx (actualizado) ✓
```

---

## 8️⃣ ESTRUCTURA DE CARPETAS (FINAL)

```
docuinmo-claude/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   └── ai.service.js              (NUEVO - FASE 2)
│   │   ├── controllers/
│   │   │   └── ai.controller.js           (NUEVO - FASE 2)
│   │   └── routes/
│   │       ├── ai.routes.js               (NUEVO - FASE 2)
│   │       └── index.js                   (ACTUALIZADO)
│   ├── prisma/
│   │   └── schema.prisma                  (ACTUALIZADO - MODELOS IA)
│   ├── .env                               (NUEVO - CONFIG)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AIIntelligence.jsx         (NUEVO - PÁGINA IA)
│   │   │   ├── Expedients.jsx             (ACTUALIZADO - 3 TABS)
│   │   │   └── Clients.jsx                (ACTUALIZADO - 3 TABS)
│   │   ├── components/
│   │   │   ├── AI/                        (NUEVO - 5 COMPONENTES)
│   │   │   │   ├── ClientPredictionWidget.jsx
│   │   │   │   ├── DormantClientDetector.jsx
│   │   │   │   ├── SmartRecommendations.jsx
│   │   │   │   ├── TemplateGenerator.jsx
│   │   │   │   └── DocumentAnalyzer.jsx
│   │   │   └── Layout/
│   │   │       ├── Header.jsx             (ACTUALIZADO - BELL NOTIFS)
│   │   │       ├── NotificationBell.jsx   (NUEVO)
│   │   │       └── Sidebar.jsx            (ACTUALIZADO - LINK IA)
│   │   ├── App.jsx                        (ACTUALIZADO)
│   │   └── store/authStore.js
│   ├── .env.local                         (NUEVO - CONFIG)
│   └── package.json
└── docs/
    ├── AI_PHASE2.md                       (NUEVO - DOCUMENTACIÓN)
    └── SETUP_LOCAL.md                     (ESTE ARCHIVO)
```

---

## 9️⃣ COMANDOS ÚTILES

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Prisma Studio (opcional - ver BD)
cd backend
npx prisma studio

# Ver logs en tiempo real
tail -f backend/logs/*.log

# Testear endpoints
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/ai/stats
```

---

## 🔟 PRÓXIMOS PASOS DESPUÉS DE VERIFY

1. **Crear datos de prueba:**
   - Crear 3-5 clientes
   - Crear 2-3 expedientes
   - Generar predicciones y recomendaciones

2. **Testear cada feature:**
   - [ ] Predicción de cliente
   - [ ] Detección de dormidos
   - [ ] Recomendaciones de expediente
   - [ ] Generación de plantillas
   - [ ] Análisis de documento

3. **Optimizaciones:**
   - [ ] Verificar caching funciona
   - [ ] Revisar logs de IA
   - [ ] Ajustar modelos de precio si es necesario

---

## 📞 SOPORTE

Si hay errores:

1. **Revisa logs:**
   ```bash
   tail -f backend/logs/error.log
   ```

2. **Verifica variables de entorno:**
   ```bash
   grep ANTHROPIC backend/.env
   ```

3. **Reinicia ambos servidores:**
   ```bash
   # Ctrl+C en ambas terminales
   npm run dev  # Backend y Frontend
   ```

---

¡Listo! Tu Docuinmo CRM con Fase 2 IA/ML está configurado y listo para usar 🚀

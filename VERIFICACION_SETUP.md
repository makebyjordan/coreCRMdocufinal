# ✅ CHECKLIST DE VERIFICACIÓN - SETUP LOCAL

## Antes de Empezar

- [ ] PostgreSQL instalado y ejecutándose
- [ ] Node.js 18+ instalado
- [ ] Acceso a Anthropic API (ANTHROPIC_API_KEY)

---

## PASO 1: Backend

```bash
cd backend
```

### Verificar Archivos
- [ ] `src/services/ai.service.js` existe
- [ ] `src/controllers/ai.controller.js` existe
- [ ] `src/routes/ai.routes.js` existe
- [ ] `src/routes/index.js` contiene `router.use('/ai', authenticate, require('./ai.routes'))`
- [ ] `prisma/schema.prisma` tiene modelos AI (ClientPrediction, etc)

### Verificar Configuración
```bash
# Crear .env con:
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/docuinmo"
DIRECT_URL="postgresql://user:password@localhost:5432/docuinmo"
JWT_SECRET=test-secret-key
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=development
PORT=4000
EMAIL_ENABLED=false
EOF
```

- [ ] `.env` creado con `ANTHROPIC_API_KEY`
- [ ] `NODE_ENV=development`

### Instalar y Configurar
```bash
npm install
npx prisma migrate dev
npx prisma generate
```

- [ ] `npm install` completado
- [ ] Migraciones aplicadas sin errores
- [ ] `node_modules/` existe

### Iniciar Backend
```bash
npm run dev
```

Esperar que veas:
```
✓ Server listening on port 4000
```

- [ ] Backend escuchando en puerto 4000
- [ ] Sin errores en consola

---

## PASO 2: Frontend

En **otra terminal**:

```bash
cd frontend
```

### Verificar Archivos
- [ ] `src/pages/AIIntelligence.jsx` existe
- [ ] `src/components/AI/ClientPredictionWidget.jsx` existe
- [ ] `src/components/AI/DormantClientDetector.jsx` existe
- [ ] `src/components/AI/SmartRecommendations.jsx` existe
- [ ] `src/components/AI/TemplateGenerator.jsx` existe
- [ ] `src/components/AI/DocumentAnalyzer.jsx` existe
- [ ] `src/components/Layout/NotificationBell.jsx` existe

### Verificar Configuración
```bash
# Crear .env.local con:
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:4000/api
EOF
```

- [ ] `.env.local` creado

### Instalar
```bash
npm install
```

- [ ] `npm install` completado
- [ ] `node_modules/` existe

### Iniciar Frontend
```bash
npm run dev
```

Esperar que veas:
```
➜  Local:   http://localhost:5173/
```

- [ ] Frontend escuchando en puerto 5173
- [ ] Sin errores en consola

---

## PASO 3: Verificación de Conectividad

En **tercera terminal**:

```bash
# Test 1: Backend Health
curl http://localhost:4000/api/health

# Test 2: Rutas AI cargadas (sin auth todavía)
curl http://localhost:4000/api/ai/stats 2>&1 | grep -q "unauthorized\|Invalid" && echo "✓ AI Routes exist"
```

- [ ] Backend responde a peticiones
- [ ] Ruta `/api/ai/` existe

---

## PASO 4: Frontend - Navegar a IA

1. Abre `http://localhost:5173` en navegador
2. Deberías ver página de Login
3. Ve a **Sidebar → Analytics & Tools → Inteligencia Artificial**

- [ ] Puedes ver página de IA
- [ ] Tiene 5 tabs (Overview, Predicciones, Clientes inactivos, Plantillas, Análisis OCR)

---

## PASO 5: Crear Usuario de Prueba

En **cuarta terminal** (o usar UI):

```bash
# Opción A: SQL directo (más rápido)
psql -U postgres -d docuinmo -c "
INSERT INTO \"User\" (id, email, password, name, role, active, \"createdAt\", \"updatedAt\")
VALUES ('user123', 'admin@test.com', 'password123', 'Admin', 'ADMINISTRACION', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
"

# Opción B: API (si existe registro)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","name":"Admin"}'
```

- [ ] Usuario creado en BD

---

## PASO 6: Login y Navegar

1. En `http://localhost:5173`:
   - Email: `admin@test.com`
   - Password: `password123`
2. Click "Entrar"

Deberías ver:
- [ ] Dashboard con KPIs
- [ ] Sidebar con "Inteligencia Artificial" visible
- [ ] Bell icon en header (Notificaciones)

---

## PASO 7: Testear IA/ML Features

### Feature 1: Predicción de Cliente
```
1. Clientes → Nuevo Cliente
2. Rellena datos (nombre, email, teléfono)
3. Guarda
4. En ficha, baja hasta "Predicción de valor"
5. Deberías ver:
   - Widget con predicción
   - Valor anual estimado
   - Probabilidad de cierre
   - Recomendaciones
```

- [ ] Predicción genera sin errores

### Feature 2: Detección de Dormidos
```
1. Inteligencia Artificial → Tab "Clientes inactivos"
2. Deberías ver:
   - Clientes sin actividad > 90 días
   - Plan de reactivación por cada uno
   - Acciones inmediatas
```

- [ ] Detector genera análisis

### Feature 3: Recomendaciones de Expediente
```
1. Expedientes → Nuevo Expediente
2. Rellena datos (código, cliente, propiedad)
3. Guarda
4. En detalles, baja hasta tab "Recomendaciones"
5. Deberías ver:
   - Acciones inmediatas
   - Puntuación de salud
   - Riesgos identificados
   - Días estimados para cierre
```

- [ ] Recomendaciones generan sin errores

### Feature 4: Generador de Plantillas
```
1. En detalles de expediente
2. Tab "Generador de plantillas inteligentes"
3. Selecciona tipo: "CONTRATO"
4. Click "Generar plantilla"
5. Deberías ver:
   - Plantilla generada
   - Variables personalizables
   - Opción descargar/copiar
```

- [ ] Plantilla genera sin errores

### Feature 5: Análisis OCR
```
1. En detalles de expediente
2. Tab "Documentos"
3. Sube un documento (PDF, imagen)
4. Click "Analizar con IA"
5. Deberías ver:
   - Tipo detectado
   - Datos extraídos
   - Puntuación de integridad
   - Alertas (si las hay)
```

- [ ] Análisis ejecuta sin errores

---

## PASO 8: Verificar Logs

```bash
# En terminal de Backend:
# Deberías ver logs como:
# [AI Service] Generating prediction for client...
# [AI Service] Claude response received
# [AI Service] Prediction saved

tail -f backend/logs/*.log
```

- [ ] Logs muestran actividad de IA
- [ ] Sin errores críticos (error 500)

---

## ⚠️ Troubleshooting Rápido

### Error: "ANTHROPIC_API_KEY is not set"
```bash
# Solución:
cd backend
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
npm run dev  # Reinicia
```

### Error: "Cannot find module 'ai.service.js'"
```bash
# Verificar:
ls -la backend/src/services/ai.service.js
ls -la backend/src/controllers/ai.controller.js
ls -la backend/src/routes/ai.routes.js

# Si no existen, vuelve a crearlos
```

### Error: "Table does not exist"
```bash
# Solución:
cd backend
npx prisma migrate dev
# Si sigue fallando:
npx prisma migrate reset  # ⚠️ Borra datos
```

### Frontend no conecta con Backend
```bash
# Verificar VITE_API_URL:
cat frontend/.env.local | grep VITE_API_URL

# Debe ser: VITE_API_URL=http://localhost:4000/api
```

### Predicción tarda mucho
```
Normal - Claude API toma 2-3 segundos por análisis
Primera vez es más lenta, después está cacheada por 7 días
```

---

## ✅ Verificación Final

Si completaste TODO lo anterior:

- [ ] Backend escuchando en `:4000`
- [ ] Frontend escuchando en `:5173`
- [ ] Puedes hacer login
- [ ] Sidebar tiene link "Inteligencia Artificial"
- [ ] Puedes generar predicción de cliente
- [ ] Puedes ver recomendaciones de expediente
- [ ] Puedes generar plantilla
- [ ] Puedes analizar documento
- [ ] Puedes ver clientes dormidos

**¡FELICIDADES! 🎉 Tu Docuinmo CRM con Fase 2 IA/ML está completamente funcional en local**

---

## 🚀 Próximo Paso

```bash
# Cuando todo esté funcionando, puedes:

# 1. Ver logs en tiempo real
tail -f backend/logs/*.log

# 2. Inspeccionar BD
npx prisma studio

# 3. Crear más datos de prueba y experimentar
```

---

## 📞 Contacto / Issues

Si algo no funciona:

1. **Revisa el error exacto en los logs**
2. **Verifica variables de entorno están correctas**
3. **Reinicia ambos servidores**
4. **Abre issue con log completo**

¡Listo! 🚀

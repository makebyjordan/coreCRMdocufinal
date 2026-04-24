# Manual de Usuario — CRM Inmobiliaria

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard](#2-dashboard)
3. [Crear un nuevo expediente](#3-crear-un-nuevo-expediente)
4. [Flujo de trabajo completo (13 pasos)](#4-flujo-de-trabajo-completo)
5. [Gestión de checklists](#5-gestión-de-checklists)
6. [Gestión documental](#6-gestión-documental)
7. [Notificaciones automáticas](#7-notificaciones-automáticas)
8. [Kanban y búsquedas](#8-kanban-y-búsquedas)
9. [Roles y permisos](#9-roles-y-permisos)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

---

## 1. Acceso al sistema

Accede en tu navegador a la URL del CRM (por ejemplo `http://localhost:5173`) e introduce tus credenciales.

| Rol | Descripción |
|-----|-------------|
| **COMERCIAL** | Gestiona sus expedientes asignados, avanza fases, sube documentos |
| **FIRMAS** | Valida documentación y gestiona contratos |
| **MARKETING** | Recibe briefs, gestiona producción de contenido |
| **DIRECCIÓN** | Visibilidad total, puede acceder a configuración |
| **ADMINISTRACIÓN** | Gestión completa del sistema |

---

## 2. Dashboard

El dashboard muestra en tiempo real:

- **KPIs principales**: expedientes activos, cerrados, bloqueados, tasa de cierre
- **Gráficos**: distribución de expedientes por fase y por tipo de operación
- **Alertas**: expedientes bloqueados y sin actividad reciente
- **Actividad reciente**: últimos cambios de fase registrados

---

## 3. Crear un nuevo expediente

### Paso a paso

1. Ve a **Expedientes** → botón **"Nuevo expediente"** (arriba a la derecha)
2. **Paso 1 — Cliente**: selecciona un cliente existente de la lista desplegable.
   - Si el cliente no existe todavía, ve primero a **Clientes** → **Nuevo cliente**
3. **Paso 2 — Operación e inmueble**: rellena:
   - Tipo de operación: VENTA, ALQUILER, COMPRA, INVERSIÓN, PROMOCIÓN, etc.
   - Tamaño: Individual (estándar), Premium, o Grande/Institucional
   - Datos del inmueble: dirección, ciudad, precio, superficie, habitaciones
4. **Paso 3 — Responsables**: asigna los responsables de Firmas y Marketing
   - Tú quedas automáticamente como comercial principal
5. Haz clic en **"Crear expediente"**

> El sistema creará automáticamente:
> - Un código único (ej: `EXP-2024-0001`)
> - Una carpeta en Google Drive (si está configurado)
> - Los checklists correspondientes al tipo de operación
> - Un email de notificación confirmando la apertura

---

## 4. Flujo de trabajo completo

El expediente avanza por **12 fases** siguiendo el flujo definido. Para avanzar de fase, usa el botón **"Avanzar fase"** en la vista de detalle del expediente.

### Diagrama de fases

```
CAPTACIÓN → FORMULARIO → DOCUMENTACIÓN → VALIDACIÓN ─┐
                                                       ├─ SI → ACUERDO → BRIEF MKT → PRODUCCIÓN MKT
                                                       └─ NO → BLOQUEADO (aviso al comercial)

PRODUCCIÓN MKT → PREVENTA → BÚSQUEDA ACTIVA ─┐
                                               ├─ SI (hay interesado) → ACUERDO INTERESADO → CIERRE ─┐
                                               └─ NO → Renovar exclusividad                           ├─ SI (cerrado) → POSVENTA → CERRADO
                                                                                                       └─ NO → Renovar exclusividad
```

### Descripción detallada de cada fase

#### Fase 0 — CAPTACIÓN
- El comercial crea el expediente con los datos básicos
- Se genera la carpeta en Drive y los checklists iniciales
- **Notificación automática**: email de apertura al comercial

#### Fase 1 — FORMULARIO
- El comercial registra los datos completos del cliente
- Se obtiene la firma de la política de privacidad
- **Notificación**: email a Firmas y Marketing confirmando recepción

#### Fase 2 — DOCUMENTACIÓN
- Subir todos los documentos requeridos según el tipo de operación:
  - **Venta**: DNI, escritura, nota simple, IBI, deudas comunidad, certificado energético
  - **Alquiler**: DNI propietario, escritura, cédula habitabilidad, certificado energético
  - **Compra**: DNI, CIRBE, extractos bancarios, nóminas, preaprobación hipotecaria
  - **Inversión/Grande**: toda la documentación + due diligence, tasación, documentación societaria
  - **Promoción**: licencias, proyecto técnico, seguro decenal, memorias de calidades
- **Notificación**: aviso a Firmas con documentación pendiente

#### Fase 3 — VALIDACIÓN
- Firmas revisa que toda la documentación es correcta y está completa
- **Decisión SÍ**: documentación correcta → avanza a Acuerdo
- **Decisión NO**: documentación incorrecta → el expediente se BLOQUEA y se notifica al comercial con el problema

#### Fase 4 — ACUERDO
- Se genera el contrato correspondiente:
  - Venta/Alquiler: Contrato de exclusividad
  - Compra: Contrato de arras
  - Inversión: Carta de intenciones
- El cliente firma el contrato
- **Notificación**: email a Firmas + Comercial + aviso al propietario

#### Fase 5 — BRIEF MARKETING
- El comercial rellena el formulario de marketing con todos los datos de la propiedad
- Para operaciones premium: autorización fotografía, vídeo, dron, VR
- **Notificación**: email a Marketing + Comercial

#### Fase 6 — PRODUCCIÓN MARKETING
- Marketing ejecuta el plan: fotografías, plano, renders, tour virtual (según tipo)
- Se marcan como completados todos los ítems del checklist de producción
- **Notificación**: email a Comercial + Firmas indicando finalización + aviso al propietario

#### Fase 7 — PREVENTA
- El comercial activa la búsqueda activa de compradores/inquilinos
- Se registran visitas e interesados en la sección "Compradores"

#### Fase 8 — BÚSQUEDA ACTIVA
- **Decisión SÍ** (hay interesado): avanza a Acuerdo con Interesado
  - Notificación a Marketing + Comercial + aviso al propietario
- **Decisión NO** (sin interesados): se notifica al comercial para revisar estrategia
  - Opción: Renovar exclusividad (vuelve a Fase 4 — Acuerdo)
  - Opción: Cancelar expediente

#### Fase 9 — ACUERDO CON INTERESADO
- Se registran los datos del comprador/inquilino
- Se documenta la oferta o condiciones acordadas
- **Notificación**: email a Comercial + Firmas

#### Fase 10 — CIERRE
- **Decisión SÍ** (operación cerrada):
  - Para venta: contrato de compraventa, escritura notarial, liquidación impuestos
  - Para alquiler: contrato de arrendamiento, inventario, fianza, entrega de llaves
  - Para inversión: escrituras múltiples, due diligence final
  - **Notificación**: email a TODOS los departamentos + cliente
- **Decisión NO**: renovar exclusividad o cancelar

#### Fase 11 — CIERRE (Botón "Cerrar operación")
Al cerrar una operación:
- El expediente pasa a estado **COMPLETADO**
- Se programan automáticamente los emails de postventa:
  - **3 meses**: email de felicitación al cliente
  - **6 meses**: email de seguimiento
  - **12 meses**: solicitud de reseña con enlace a Google Business / Trustpilot

### Cómo avanzar una fase con decisión (SÍ/NO)

En las fases condicionales (Validación, Búsqueda activa, Cierre) aparecerá un diálogo con dos opciones:

- Selecciona **SÍ** o **NO**
- Añade notas opcionales sobre el cambio
- Confirma el avance

---

## 5. Gestión de checklists

El CRM genera automáticamente los checklists correspondientes al tipo de operación cuando se crea un expediente o se avanza de fase.

### Cómo completar un ítem

1. Abre el expediente → pestaña **"Checklist"**
2. Haz clic en cualquier ítem para marcarlo como completado/pendiente
3. Los ítems marcados con **\*obligatorio** en rojo deben completarse para avanzar de fase

### Barra de progreso

Cada checklist muestra:
- **Nº de ítems completados / total**
- **Barra de progreso** de color (rojo <50%, azul ≥50%, verde 100%)
- **Porcentaje** de completitud

> Si intentas avanzar de fase con ítems obligatorios sin completar, el sistema lo bloqueará y mostrará un mensaje de error.

---

## 6. Gestión documental

### Subir un documento

1. Pestaña **"Documentos"** del expediente
2. Introduce el nombre del documento (ej: "DNI Juan García")
3. Selecciona el tipo (DNI_NIE, ESCRITURA, IBI, etc.)
4. Haz clic en **"Seleccionar archivo"** y elige el fichero (PDF, imágenes, Word, Excel — máx. 20 MB)

Si Google Drive está configurado, el archivo se sube automáticamente a la carpeta del expediente.

### Estados de documentos

| Estado | Significado |
|--------|-------------|
| **PENDIENTE** | El documento está en la lista pero no se ha subido |
| **SUBIDO** | El documento ha sido subido y está pendiente de validación |
| **VALIDADO** | Firmas ha revisado y aceptado el documento |
| **RECHAZADO** | Firmas ha rechazado el documento (con motivo indicado) |

### Validar / Rechazar documentos (rol Firmas)

En cada documento con estado SUBIDO aparecen dos botones:
- ✓ Verde: **Validar** — el documento es correcto
- ✗ Rojo: **Rechazar** — se pedirá indicar el motivo. El comercial recibirá un aviso automático.

---

## 7. Notificaciones automáticas

El sistema envía emails automáticos en los siguientes eventos:

| Evento | Destinatarios |
|--------|---------------|
| Apertura de expediente | Comercial |
| Cambio de fase | Responsables del departamento siguiente |
| Expediente bloqueado | Comercial (con motivo) |
| Documento rechazado | Comercial (con motivo) |
| Sin interesados | Comercial (aviso para revisar estrategia) |
| Marketing completado | Comercial + Firmas + Propietario |
| Interesado encontrado | Marketing + Comercial + Propietario |
| Operación cerrada | TODOS + Cliente |
| 3 meses post-cierre | Cliente (felicitación automática) |
| 6 meses post-cierre | Cliente (seguimiento automático) |
| 12 meses post-cierre | Cliente (solicitud de reseña automática) |

### Ver registro de notificaciones

Abre cualquier expediente → pestaña **"Notificaciones"**.  
Para consultar el historial completo del cliente asociado a un expediente, usa el enlace **"Ver ficha completa del cliente →"** en el header del expediente.  
Verás el historial completo con estado (Enviado, Pendiente, Fallido) y la opción de **reenviar** los que fallaron.

### Personalizar plantillas

Ve a **Configuración** → sección **"Plantillas de email"**.  
Puedes editar el asunto y el cuerpo HTML de cada tipo de notificación.  
Usa `{{nombreVariable}}` para insertar datos dinámicos (ej: `{{clientName}}`, `{{expedientCode}}`).

---

## 8. Kanban y búsquedas

### Vista Kanban

El tablero Kanban muestra todos los expedientes activos organizados en columnas por fase.  
Cada tarjeta muestra:
- Código del expediente
- Cliente
- Tipo de operación (badge de color)
- Dirección del inmueble
- Precio
- Avatar del comercial asignado
- Indicador rojo si está bloqueado

Haz clic en cualquier tarjeta para abrir el expediente completo.

### Vista de lista

Alterna entre Kanban y Lista usando los botones en la parte superior.  
La vista de lista permite ver todos los expedientes en formato tabla con ordenación.

### Filtros disponibles

- **Búsqueda**: busca por código, cliente o dirección
- **Tipo de operación**: filtra por VENTA, ALQUILER, COMPRA, etc.
- **Estado**: filtra por Activos, Bloqueados, Completados

---

## 9. Roles y permisos

| Acción | Comercial | Firmas | Marketing | Dirección | Administración |
|--------|-----------|--------|-----------|-----------|----------------|
| Ver expedientes propios | ✓ | ✗ | ✗ | ✓ | ✓ |
| Ver todos los expedientes | ✗ | ✓ | ✓ | ✓ | ✓ |
| Crear expediente | ✓ | ✗ | ✗ | ✓ | ✓ |
| Avanzar fase | ✓ | ✗ | ✗ | ✓ | ✓ |
| Validar documentos | ✓ | ✓ | ✗ | ✓ | ✓ |
| Eliminar expediente | ✗ | ✗ | ✗ | ✓ | ✓ |
| Gestionar usuarios | ✗ | ✗ | ✗ | ✓ | ✓ |
| Editar plantillas email | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## 10. Clientes — Ficha central del cliente

Cada cliente dispone de una ficha completa accesible desde **Clientes** → nombre del cliente.

### Pestañas disponibles

| Pestaña | Contenido |
|---------|-----------|
| **Resumen** | Información de contacto, KPIs de expedientes (total, activos, completados, cancelados, bloqueados), contadores de recursos y última actividad |
| **Actividad** | Timeline cronológico de todas las acciones registradas |
| **Notas** | Notas estructuradas del equipo |
| **Tareas** | Tareas pendientes y completadas asociadas al cliente |
| **Documentos** | Biblioteca unificada de todos los documentos del cliente |
| **Comunicaciones** | Registro de emails, llamadas y mensajes |
| **Relaciones** | Vínculos con otros clientes (familiar, referido, etc.) |
| **Historial** | Recorrido completo de operaciones: todos los expedientes con su línea temporal de fases, KPIs de comisiones y estado actual |

### Historial del cliente

La pestaña **Historial** centraliza el recorrido completo de operaciones del cliente:

- **Timeline de expedientes**: cada operación con su código, tipo, dirección, precio y progresión de fases
- **KPIs agregados**: total de expedientes, activos y completados, valor estimado en comisiones
- Los expedientes enlazan directamente a su ficha detallada

Desde cualquier expediente puedes acceder a la ficha del cliente mediante el enlace **"Ver ficha completa del cliente →"** situado bajo el código del expediente en el header.

---

## 11. Preguntas frecuentes

**¿Por qué no puedo avanzar de fase?**  
El sistema bloquea el avance si hay ítems obligatorios del checklist sin completar. Ve a la pestaña "Checklist" y completa todos los ítems marcados como *obligatorio.

**¿Cómo desbloqueo un expediente bloqueado?**  
1. Resuelve el problema indicado en el aviso de bloqueo
2. Abre el expediente → botón "Desbloquear"

**¿Cómo renuevo la exclusividad?**  
En la pestaña "Resumen" del expediente → sección "Exclusividad" → botón "Renovar 3 meses".  
También puedes usar el botón de acción en la fase Búsqueda activa cuando no hay interesados.

**¿Puedo reenviar una notificación que falló?**  
Sí. Ve al expediente → pestaña "Notificaciones" → botón de reenvío (ícono circular) en las notificaciones con estado "Fallido".

**¿Cómo conecto Google Drive?**  
Edita el archivo `.env` del backend con las credenciales de Google OAuth2. Consulta la [guía de integración](#).

**¿Los emails de postventa son automáticos?**  
Sí. Al cerrar una operación, el sistema programa automáticamente los envíos a 3, 6 y 12 meses desde la fecha de cierre. No requieren ninguna acción manual.

**¿Cómo cambio el enlace de Google Business en el email de los 12 meses?**  
Edita la variable `GOOGLE_BUSINESS_URL` en el archivo `.env` del backend.

---

*Versión 1.0 — CRM Inmobiliaria · Uso interno del equipo*

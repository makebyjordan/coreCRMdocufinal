# 📤 Instrucciones para Subir a GitHub

## Paso 1: Crear repositorio nuevo en GitHub
1. Ve a https://github.com/new
2. Nombre del repositorio: `coreCRMdocu` (o el que prefieras)
3. Deja en "Public" o "Private" según prefieras
4. NO inicialices con README (ya tenemos uno)
5. Click "Create repository"

## Paso 2: Conectar y subir (ejecuta en terminal)

```bash
cd "/Users/Oficina/Documents/crmdocumental 1 /Docucrm1"

# Eliminar cualquier remote anterior
git remote remove origin 2>/dev/null

# Agregar tu nuevo repositorio
# REEMPLAZA "TU_USUARIO" con tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/coreCRMdocu.git

# Verificar
git remote -v

# Subir todo
git push -u origin main
```

## Paso 3: Si pide autenticación
GitHub ya no usa contraseñas. Necesitas un **Personal Access Token**:

1. Ve a https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Selecciona scope: `repo` (acceso completo a repositorios)
4. Genera y copia el token
5. Cuando git pida contraseña, pega el token

## Alternativa: Usar GitHub CLI
```bash
# Instalar gh
brew install gh

# Autenticar
gh auth login

# Crear repo y subir
gh repo create coreCRMdocu --public --source=. --push
```

## Verificación
Una vez subido, visita:
`https://github.com/TU_USUARIO/coreCRMdocu`

## Resumen de cambios incluidos
- ✅ Integración Calendario ↔ Firmas
- ✅ Filtros por tipo de evento en calendario
- ✅ Modal unificado de detalles de eventos
- ✅ Panel de firmas en expedientes
- ✅ Widget de próximos eventos en Dashboard
- ✅ Script de backfill para datos existentes

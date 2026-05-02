#!/bin/bash

# 🚀 Docuinmo CRM - Setup Local Automático (Phase 2 + IA/ML)
# Este script configura y levanta todo automáticamente

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 DOCUINMO CRM - SETUP LOCAL (Phase 2 + IA/ML)             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir headers
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

# Función para imprimir checks
print_check() {
    echo -e "${GREEN}✓${NC} $1"
}

# Función para imprimir errores
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Función para imprimir warnings
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ─────────────────────────────────────────────────────────────────
# PASO 0: VERIFICACIONES PREVIAS
# ─────────────────────────────────────────────────────────────────

print_header "PASO 0: VERIFICACIONES PREVIAS"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_check "Node.js instalado: $NODE_VERSION"
else
    print_error "Node.js NO está instalado. Instálalo desde https://nodejs.org"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_check "npm instalado: $NPM_VERSION"
else
    print_error "npm NO está instalado"
    exit 1
fi

# Verificar PostgreSQL
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    print_check "PostgreSQL instalado: $PG_VERSION"
else
    print_warning "PostgreSQL NO está en PATH. Asegúrate de que está ejecutándose"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# PASO 1: CONFIGURAR BACKEND
# ─────────────────────────────────────────────────────────────────

print_header "PASO 1: CONFIGURAR BACKEND"

cd "$(dirname "$0")/backend"
print_check "Directorio actual: $(pwd)"

# Crear .env si no existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando .env para backend...${NC}"
    cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docuinmo"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/docuinmo"

# JWT
JWT_SECRET=dev-secret-key-change-in-production

# Email
EMAIL_ENABLED=false

# S3 (opcional)
AWS_REGION=eu-west-1

# ⭐ CLAUDE AI - PHASE 2
ANTHROPIC_API_KEY=sk-ant-change-this-to-your-key
NODE_ENV=development

# Server
PORT=4000
EOF
    print_check ".env creado"
    echo -e "${YELLOW}⚠ IMPORTANTE: Agregar tu ANTHROPIC_API_KEY en backend/.env${NC}"
else
    print_check ".env ya existe"
fi

# Instalar dependencias
echo ""
echo "Instalando dependencias del backend..."
npm install --quiet
print_check "Dependencias instaladas"

# Crear base de datos
echo ""
echo "Verificando base de datos..."
if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw docuinmo; then
    print_check "Base de datos 'docuinmo' existe"
else
    print_warning "Creando base de datos 'docuinmo'..."
    createdb -U postgres docuinmo 2>/dev/null || echo "Base de datos podría existir"
fi

# Aplicar migraciones
echo ""
echo "Aplicando migraciones Prisma..."
npx prisma migrate deploy --skip-generate 2>/dev/null || npx prisma migrate dev --skip-seed --no-interaction
print_check "Migraciones aplicadas"

# Generar cliente Prisma
npx prisma generate
print_check "Cliente Prisma generado"

echo ""

# ─────────────────────────────────────────────────────────────────
# PASO 2: CONFIGURAR FRONTEND
# ─────────────────────────────────────────────────────────────────

print_header "PASO 2: CONFIGURAR FRONTEND"

cd "$(dirname "$0")/frontend"
print_check "Directorio actual: $(pwd)"

# Crear .env.local si no existe
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creando .env.local para frontend...${NC}"
    cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:4000/api
EOF
    print_check ".env.local creado"
else
    print_check ".env.local ya existe"
fi

# Instalar dependencias
echo ""
echo "Instalando dependencias del frontend..."
npm install --quiet
print_check "Dependencias instaladas"

echo ""

# ─────────────────────────────────────────────────────────────────
# PASO 3: VERIFICACIÓN FINAL
# ─────────────────────────────────────────────────────────────────

print_header "PASO 3: VERIFICACIÓN FINAL"

# Verificar archivos críticos
BACKEND_FILES=(
    "src/services/ai.service.js"
    "src/controllers/ai.controller.js"
    "src/routes/ai.routes.js"
)

cd "$(dirname "$0")/backend"
for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_check "Backend: $file"
    else
        print_error "FALTA: Backend: $file"
    fi
done

FRONTEND_FILES=(
    "src/pages/AIIntelligence.jsx"
    "src/components/AI/ClientPredictionWidget.jsx"
    "src/components/AI/DormantClientDetector.jsx"
    "src/components/AI/SmartRecommendations.jsx"
    "src/components/AI/TemplateGenerator.jsx"
    "src/components/AI/DocumentAnalyzer.jsx"
)

cd "$(dirname "$0")/frontend"
for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_check "Frontend: $file"
    else
        print_error "FALTA: Frontend: $file"
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────
# INSTRUCCIONES FINALES
# ─────────────────────────────────────────────────────────────────

print_header "🎉 SETUP COMPLETADO"

echo ""
echo -e "${YELLOW}ANTES DE CONTINUAR:${NC}"
echo "1. Abre backend/.env y AGREGA tu ANTHROPIC_API_KEY"
echo "   - Ve a https://console.anthropic.com"
echo "   - Genera una API key"
echo "   - Copíala en: ANTHROPIC_API_KEY=sk-ant-..."
echo ""

echo -e "${BLUE}LEVANTA LOS SERVIDORES EN 2 TERMINALES:${NC}"
echo ""
echo "Terminal 1 (Backend):"
echo -e "${GREEN}  cd backend && npm run dev${NC}"
echo ""
echo "Terminal 2 (Frontend):"
echo -e "${GREEN}  cd frontend && npm run dev${NC}"
echo ""

echo -e "${BLUE}LUEGO ACCEDE A:${NC}"
echo -e "  ${GREEN}http://localhost:5173${NC} (Frontend)"
echo -e "  ${GREEN}http://localhost:4000${NC} (Backend API)"
echo ""

echo -e "${BLUE}CREAR USUARIO DE PRUEBA:${NC}"
echo "  Email: admin@test.com"
echo "  Password: password123"
echo "  (O usar el endpoint /api/auth/register)"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Setup completo. Ahora levanta los servidores y navega      ║${NC}"
echo -e "${GREEN}║  ✓ Ve a Sidebar → Inteligencia Artificial para ver Phase 2    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────
# OFRECER OPCIÓN DE LEVANTAR SERVIDORES
# ─────────────────────────────────────────────────────────────────

read -p "¿Quieres levantar los servidores ahora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Levantando servidores...${NC}"
    echo -e "${YELLOW}(Ctrl+C en cualquier terminal para detener)${NC}"
    echo ""

    # Levantar backend en background
    cd "$(dirname "$0")/backend"
    npm run dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    print_check "Backend iniciado (PID: $BACKEND_PID)"
    sleep 3

    # Levantar frontend en background
    cd "$(dirname "$0")/frontend"
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    print_check "Frontend iniciado (PID: $FRONTEND_PID)"
    sleep 2

    echo ""
    echo -e "${GREEN}✓ Servidores levantados!${NC}"
    echo ""
    echo "Backend:  http://localhost:4000 (PID: $BACKEND_PID)"
    echo "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
    echo ""
    echo "Para ver logs:"
    echo "  tail -f /tmp/backend.log"
    echo "  tail -f /tmp/frontend.log"
    echo ""
    echo "Para detener los servidores:"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
    echo ""

    # Mantener el script activo
    wait
else
    echo "OK, ejecuta los servidores manualmente cuando estés listo."
fi

#!/usr/bin/env bash
set -euo pipefail

# check-deps.sh — Valida que las dependencias necesarias esten instaladas.
# No instala nada. Solo verifica y reporta.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

check() {
  local cmd="$1"
  local label="$2"
  local required="${3:-true}"

  if command -v "$cmd" &>/dev/null; then
    local version
    version=$($cmd --version 2>/dev/null | head -1 || echo "version desconocida")
    echo -e "  ${GREEN}[OK]${NC}   $label — $version"
  else
    if [ "$required" = "true" ]; then
      echo -e "  ${RED}[FALTA]${NC} $label — ${RED}requerido${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "  ${YELLOW}[OPC]${NC}  $label — no encontrado (opcional)"
    fi
  fi
}

echo ""
echo "========================================="
echo "  Validacion de Dependencias del Proyecto"
echo "========================================="
echo ""

echo "Requeridas:"
check "docker" "Docker"
check "bun"    "Bun"

# Docker Compose (plugin moderno o binario separado)
if docker compose version &>/dev/null 2>&1; then
  compose_version=$(docker compose version --short 2>/dev/null || echo "desconocida")
  echo -e "  ${GREEN}[OK]${NC}   Docker Compose — v$compose_version"
elif command -v docker-compose &>/dev/null; then
  compose_version=$(docker-compose version --short 2>/dev/null || echo "desconocida")
  echo -e "  ${GREEN}[OK]${NC}   Docker Compose — v$compose_version (binario separado)"
else
  echo -e "  ${RED}[FALTA]${NC} Docker Compose — ${RED}requerido${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Opcionales:"
check "git"  "Git"  "false"
check "node" "Node.js" "false"

echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Faltan $ERRORS dependencia(s) requerida(s).${NC}"
  echo "Instalalas antes de continuar."
  echo ""
  exit 1
else
  echo -e "${GREEN}Todas las dependencias requeridas estan instaladas.${NC}"
  echo ""
  exit 0
fi

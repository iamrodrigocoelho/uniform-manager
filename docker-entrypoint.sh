#!/bin/sh
set -e

echo "→ Aguardando PostgreSQL ficar pronto..."
until nc -z db 5432 2>/dev/null; do
  echo "  PostgreSQL ainda nao esta pronto, aguardando..."
  sleep 2
done
sleep 2

echo "→ Aplicando migracoes do banco de dados..."
npx prisma migrate deploy

echo "→ Iniciando aplicacao Next.js..."
exec npm start

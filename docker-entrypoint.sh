#!/bin/sh
set -e

echo "→ Aguardando PostgreSQL ficar pronto..."
until pg_isready -h db -U postgres 2>/dev/null; do
  echo "  PostgreSQL ainda nao esta pronto, aguardando..."
  sleep 2
done

echo "→ Aplicando migracoes do banco de dados..."
npx prisma migrate deploy

echo "→ Iniciando aplicacao Next.js..."
exec npm start

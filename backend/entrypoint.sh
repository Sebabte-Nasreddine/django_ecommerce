#!/bin/bash
set -e

echo "==> Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-sefah}" -q; do
    echo "  PostgreSQL not ready — retrying in 2s..."
    sleep 2
done
echo "  PostgreSQL is ready."

echo "==> Creating any missing migrations..."
python manage.py makemigrations users products cart orders --noinput 2>/dev/null || true

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Syncing any schema gaps (ALTER TABLE safety net)..."
python manage.py shell -c "
from django.db import connection
with connection.cursor() as c:
    c.execute(\"ALTER TABLE categories ADD COLUMN IF NOT EXISTS image VARCHAR(500) DEFAULT '' NOT NULL\")
print('Schema sync done.')
"

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true

echo "==> Creating superuser if needed..."
python manage.py shell << 'PYEOF'
from apps.users.models import User
import os
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@sefa.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin1234!')
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        email=email,
        password=password,
        first_name='Admin',
        last_name='SEFA',
    )
    print(f'Superuser created: {email}')
else:
    print(f'Superuser already exists: {email}')
PYEOF

echo "==> Starting server..."
exec "$@"

#!/bin/bash

echo "BACKUP_INTERVAL is set to: ${BACKUP_INTERVAL}"
echo "ENABLE_BACKUP is set to: ${ENABLE_BACKUP}"

docker-entrypoint.sh mysqld --default-authentication-plugin=mysql_native_password &
MYSQL_PID=$!

echo 'Waiting for MySQL to be ready...'
until mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} --silent; do
  sleep 2
done
echo 'MySQL is ready!'

if [ "${ENABLE_BACKUP}" = "true" ]; then
  echo 'Backup loop enabled, starting backups...'
  while true; do
    echo 'Creating backup...'
    mysqldump -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} > /backup/${MYSQL_DATABASE}_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null
    if [ $? -eq 0 ]; then
      echo 'Backup created successfully'
    else
      echo 'Backup failed'
    fi
    INTERVAL=${BACKUP_INTERVAL:-86400}
    echo "Next backup in ${INTERVAL} seconds"
    sleep ${INTERVAL}
  done &
else
  echo 'Backup loop disabled, skipping backups.'
fi

wait $MYSQL_PID
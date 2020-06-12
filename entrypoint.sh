#!/bin/sh
echo "window._env_['BASE_API_URL'] = '$BASE_API_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['SERVICES_URL'] = '$SERVICES_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['HOMEPAGE_URL'] = '$HOMEPAGE_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['TRAININGS_URL'] = '$TRAININGS_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['CHAT_URL'] = '$CHAT_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MONITORING_BASE_URI'] = '$MONITORING_BASE_URI';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MINIO_BASE_URI'] = '$MINIO_BASE_URI';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MINIO_END_POINT'] = '$MINIO_END_POINT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MINIO_PORT'] = '$MINIO_PORT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MINIO_END_MINIMUM_DURATION_MS'] = '$MINIO_END_MINIMUM_DURATION_MS';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['VAULT_BASE_URI'] = '$VAULT_BASE_URI';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['VAULT_KV_ENGINE'] = '$VAULT_KV_ENGINE';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['ONYXIA_GIT'] = '$ONYXIA_GIT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['SWAGGER_API'] = '$SWAGGER_API';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['ONYXIA_CHAT_ROOM'] = '$ONYXIA_CHAT_ROOM';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['BLOG_URL'] = '$BLOG_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['MONITORING_URL'] = '$MONITORING_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['KUB_SERVER_NAME'] = '$KUB_SERVER_NAME';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['KUB_SERVER_URL'] = '$KUB_SERVER_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_TYPE'] = '$AUTH_TYPE';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_CLIENT_ID'] = '$AUTH_OIDC_CLIENT_ID';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_REALM'] = '$AUTH_OIDC_REALM';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_URL'] = '$AUTH_OIDC_URL';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_SSL_REQUIRED'] = '$AUTH_OIDC_SSL_REQUIRED';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_RESOURCE'] = '$AUTH_OIDC_RESOURCE';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_PUBLIC_CLIENT'] = '$AUTH_OIDC_PUBLIC_CLIENT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['AUTH_OIDC_CONFIDENTIAL_PORT'] = '$AUTH_OIDC_CONFIDENTIAL_PORT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['CONTACT'] = '$CONTACT';" >> /usr/share/nginx/html/env-config.js
echo "window._env_['WARNING_MESSAGE'] = '$WARNING_MESSAGE';" >> /usr/share/nginx/html/env-config.js
exec "$@"
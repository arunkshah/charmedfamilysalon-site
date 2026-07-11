# Charmed Family Salon — static site served by nginx behind the VPS's Traefik.
FROM nginx:alpine

# Site nginx config (redirects, caching, gzip, security headers — mirrors .htaccess)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static site content
COPY . /usr/share/nginx/html/

# Keep deploy/build files and Apache-only config out of the web root
RUN cd /usr/share/nginx/html \
 && rm -f Dockerfile docker-compose.yml nginx.conf .dockerignore .htaccess .DS_Store \
 && find . -name '.DS_Store' -delete

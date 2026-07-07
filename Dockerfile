FROM nginx:1.29-alpine

COPY dist/client/ /usr/share/nginx/html/
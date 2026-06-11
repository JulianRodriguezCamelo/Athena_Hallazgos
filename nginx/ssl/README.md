# Certificados SSL

Coloca aquí los certificados antes de arrancar Nginx en producción:

- `fullchain.pem` — certificado + cadena intermedia (Let's Encrypt: fullchain.pem)
- `privkey.pem`   — clave privada (Let's Encrypt: privkey.pem)

## Obtener con Let's Encrypt (Certbot)

```bash
certbot certonly --standalone -d tu-dominio.com
cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem nginx/ssl/
```

## Arrancar con Nginx en producción

```bash
docker compose --profile production up -d
```

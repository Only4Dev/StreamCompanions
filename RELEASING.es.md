# Publicación y actualizaciones

[English](RELEASING.md) · **Español**

- Confirma la licencia del código propio y revisa los créditos de terceros antes de publicar. El catálogo importado (`pmd/`), las hojas de referencia (`ATTACKMOVESSPRITES/`) y las compilaciones (`dist/`) quedan fuera de Git. [SpriteCollab](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md) · [Sprites de PokéAPI](https://github.com/PokeAPI/sprites)
- El paquete generado por `npm.cmd run dist:folder` usa la lista de archivos de `package.json`. Comprueba su contenido antes de adjuntarlo a Releases. El catálogo importado se prepara por separado.
- Revisa también el historial Git que vaya a publicarse. Las bases de datos, los perfiles, los Client Secret de OAuth, los tokens y las claves de cifrado pertenecen a la instalación.
- GitHub Actions ejecuta `npm ci` y `npm test` en Windows con Node.js 24.

## Portal propio

Copia `cloud/wrangler.example.jsonc` a `cloud/wrangler.jsonc` y sustituye los valores de ejemplo por tu Worker y tu D1. Prueba las migraciones en una base de pruebas. Configura mediante los secretos de Wrangler `TWITCH_WEB_CLIENT_ID`, `TWITCH_WEB_CLIENT_SECRET`, `KICK_WEB_CLIENT_ID`, `KICK_WEB_CLIENT_SECRET` y `KICK_TOKEN_KEY`. Registra los callbacks `/auth/twitch/callback`, `/auth/kick/callback` y el webhook `/webhooks/kick` en tu dominio HTTPS. Para apuntar a tu propio servicio, configura también el cliente de escritorio con tu URL de registro y tu Client ID de Twitch.

## Primera versión pública

1. Actualiza la versión en `package.json` y `package-lock.json`, ejecuta las pruebas y genera la carpeta portable.
2. Prueba la carpeta en Windows con un perfil limpio y otro existente. Comprueba que conserva sus ajustes y las URL de OBS. Verifica Twitch y Kick con el checklist del README.
3. Publica una versión estable con la etiqueta `vX.Y.Z` en `Only4Dev/StreamCompanions` y adjunta el ZIP de la carpeta portable. **Acerca de → Buscar actualizaciones** compara la versión instalada con la última estable de GitHub y enlaza a Releases para descargarla. [API de GitHub Releases](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)

## Parche incremental

El manifiesto firmado identificará la versión de origen y destino, la plataforma y el hash de cada archivo que cambie. La app verificará la firma con una clave pública incorporada. Descargará los cambios a una carpeta temporal y aplicará el parche al cerrar, con respaldo para volver a la versión anterior si falla el inicio.

El parche se limita a los archivos distribuidos. El perfil de Electron, SQLite, las credenciales, los ajustes, los recursos importados y las URL de OBS quedan fuera. Antes de habilitarlo, prueba una descarga interrumpida, una versión incompatible, archivos alterados y la restauración del respaldo.

# Stream Companions

[English](README.md) · **Español**

Stream Companions convierte el chat de Twitch y Kick en un juego de captura, colección y batallas. El streamer usa la app portable de Windows con fuentes de navegador para OBS o Streamlabs. Los viewers juegan desde el chat y consultan su progreso en la web.

[Portal para viewers](https://stream-companions.developeronly4g.workers.dev/) · [Código del portal](cloud/) · [Descargas](https://github.com/Only4Dev/StreamCompanions/releases) · [Historial de cambios en inglés](CHANGELOG.md) · [Guía de publicación](RELEASING.es.md)

## Configuración para streamers

1. Descarga el ZIP para Windows x64, extrae todos los archivos y abre `Stream Companions.exe`.
2. En **Conexiones**, vincula Twitch o Kick para crear tu comunidad. Si haces multistream, puedes vincular la segunda plataforma ahí mismo.
3. Pulsa **Iniciar juego**. En **Fuentes**, copia los enlaces de encuentros y compañeros en dos fuentes de navegador. Para compañeros y batallas, usa **1920 × 1080**.
4. Prueba un encuentro y una invocación desde **Fuentes** antes del directo. Pulsa **Detener juego** para dejar el panel abierto sin encuentros ni invocaciones activas.

### Configuración de Twitch

Pulsa **Conectar Twitch** y aprueba la autorización en Twitch.

### Configuración de Kick

Pulsa **Conectar Kick**, aprueba la autorización en Kick y vuelve a la app. La app se reinicia después de crear una comunidad nueva.

## Cómo jugar

- Usa `!poke join` para entrar a una comunidad. **Twitch** requiere seguir primero el canal. **Kick** acepta el comando directamente.
- Usa `!catch` durante un encuentro. Invoca una captura con `!summon nombre` o `!summonshiny nombre`, y retírala con `!summon out`.
- Usa `!web` para abrir el portal. Puedes iniciar sesión con **Twitch o Kick**. Si usas ambas, vincúlalas en **Cuentas vinculadas** para compartir tu progreso en esa comunidad.

## Desarrollo local

Usa Node.js 24 o posterior y Git.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

La app incluye una demo con un catálogo reducido. Para cargar el catálogo completo, ejecuta `npm.cmd run import:pmd`. La importación guarda recursos y créditos en `pmd/`. Para usarlo con el ejecutable portable, copia esa carpeta junto a `Stream Companions.exe` y reinicia la app. [SpriteCollab y sus créditos](https://github.com/PMDCollab/SpriteCollab)

Genera la carpeta portable con `npm.cmd run dist:folder`. El resultado queda en `dist/win-unpacked/` e incluye el runtime. Conserva todos los archivos junto al ejecutable.

### Checklist del piloto

- [ ] Confirma que cada canal que vas a usar aparece conectado y que las dos fuentes se ven en OBS.
- [ ] Prueba el registro, una captura y una invocación con una cuenta de viewer.
- [ ] Si usas ambas plataformas, vincula las cuentas de prueba y confirma que comparten la colección en el portal.
- [ ] Desconecta y reconecta internet. Comprueba que se recupera la sincronización sin duplicar progreso.

## Datos y créditos

El progreso se guarda en SQLite en la app del streamer y se sincroniza con el portal. **Desvincular** conserva el progreso. **Eliminar mis datos** borra la cuenta, sus conexiones y los datos del juego.

Stream Companions es un proyecto fan no comercial de [Only4Dev](https://github.com/Only4Dev). Pokémon y sus recursos pertenecen a sus respectivos titulares. La licencia del código propio está pendiente. [Licencia de SpriteCollab](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md) · [Sprites de PokéAPI](https://github.com/PokeAPI/sprites)

## Limitaciones conocidas

El portal público usa el plan gratuito de Cloudflare Workers con una base de datos D1. Si hay mucho tráfico y se agota una cuota, el inicio de sesión, el portal o la sincronización pueden quedar temporalmente indisponibles. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/) · [Cuotas de D1](https://developers.cloudflare.com/d1/platform/pricing/)

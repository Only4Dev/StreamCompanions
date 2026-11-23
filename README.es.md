# Stream Companions

[English](README.md) · **Español**

[Historial de cambios en inglés](CHANGELOG.md)

Stream Companions convierte el chat de Twitch y Kick en un juego de captura, colección y batallas. El streamer usa la app de Windows y agrega dos fuentes a OBS. Los viewers juegan desde el chat y consultan su progreso en el portal. [Portal para viewers](https://stream-companions.developeronly4g.workers.dev/)

## Primer directo con Stream Companions

1. Extrae toda la carpeta de la beta para Windows x64 y abre `Stream Companions.exe` dentro de ella.
2. En **Conexiones**, vincula Twitch. Para jugar también en Kick, vincúlalo después de que la app registre la comunidad.
3. Pulsa **Iniciar juego**. En **Fuentes**, copia los enlaces del encuentro y de los compañeros en dos fuentes de navegador. Usa **1920 × 1080** para compañeros y batallas.
4. Abre **Fuentes → Lanzar en directo** y pide a otro usuario que ejecute `!poke join`, `!catch` y `!summon nombre` en el chat. En Twitch el viewer debe seguir el canal antes de registrarse.
5. Cuando termines el directo, pulsa **Detener juego** si vas a dejar el panel abierto. Para salir por completo, cierra la ventana con la X. El portal conserva el progreso sincronizado.

## Para viewers

- Usa `!poke join` para entrar a la comunidad. Intenta capturar con `!catch` e invoca un compañero con `!summon nombre`.
- Usa `!web` para obtener el enlace al portal. Inicia sesión con Twitch o Kick, elige comunidad y abre **Dex**, **Inventory** o **Tienda**.
- Si juegas en ambos chats, vincula las dos cuentas desde **Cuentas vinculadas** para compartir el progreso en esa comunidad.

## Desarrollo local

Se requiere Node.js 24 o posterior y Git. El catálogo completo es opcional para ejecutar y probar el código.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

Ejecuta `npm.cmd run import:pmd` si quieres cargar el catálogo completo. La importación guarda los sprites y créditos de PMDCollab en `pmd/` desde una revisión fija de SpriteCollab. El catálogo cubre 1.025 especies. Una variante shiny entra en el catálogo si tiene todos los clips disponibles de su versión normal. Para las especies sin sprite animado de PMD se usa un sprite normal estático de PokéAPI. Los recursos descargados se excluyen de Git y del empaquetado público. Sin el catálogo local, la app usa las tres criaturas de demo. [Repositorio de SpriteCollab](https://github.com/PMDCollab/SpriteCollab) · [Licencia](https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md)

El panel incluye un chat simulado y las URL locales para OBS. En la vista previa, escribe `!poke join`, elige una especie, fuerza una aparición, captura con `!catch` e invócala con `!summon nombre`. Con shiny 1 entre 1 puedes practicar `!summonshiny nombre`. El encuentro muestra una pose fija y el temporizador. La fuente de compañeros agrupa todas las invocaciones y prioriza las más recientes cuando se alcanza el límite visual. Por defecto se ocultan las etiquetas si hay más de 50 invocaciones. Ambos límites se configuran desde el panel.

Para verificar el render en Chromium, inicia Electron con `npm.cmd start -- --remote-debugging-port=9227` y ejecuta `node scripts/smoke-pmd.js` con el catálogo local importado.

La colección, la XP, las Poké Balls y los ajustes de simulación se guardan en SQLite en el perfil local de Electron. Al reiniciar se abre una sesión nueva sin encuentros ni invocaciones activas. Para generar la carpeta portable de Windows x64 con el runtime incluido, ejecuta `npm.cmd run dist:folder`. Abre `Stream Companions.exe` dentro de `dist/win-unpacked/` y conserva los demás archivos de la carpeta.

Para usar el catálogo completo en la versión portable, ejecuta el importador desde una copia del código y coloca la carpeta `pmd/` resultante junto a `Stream Companions.exe`. Reinicia la app para cargarla. La app portable incluye su runtime.

## V1

### Beta privada para Windows

El ejecutable de `dist/beta/` se abre directamente en Windows x64. El perfil y el progreso se guardan en Windows por separado. No se envía este perfil junto con el ejecutable. En el primer arranque conecta Twitch con el ID que viene en la app. Si tu comunidad es nueva, la web registra el dispositivo. Cuando aparezca el estado de sincronización, puedes conectar Kick desde el mismo panel. Las comunidades ya vinculadas a otro dispositivo requieren asistencia para migrar su perfil.

En **Inicio**, pulsa **Iniciar juego**. Desde **Fuentes**, copia las dos fuentes de navegador. La fuente transparente de compañeros también muestra las batallas a 1920 × 1080. Las batallas se habilitan desde **Configuración → Batallas**. Una vez habilitadas, se pueden iniciar manualmente o configurar cada N encuentros. El valor predeterminado es 5 y 0 deja solo el inicio manual. Si faltan compañeros, los encuentros siguen su programación. Cuando hay al menos dos elegibles, el bot anuncia cinco minutos de espera. En el arranque se muestra el cartel durante dos segundos y al comenzar aparecen las barras de vida. El multiplicador de PS de combate es 1×, 1,5× o 2×. Tras el resultado, la fuente vuelve a mostrar los compañeros que siguen activos.

Los salvajes son formas base de nivel 1. Los normales usan una tasa por especie de 30–55 % con Poké Ball, 45–70 % con Super Ball y 60–85 % con Ultra Ball. La probabilidad de un legendario o singular es 0,01 % por aparición automática. Estos duran cinco minutos y sus tasas son 3 %, 6 % y 12 %. En **Fuentes**, **Programar próximo legendario** reemplaza el siguiente salvaje automático. La Master Ball tiene 100 % de éxito; su botón de prueba solo aparece en la demo local de desarrollo. Usa `!caramelo nombre` o `!candy nombre` para gastar un caramelo y subir un nivel, con `✦` después del nombre para la variante shiny.

Para reconstruir la beta privada con el catálogo importado, ejecuta `npm.cmd run dist:beta`. La beta de Windows carece de firma de editor. El paquete público y la publicación en GitHub se preparan por separado.

Para generar el catálogo compacto, usa Python con Pillow y soporte WebP. `python scripts/optimize-pmd.py` escribe `dist/pmd-lossless` y conserva los PNG de `pmd/`. Cada sustitución se acepta solo si el WebP pesa menos y conserva las dimensiones y todos los píxeles RGBA. En PowerShell, configura `$env:SC_LOSSLESS_ASSETS = '1'` antes de ejecutar `npm.cmd run dist:beta` para empaquetar ese catálogo.

En **Tienda → Guardar y publicar precios**, cada streamer puede cambiar el catálogo de precios de su comunidad. Con el juego activo, la app los publica en la siguiente consulta de tienda, normalmente en hasta 30 segundos. Si el precio cambia antes de confirmar, el portal muestra el nuevo precio y pide volver a elegir la compra. Las compras que ya están en cola conservan el importe confirmado.

En **Cuentas vinculadas → Eliminar mis datos**, el viewer puede confirmar la baja escribiendo **ELIMINAR**. El portal borra sus datos de juego y bloquea la restauración desde sincronizaciones antiguas. Las apps compatibles eliminan su copia local cuando recuperan la conexión. Se conservan los identificadores técnicos mínimos para rechazar copias antiguas. Puedes volver a iniciar sesión o vincular la identidad a otra cuenta sin recuperar el progreso eliminado.

- La app controla reglas, eventos, overlays y datos locales. El viewer juega desde el chat y entra al portal para consultar su inventario y colección sin descargar software.
- Twitch verifica follow antes de registrar. En el piloto, Kick registra con `!poke join` desde el chat. Los canjes de registro y TikTok quedan pendientes.
- Un encuentro manual reinicia la programación. Una sola invocación por viewer vinculado y streamer. Diez minutos sin actividad válida retiran al compañero.
- El piloto incluye sincronización de SQLite, OAuth, webhook de Kick, EventSub de Twitch, portal Cloudflare Workers + D1 y mensajes configurables ES/EN.
- Canjes, subs y Bits/KICKs pueden disparar efectos opcionales. Primero, tamaño temporal del compañero. El mismo efecto debe estar disponible con puntos del canal. Los eventos anónimos no se asocian a un compañero.

## Después de la beta

Quedan pendientes los canjes de puntos de canal, la revisión de la integración con TikTok y las actualizaciones incrementales. El battle royale y los objetos equipados ya se pueden probar.

## Configuración avanzada de Twitch

El modo de desarrollo puede leer un Client ID propio desde `STREAM_COMPANIONS_TWITCH_CLIENT_ID`. El alta automática de la comunidad en el portal público usa la aplicación Twitch incluida. Al iniciar, Electron abre la autorización oficial del broadcaster. La cuenta autorizada actúa como bot en su propio canal. La app guarda la sesión cifrada en el perfil local de Windows y la recupera al reiniciar. Si Twitch revoca el acceso o la renovación vence, vuelve a pedir autorización. La base de Twitch se guarda aparte de la demo.

Tras autorizar, un segundo usuario que siga el canal puede registrarse con `!poke join`. El streamer puede forzar una aparición en el panel y el viewer probar captura e invocación desde Twitch. `!web` usa la URL configurada del portal o la del dispositivo vinculado.

Referencias de [OAuth de Twitch](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) y [chatbots instalados](https://dev.twitch.tv/docs/chat/authenticating/).

## Sincronización del portal

SQLite en el PC es la fuente del inventario, variantes y XP. La app usa una cola persistente en la misma transacción que guarda el progreso. La app se vincula a una comunidad mediante una credencial revocable del dispositivo y envía por HTTPS solo viewers modificados, con revisiones por viewer y confirmación de recepción. Se envía XP en unidades enteras y se conservan lotes pendientes hasta recibir confirmación.

Cloudflare Workers aloja el frontend y la API de sincronización. D1 guarda la última revisión por comunidad e identidad de viewer. El login OAuth de Twitch o Kick permite al viewer consultar su propia colección e inventario aunque el PC esté apagado. El backend valida que el dispositivo tenga permiso para escribir en esa comunidad. El cliente no sube mensajes, capturas de OBS ni tokens de Twitch del streamer. El Worker y D1 están desplegados. El modo dev se vincula con el archivo cloud-pairing.json del perfil de Electron, que contiene la URL HTTPS y el login de la comunidad. La app genera y cifra su credencial en Windows. El operador registra solo la huella de cloud-device.fingerprint en devices. Las cargas se habilitan al conectar la cuenta de Twitch correspondiente. Para abrir el login web de Twitch hacen falta TWITCH_WEB_CLIENT_ID y TWITCH_WEB_CLIENT_SECRET configurados en el Worker. El callback es /auth/twitch/callback.

## Sonido shiny para OBS

La fuente Encuentro salvaje reproduce un solo aviso por encuentro shiny nuevo mientras la fuente está cargada. Para sustituirlo, reemplaza `ui/sfx/shiny.wav` con un clip WAV que puedas usar. En OBS, habilita el audio de la fuente y mantenla cargada antes de que comience el encuentro. El panel y la fuente Compañeros permanecen silenciosos.

## Primer arranque, cuentas y avisos

Si no hay configuración guardada, la app abre Conexiones. Una base nueva empieza con el juego detenido. **Iniciar juego** inicia el contador. **Detener juego** elimina el encuentro y las invocaciones activas, conserva el progreso y mantiene los chats conectados. Se puede seguir usando la vista previa de invocación mientras el juego está detenido. En Twitch se reutiliza la sesión cifrada existente. Los avisos cruzan los umbrales de 10, 5 y 1 minuto una vez por encuentro programado. En Twitch se comprueba que el canal está en directo antes de enviar cada aviso. El modo Demo no publica mensajes.

El portal crea una cuenta interna al entrar mediante Twitch o Kick. El viewer puede vincular una segunda identidad mediante OAuth desde **Cuentas vinculadas**. El progreso pertenece a cada comunidad. Vincular Twitch desde la app registra una comunidad nueva en el portal público.

## Cuenta y multistream

El portal permite elegir Twitch o Kick y crea una cuenta interna al autenticar por primera vez. Twitch está habilitado. Kick usa OAuth con PKCE y requiere KICK_WEB_CLIENT_ID y KICK_WEB_CLIENT_SECRET en el Worker, con callback /auth/kick/callback. Vincular se inicia desde Cuentas vinculadas y confirma la propiedad mediante OAuth. Una identidad que ya pertenece a otra cuenta no se traslada automáticamente.

Twitch y Kick comparten los encuentros de la comunidad. Un viewer vinculado comparte inventario entre plataformas, puede capturar una vez por chat en el mismo encuentro y tiene una sola invocación activa. Usa una cuenta de viewer distinta de la del anfitrión para probar el chat real. El alta de comunidades nuevas se realiza al vincular Twitch. El soporte de canjes sigue pendiente.

## Seguridad y publicación

El panel de control se abre en Electron y requiere una sesión local separada de las fuentes de OBS. Los espectadores usan el portal público. La tienda valida la comunidad y el precio en el servidor, y la app verifica el saldo y guarda el recibo junto al débito y la entrega. El dispositivo del streamer es la autoridad del progreso de su propia comunidad. Si el anfitrión modifica sus datos locales o alguien obtiene la credencial del dispositivo, puede alterar el progreso de esa comunidad.

Stream Companions es un proyecto fan no comercial de Only4Dev, con el código disponible en GitHub. La licencia del código está pendiente. Pokémon y sus recursos pertenecen a sus respectivos titulares. Los créditos y licencias de terceros son independientes de la licencia del código. Consulta [la guía de publicación](RELEASING.es.md) y el checklist de abajo antes de distribuir una beta.

### Checklist del piloto

- [ ] En **Conexiones**, confirmar Twitch y Kick conectados a los canales correctos y la sincronización al día. Iniciar el juego y agregar a OBS las dos fuentes locales que muestra el panel **Fuentes**.
- [ ] Con cuentas distintas del anfitrión, probar `!poke join` en cada chat. En Twitch, comprobar también que una cuenta que no sigue el canal recibe el aviso antes de registrarse. En el portal, cada viewer nuevo debe ver cinco Poké Balls.
- [ ] Forzar un encuentro desde **Fuentes**. Comprobar el retrato y el contador. Usar `!catch` en ambos chats y verificar el consumo, la tarjeta desbloqueada y el anuncio del éxito. Una captura puede fallar. Repetir el comando tras una captura exitosa en el mismo chat no debe consumir otra bola.
- [ ] Desde una sesión abierta en el portal, vincular la otra plataforma. Entrar con cada proveedor y comprobar la misma colección. Usar `!summon nombre`, intentar otra invocación desde el otro chat y comprobar que sigue habiendo un solo compañero. Retirarlo con `!summon out` desde el chat original e invocarlo desde el otro.
- [ ] Enviar un mensaje normal mientras el compañero está activo. Comprobar que renueva su tiempo. Dejar pasar diez minutos sin actividad válida y verificar que desaparece. Confirmar en el portal el tiempo acumulado y la colección.
- [ ] Con algo de progreso pendiente, cortar internet durante 30–60 segundos y volver a conectarlo. Probar un comando nuevo en cada chat y comprobar que el portal recibe los cambios sin duplicarlos. Cerrar la app, comprobar que el portal conserva la última copia y volver a abrirla usando el mismo perfil.
- [ ] Mantener un directo de prueba de 90 minutos. Comprobar que ambos chats siguen respondiendo, observar los avisos de 10, 5 y 1 minuto y verificar que **Detener juego** oculta los overlays sin desvincular los canales.
- [ ] Antes de publicar para otros streamers, repetir el primer inicio con un perfil de Windows limpio. La prueba pasa cuando basta con abrir el ejecutable, vincular los canales, iniciar el juego y comprobar en el portal el progreso de la comunidad recién creada.

## Laboratorio de combate

La pestaña Combate dev se carga al ejecutar el código fuente con Electron. Permite simular rondas con 4–6 Pokémon de la Pokédex Nacional y probar cada movimiento de forma aislada. El botón Batalla de viewers inicia una ronda aparte con compañeros activos y registra su resultado en la comunidad.

Kanto usa repertorios diseñados por familia. El resto combina movimientos implementados con los movimientos aprendidos publicados por PokéAPI y el perfil de cada especie. Solo las formas finales no legendarias reciben ajustes de stats en la arena. Las especies de doble tipo pueden equipar una de sus dos ultis. Los datos de origen están versionados en `dev/national-stats.js`. [PokéAPI](https://pokeapi.co/docs/v2)

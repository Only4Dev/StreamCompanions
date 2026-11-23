const copy = {
  es: {
    title: 'Cómo jugar', commands: 'Comandos de chat',
    steps: [
      ['Únete a una comunidad', 'Escribe !registrar en el chat de Twitch o Kick del streamer. En Twitch debes seguir el canal primero. Empiezas con cinco Poké Balls.'],
      ['Atrapa un Pokémon', 'Cuando aparezca en el directo, usa !captura. Un intento válido consume una bola y puedes lograr una captura por encuentro.'],
      ['Invoca a tu compañero', 'Usa !invocar con el nombre de un Pokémon que tengas. Si ya tienes un compañero activo, lo reemplazas.'],
      ['Desbloquea evoluciones', 'Las formas de una línea comparten nivel. Las líneas de tres etapas desbloquean sus evoluciones al 16 y al 31. Una evolución directa sin ramas se desbloquea al 31 y una línea con varias ramas, como Eevee, al 16.'],
      ['Consulta tu progreso', 'Inicia sesión en el portal y elige al streamer. En Dex ves tus capturas y en Inventory, tus objetos.']
    ],
    groups: ['Registro y portal', 'Captura', 'Compañeros'],
    rows: [
      ['Regístrate en el canal.', 'Abre el enlace al portal desde el chat.'],
      ['Intenta capturar con una Poké Ball.', 'Elige otro tipo de bola si tienes saldo.'],
      ['Invoca una variante normal o una evolución que hayas desbloqueado.', 'Invoca una variante shiny.', 'Retira a tu compañero activo.', 'Usa un Caramelo Raro para subir un nivel. Añade ✦ al nombre para elegir la variante shiny.']
    ],
    extra: 'Si el encuentro ya terminó en pantalla, el canal puede dar unos segundos extra para compensar el retraso. Vincula Twitch y Kick en el portal para compartir tu progreso cuando el streamer juega en ambas plataformas.'
  },
  en: {
    title: 'How to play', commands: 'Chat commands',
    steps: [
      ['Join a community', 'Type !poke join in the streamer’s Twitch or Kick chat. On Twitch, follow the channel first. You start with five Poké Balls.'],
      ['Catch a Pokémon', 'When one appears on stream, type !catch. A valid attempt uses one ball, and you can catch once per encounter.'],
      ['Summon a companion', 'Use !summon with a Pokémon you own. This replaces any companion you already have active.'],
      ['Unlock evolutions', 'Forms in an evolution family share a level. Three-stage lines unlock their evolutions at 16 and 31. A single unbranched evolution unlocks at 31, while branching lines such as Eevee unlock at 16.'],
      ['Check your progress', 'Sign into the portal and pick your streamer. Dex shows your catches, and Inventory shows your items.']
    ],
    groups: ['Sign-up and portal', 'Catching', 'Companions'],
    rows: [
      ['Join the channel’s game.', 'Get the portal link from chat.'],
      ['Try to catch with a Poké Ball.', 'Choose another ball type if you have one.'],
      ['Summon a normal variant or an unlocked evolution.', 'Summon a shiny variant.', 'Withdraw your active companion.', 'Use one Rare Candy to gain a level. Add ✦ after the name to select the shiny variant.']
    ],
    extra: 'After a Pokémon leaves the screen, the channel may allow extra seconds for stream delay. Link Twitch and Kick in the portal to share your progress when the streamer plays on both platforms.'
  }
}

const commands = [
  [['!registrar', '!poke join'], ['!web']],
  [['!captura', '!catch'], ['!captura super', '!captura ultra', '!captura maestra', '!catch great', '!catch ultra', '!catch master']],
  [['!invocar weedle', '!summon weedle'], ['!invocarshiny weedle', '!summonshiny weedle'], ['!retirar', '!summon out'], ['!caramelo weedle', '!candy weedle']]
]

export function helpPage(language, navigation) {
  const text = copy[language]
  const steps = text.steps.map(([title, description]) =>
    '<li><h3>' + title + '</h3><p>' + description + '</p></li>').join('')
  const groups = commands.map((group, index) => '<section class="sheet command-sheet"><h3>' +
    text.groups[index] + '</h3><ul>' + group.map((aliases, row) =>
      '<li><div>' + aliases.map(alias => '<code>' + alias + '</code>').join('') +
      '</div><p>' + text.rows[index][row] + '</p></li>').join('') + '</ul></section>').join('')
  return navigation + '<h1 class="help-title">' + text.title + '</h1><ol class="help-steps">' + steps +
    '</ol><p class="help-note">' + text.extra + '</p><h2>' + text.commands + '</h2><div class="help-commands">' +
    groups + '</div>'
}

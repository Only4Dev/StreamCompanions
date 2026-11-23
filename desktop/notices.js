export function createEncounterNotices(send, now = Date.now) {
  let previous
  let scheduled
  return async (nextAt, template, language = 'es') => {
    const remaining = nextAt - now()
    if (nextAt !== scheduled) {
      scheduled = nextAt
      previous = remaining
    }
    const crossed = [1, 5, 10].find(minutes => previous >= minutes * 60_000 && remaining <= minutes * 60_000)
    if (crossed && remaining > 0) {
      previous = remaining - 1
      if (template) await send(template.replaceAll('{min}', String(crossed))
        .replaceAll('{unidad}', language === 'en' ? (crossed === 1 ? 'minute' : 'minutes') : (crossed === 1 ? 'minuto' : 'minutos')))
    } else {
      previous = remaining
    }
  }
}

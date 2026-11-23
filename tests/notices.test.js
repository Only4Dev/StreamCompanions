import assert from 'node:assert/strict'
import test from 'node:test'
import { createEncounterNotices } from '../desktop/notices.js'

test('encounter notices cross each threshold once and reset for the next encounter', async () => {
  let clock = 0
  const messages = []
  const notice = createEncounterNotices(message => messages.push(message), () => clock)
  const template = '{min} {unidad}'
  const run = async (nextAt, time) => {
    clock = time
    await notice(nextAt, template)
  }
  for (const time of [0, 120001, 121000, 420000, 660001, 720000]) await run(720000, time)
  assert.deepEqual(messages, ['10 minutos', '5 minutos', '1 minuto'])
  for (const time of [720001, 840000, 840001]) await run(900000, time)
  assert.deepEqual(messages, ['10 minutos', '5 minutos', '1 minuto', '1 minuto'])
})

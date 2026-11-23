import assert from 'node:assert/strict'
import test from 'node:test'
import { checkForUpdate } from './update-check.js'

test('the updater reports only newer stable GitHub releases', async t => {
  const signal = new AbortController().signal
  let response
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/Only4Dev/StreamCompanions/releases/latest')
    assert.equal(options.redirect, 'error')
    return response()
  })

  response = () => Response.json({ tag_name: 'v0.10.0' })
  assert.deepEqual(await checkForUpdate('0.9.0', signal), { status: 'available', version: '0.10.0' })
  assert.deepEqual(await checkForUpdate('0.10.0', signal), { status: 'latest' })
  assert.deepEqual(await checkForUpdate('1.0.0', signal), { status: 'latest' })

  response = () => Response.json({ tag_name: 'v1.0.0-rc.1', prerelease: true })
  assert.deepEqual(await checkForUpdate('0.9.0', signal), { status: 'unavailable' })
  response = () => new Response(null, { status: 404 })
  assert.deepEqual(await checkForUpdate('0.9.0', signal), { status: 'unpublished' })
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invitationReceipt } from './invitationRequest.ts'
const id = '9e1ef291-c577-4aa1-b290-8644e0fa0607'
test('only an explicit saved-request receipt confirms acceptance', () => {
  assert.equal(invitationReceipt(202, { success: true, requestId: id }), id)
  for (const status of [0, 200, 400, 403, 429, 503]) assert.equal(invitationReceipt(status, { success: true, requestId: id }), null)
  for (const body of [null, {}, [], { success: false, requestId: id }, { success: true }, { success: true, requestId: '<bad>' }]) {
    assert.equal(invitationReceipt(202, body), null)
  }
})

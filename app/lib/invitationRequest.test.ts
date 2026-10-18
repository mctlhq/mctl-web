import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invitationReceipt, invitationEntryView } from './invitationRequest.ts'
const id = '9e1ef291-c577-4aa1-b290-8644e0fa0607'
test('only an explicit saved-request receipt confirms acceptance', () => {
  assert.equal(invitationReceipt(202, { success: true, requestId: id }), id)
  for (const status of [0, 200, 400, 403, 429, 503]) assert.equal(invitationReceipt(status, { success: true, requestId: id }), null)
  for (const body of [null, {}, [], { success: false, requestId: id }, { success: true }, { success: true, requestId: '<bad>' }]) {
    assert.equal(invitationReceipt(202, body), null)
  }
})

test('invitation entry preserves both identities and errors without granting workspace eligibility', () => {
  const anonymous = { entry: 'default' as const, invitationOnly: true, flow: 'legacy' as const, signedIn: false, canRequestWorkspace: false, legacySignedIn: false, authError: false }
  assert.deepEqual(invitationEntryView(anonymous), { workspace: false, badge: false })
  assert.deepEqual(invitationEntryView({ ...anonymous, legacySignedIn: true }), { workspace: true, badge: true })
  assert.deepEqual(invitationEntryView({ ...anonymous, authError: true }), { workspace: false, badge: true })
  const oidc = { ...anonymous, flow: 'zitadel' as const, signedIn: true }
  assert.deepEqual(invitationEntryView(oidc), { workspace: false, badge: true })
  assert.deepEqual(invitationEntryView({ ...oidc, canRequestWorkspace: true }), { workspace: true, badge: true })
  assert.deepEqual(invitationEntryView({ ...oidc, entry: 'invitation', canRequestWorkspace: true }), { workspace: false, badge: true })
  assert.deepEqual(invitationEntryView({ ...anonymous, entry: 'workspace' }), { workspace: true, badge: true })
  assert.deepEqual(invitationEntryView({ ...anonymous, invitationOnly: false }), { workspace: true, badge: true })
  assert.deepEqual(invitationEntryView({ ...anonymous, flow: 'zitadel', legacySignedIn: true }), { workspace: false, badge: false })
})

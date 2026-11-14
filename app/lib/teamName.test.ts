import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TEAM_NAME_MAX_LENGTH, isValidTeamName } from './teamName.ts'

test('a new team name may be 31 characters, not 32', () => {
  assert.equal(TEAM_NAME_MAX_LENGTH, 31)
  assert.equal(isValidTeamName('a'.repeat(31)), true)
  assert.equal(isValidTeamName('a'.repeat(30) + '-'), true)
  assert.equal(isValidTeamName('a'.repeat(32)), false)
  assert.equal(isValidTeamName('a'.repeat(63)), false)
})

test('a new team name is at least 2 characters', () => {
  assert.equal(isValidTeamName('ab'), true)
  assert.equal(isValidTeamName('a'), false)
  assert.equal(isValidTeamName(''), false)
})

test('a new team name is lowercase alphanumeric with hyphens, not leading with one', () => {
  for (const ok of ['my-team', 'team1', '1team', 'a-b-c']) assert.equal(isValidTeamName(ok), true, ok)
  for (const bad of ['-team', 'My-team', 'my_team', 'my team', 'team.io', 'tëam']) {
    assert.equal(isValidTeamName(bad), false, bad)
  }
})

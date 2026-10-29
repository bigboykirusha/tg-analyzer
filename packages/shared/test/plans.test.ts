import test from 'node:test'
import assert from 'node:assert/strict'
import { canManageMember, PLAN_LIMITS, PLAN_IDS, teamCan, teamPermissions } from '../src'

test('roles widen from viewer to owner', () => {
  assert.deepEqual(
    Object.entries(teamPermissions('viewer'))
      .filter(([, allowed]) => allowed)
      .map(([action]) => action),
    ['read'],
  )
  assert.equal(teamCan('analyst', 'shareReports'), true)
  assert.equal(teamCan('analyst', 'manageInvites'), false)
  assert.equal(teamCan('admin', 'delete'), false)
  assert.equal(teamCan('owner', 'delete'), true)
})

test('nobody manages the owner, and only admins and owners manage anyone', () => {
  assert.equal(canManageMember('admin', 'owner'), false)
  assert.equal(canManageMember('admin', 'admin'), true)
  assert.equal(canManageMember('analyst', 'viewer'), false)
})

test('every plan is larger than the one before', () => {
  for (let index = 1; index < PLAN_IDS.length; index += 1) {
    const smaller = PLAN_LIMITS[PLAN_IDS[index - 1]!]
    const larger = PLAN_LIMITS[PLAN_IDS[index]!]
    assert.ok(larger.members > smaller.members && larger.sharedReports > smaller.sharedReports)
  }
})

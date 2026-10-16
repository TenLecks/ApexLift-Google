import assert from 'node:assert/strict';
import { test } from './testkit';
import { REST_ALERT_ID, REST_CHANNEL_ID, restAlertPayload } from './restAlert';

await test('restAlertPayload schedules one exact, idle-safe notification at the end of rest', () => {
  const endAt = Date.UTC(2026, 9, 17, 10, 3, 0);
  const p = restAlertPayload(endAt, 'Romanian Deadlift');
  assert.equal(p.notifications.length, 1);
  const n = p.notifications[0];
  assert.equal(n.id, REST_ALERT_ID);
  assert.equal(n.channelId, REST_CHANNEL_ID);
  assert.equal(n.schedule.at, '2026-10-17T10:03:00.000Z');
  assert.equal(n.schedule.allowWhileIdle, true);
  assert.match(n.body, /Romanian Deadlift/);
});

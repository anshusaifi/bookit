/**
 * BookIt — Concurrency Test Script
 * 
 * Tests the no-oversell guarantee by firing simultaneous booking
 * requests against a single-capacity event.
 * 
 * Run: node test-concurrency.js
 * Requires: npm install axios (already in your project)
 */

const axios = require('axios');

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL        = 'http://localhost:5000/api';
const EVENT_CAPACITY  = 1;    // Change to 2, 5, 10 for stress tests
const CONCURRENT_REQS = 2;    // Change to 3, 10, 20 for stress tests
const RUN_ID          = Date.now(); // unique per run — avoids stale DB state

// ── Helpers ───────────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL });

const color = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const log = {
  info:    (msg) => console.log(color.cyan(`  i ${msg}`)),
  success: (msg) => console.log(color.green(`  OK ${msg}`)),
  fail:    (msg) => console.log(color.red(`  FAIL ${msg}`)),
  warn:    (msg) => console.log(color.yellow(`  WARN ${msg}`)),
  section: (msg) => console.log(color.bold(`\n-- ${msg} --------------------------------`)),
};

// ── Step 1: Create users and authenticate ─────────────────────────────────────
async function createAndLogin(name, email, role = 'USER') {
  const password = 'TestPass123!';
  try {
    await api.post('/auth/signup', { name, email, password, role });
  } catch (err) {
    if (err.response?.status !== 409) throw err;
  }
  const res = await api.post('/auth/login', { email, password });
  return res.data.data.token;
}

// ── Step 2: Create a test event via organizer account ─────────────────────────
async function createTestEvent(organizerToken, capacity) {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await api.post(
    '/organizer/events',
    {
      title:       `Concurrency Test [cap=${capacity}] ${Date.now()}`,
      description: 'Auto-created for concurrency testing.',
      venue:       'Test Venue',
      eventDate:   futureDate,
      capacity,
      price:       0,
    },
    { headers: { Authorization: `Bearer ${organizerToken}` } }
  );
  return res.data.data.event;
}

// ── Step 3: Fire a single booking attempt ─────────────────────────────────────
async function attemptBooking(userLabel, token, eventId) {
  const start = Date.now();
  try {
    const res = await api.post(
      `/events/${eventId}/book`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { user: userLabel, status: res.status, result: 'SUCCESS', message: 'Booking confirmed', ms: Date.now() - start };
  } catch (err) {
    return { user: userLabel, status: err.response?.status || 0, result: 'FAILED', message: err.response?.data?.message || err.message, ms: Date.now() - start };
  }
}

// ── Step 4: Analyze results ───────────────────────────────────────────────────
function analyzeResults(results, capacity) {
  log.section('Results');
  let successCount = 0;
  results.forEach((r) => {
    const icon = r.result === 'SUCCESS' ? 'OK' : 'NO';
    console.log(`  [${icon}] ${r.user.padEnd(12)} | HTTP ${r.status} | ${r.message} | ${r.ms}ms`);
    if (r.result === 'SUCCESS') successCount++;
  });

  const failCount    = results.length - successCount;
  const bugDetected  = successCount > capacity;

  log.section('Verdict');
  if (bugDetected) {
    log.fail(`RACE CONDITION! ${successCount} succeeded but capacity is ${capacity}.`);
    log.fail(`Your SELECT FOR UPDATE is NOT working correctly.`);
    process.exitCode = 1;
  } else if (successCount === capacity) {
    log.success(`PASS — Exactly ${successCount}/${capacity} booking(s) confirmed.`);
    log.success(`${failCount} request(s) correctly got 409 Conflict (sold out).`);
  } else {
    log.warn(`Only ${successCount}/${capacity} seats filled — check test setup.`);
  }

  return { successCount, failCount, bugDetected };
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function runTest({ capacity, concurrentUsers, label }) {
  console.log(color.bold(`\n${'='.repeat(55)}`));
  console.log(color.bold(`  SCENARIO: ${label}`));
  console.log(color.bold(`  Capacity: ${capacity} | Concurrent: ${concurrentUsers} requests`));
  console.log(color.bold(`${'='.repeat(55)}`));

  log.section('Setup');
  log.info('Authenticating organizer...');
  const organizerToken = await createAndLogin('Test Organizer', `org-${RUN_ID}@test.dev`, 'ORGANIZER');
  log.success('Organizer ready');

  log.info(`Creating event with capacity = ${capacity}...`);
  const event = await createTestEvent(organizerToken, capacity);
  log.success(`Event ID: ${event.id}`);

  log.info(`Creating ${concurrentUsers} user tokens...`);
  const tokens = await Promise.all(
    Array.from({ length: concurrentUsers }, (_, i) =>
      createAndLogin(`User ${i + 1}`, `user-${i + 1}-${RUN_ID}@test.dev`)
    )
  );
  log.success(`${concurrentUsers} users ready`);

  log.section('Firing simultaneous requests');
  log.info(`Launching all ${concurrentUsers} requests NOW via Promise.all...`);

  // Promise.all starts ALL requests before awaiting ANY response.
  // This is the gold standard for simulating simultaneous load from one process.
  const results = await Promise.all(
    tokens.map((token, i) => attemptBooking(`User ${i + 1}`, token, event.id))
  );

  const { successCount, bugDetected } = analyzeResults(results, capacity);

  log.section('PostgreSQL Verification Queries');
  console.log(`\n  -- 1. Confirmed bookings must equal ${capacity} (never more)`);
  console.log(`  SELECT COUNT(*) FROM "Booking"`);
  console.log(`  WHERE "eventId" = '${event.id}' AND status = 'CONFIRMED';\n`);
  console.log(`  -- 2. See every booking row`);
  console.log(`  SELECT b.id, u.email, b.status, b."createdAt"`);
  console.log(`  FROM "Booking" b JOIN "User" u ON b."userId" = u.id`);
  console.log(`  WHERE b."eventId" = '${event.id}' ORDER BY b."createdAt";\n`);
  console.log(`  -- 3. Activity log breakdown`);
  console.log(`  SELECT "activityType", COUNT(*) FROM "ActivityLog"`);
  console.log(`  WHERE "eventId" = '${event.id}'`);
  console.log(`  GROUP BY "activityType" ORDER BY "activityType";\n`);

  return { successCount, bugDetected, eventId: event.id };
}

// ── Run all scenarios ─────────────────────────────────────────────────────────
async function main() {
  console.log(color.bold('\nBookIt Concurrency Test Suite'));
  console.log('Testing the no-oversell guarantee\n');

  const scenarios = [
    { label: 'Assignment Requirement: 1 seat, 2 users',  capacity: 1,  concurrentUsers: CONCURRENT_REQS },
    { label: 'Stress Test: 2 seats, 3 users',            capacity: 2,  concurrentUsers: 3  },
    { label: 'Stress Test: 5 seats, 10 users',           capacity: 5,  concurrentUsers: 10 },
  ];

  const allResults = [];
  for (const scenario of scenarios) {
    try {
      const result = await runTest(scenario);
      allResults.push({ ...scenario, ...result });
    } catch (err) {
      log.fail(`Scenario "${scenario.label}" errored: ${err.message}`);
      if (err.response) console.error('  Response:', err.response.data);
    }
  }

  console.log(color.bold(`\n${'='.repeat(55)}`));
  console.log(color.bold('  FINAL SUMMARY'));
  console.log(color.bold(`${'='.repeat(55)}`));

  const passed = allResults.filter((r) => !r.bugDetected).length;
  allResults.forEach((r) => {
    const status = r.bugDetected ? color.red('FAIL') : color.green('PASS');
    console.log(`  [${status}] ${r.label}`);
    console.log(`         Got ${r.successCount} success(es), capacity was ${r.capacity}\n`);
  });

  if (passed < allResults.length) {
    console.log(color.red(`  ${passed}/${allResults.length} passed — RACE CONDITION DETECTED\n`));
    process.exit(1);
  } else {
    console.log(color.green(`  ${passed}/${allResults.length} passed — No-oversell guarantee confirmed\n`));
  }
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});

// prisma/seed.js
// Run with: pnpm prisma db seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ------------------------------------------------------------------
  // 1. Users
  // ------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('password123', 10);

  const organizer = await prisma.user.upsert({
    where:  { email: 'organizer@bookit.dev' },
    update: {},
    create: {
      name:     'Alice Organizer',
      email:    'organizer@bookit.dev',
      password: passwordHash,
      role:     'ORGANIZER',
    },
  });
  console.log(`✅ Organizer created  → ${organizer.email}`);

  const user1 = await prisma.user.upsert({
    where:  { email: 'bob@bookit.dev' },
    update: {},
    create: {
      name:     'Bob User',
      email:    'bob@bookit.dev',
      password: passwordHash,
      role:     'USER',
    },
  });
  console.log(`✅ User created       → ${user1.email}`);

  const user2 = await prisma.user.upsert({
    where:  { email: 'carol@bookit.dev' },
    update: {},
    create: {
      name:     'Carol User',
      email:    'carol@bookit.dev',
      password: passwordHash,
      role:     'USER',
    },
  });
  console.log(`✅ User created       → ${user2.email}\n`);

  // ------------------------------------------------------------------
  // 2. Events
  // ------------------------------------------------------------------
  const now = new Date();
  const days = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // Full-capacity event — useful for testing the sold-out concurrency path
  const soldOutEvent = await prisma.event.upsert({
    where:  { id: 'seed-event-sold-out' },
    update: {},
    create: {
      id:          'seed-event-sold-out',
      title:       'Sold-Out Workshop: Advanced React Patterns',
      description: 'A hands-on workshop covering advanced React patterns including compound components, render props, and custom hooks. Strictly limited to 2 seats to facilitate deep learning.',
      venue:       'TechHub, 101 Silicon Ave, San Francisco CA',
      eventDate:   days(7),
      capacity:    2,
      price:       99.00,
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Event created      → "${soldOutEvent.title}" (capacity: ${soldOutEvent.capacity})`);

  // Open event — available for users to book
  const openEvent = await prisma.event.upsert({
    where:  { id: 'seed-event-open' },
    update: {},
    create: {
      id:          'seed-event-open',
      title:       'BookIt Launch Party',
      description: 'Celebrate the launch of BookIt — the fastest event booking platform on the web. Networking, live demos, and free food included.',
      venue:       'Rooftop Lounge, 200 Market St, San Francisco CA',
      eventDate:   days(14),
      capacity:    50,
      price:       0.00,
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Event created      → "${openEvent.title}" (capacity: ${openEvent.capacity})`);

  // Past event — useful for analytics queries
  const pastEvent = await prisma.event.upsert({
    where:  { id: 'seed-event-past' },
    update: {},
    create: {
      id:          'seed-event-past',
      title:       'Node.js Performance Deep Dive',
      description: 'A past conference covering V8 internals, event loop profiling, and real-world Node.js performance tuning techniques.',
      venue:       'Convention Center, Hall B, Austin TX',
      eventDate:   days(-10),
      capacity:    100,
      price:       149.00,
      organizerId: organizer.id,
    },
  });
  console.log(`✅ Event created      → "${pastEvent.title}" (past event)\n`);

  // ------------------------------------------------------------------
  // 3. Bookings
  // ------------------------------------------------------------------

  // Fill both seats on the sold-out event
  await prisma.booking.upsert({
    where:  { userId_eventId: { userId: user1.id, eventId: soldOutEvent.id } },
    update: {},
    create: { userId: user1.id, eventId: soldOutEvent.id, status: 'CONFIRMED' },
  });

  await prisma.booking.upsert({
    where:  { userId_eventId: { userId: user2.id, eventId: soldOutEvent.id } },
    update: {},
    create: { userId: user2.id, eventId: soldOutEvent.id, status: 'CONFIRMED' },
  });
  console.log(`✅ Bookings created   → both seats on sold-out event filled`);

  // Bob books the open event
  await prisma.booking.upsert({
    where:  { userId_eventId: { userId: user1.id, eventId: openEvent.id } },
    update: {},
    create: { userId: user1.id, eventId: openEvent.id, status: 'CONFIRMED' },
  });
  console.log(`✅ Booking created    → Bob on open event`);

  // Carol books then cancels on the past event (demonstrates cancellation flow)
  const carolPastBooking = await prisma.booking.upsert({
    where:  { userId_eventId: { userId: user2.id, eventId: pastEvent.id } },
    update: {},
    create: {
      userId:      user2.id,
      eventId:     pastEvent.id,
      status:      'CANCELLED',
      cancelledAt: days(-11), // cancelled before the event
    },
  });
  console.log(`✅ Booking created    → Carol cancelled booking on past event\n`);

  // ------------------------------------------------------------------
  // 4. Activity Logs
  // ------------------------------------------------------------------
  const logs = [
    // Sold-out event views
    { activityType: 'EVENT_VIEWED',       userId: user1.id,   eventId: soldOutEvent.id },
    { activityType: 'BOOKING_STARTED',    userId: user1.id,   eventId: soldOutEvent.id },
    { activityType: 'BOOKING_CONFIRMED',  userId: user1.id,   eventId: soldOutEvent.id },

    { activityType: 'EVENT_VIEWED',       userId: user2.id,   eventId: soldOutEvent.id },
    { activityType: 'BOOKING_STARTED',    userId: user2.id,   eventId: soldOutEvent.id },
    { activityType: 'BOOKING_CONFIRMED',  userId: user2.id,   eventId: soldOutEvent.id },

    // Anonymous view of the open event
    { activityType: 'EVENT_VIEWED',       userId: null,       eventId: openEvent.id },
    { activityType: 'EVENT_VIEWED',       userId: user1.id,   eventId: openEvent.id },
    { activityType: 'BOOKING_STARTED',    userId: user1.id,   eventId: openEvent.id },
    { activityType: 'BOOKING_CONFIRMED',  userId: user1.id,   eventId: openEvent.id },

    // Past event — Carol's full journey including cancellation
    { activityType: 'EVENT_VIEWED',       userId: user2.id,   eventId: pastEvent.id },
    { activityType: 'BOOKING_STARTED',    userId: user2.id,   eventId: pastEvent.id },
    { activityType: 'BOOKING_CONFIRMED',  userId: user2.id,   eventId: pastEvent.id },
    { activityType: 'BOOKING_CANCELLED',  userId: user2.id,   eventId: pastEvent.id },
  ];

  await prisma.activityLog.createMany({ data: logs });
  console.log(`✅ Activity logs created → ${logs.length} entries\n`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('─'.repeat(50));
  console.log('🎉 Seed completed successfully!\n');
  console.log('Test accounts (password: password123)');
  console.log(`  Organizer → organizer@bookit.dev`);
  console.log(`  User 1    → bob@bookit.dev`);
  console.log(`  User 2    → carol@bookit.dev`);
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

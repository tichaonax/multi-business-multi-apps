const { PrismaClient } = require('@prisma/client');

describe('Prisma sync tables smoke test', () => {
  let db;

  beforeAll(() => {
    db = new PrismaClient();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  test('insert and read sync_events', async () => {
    const eventId = require('crypto').randomUUID();
    const created = await db.sync_events.create({
      data: {
        eventId,
        sourceNodeId: 'test-node',
        tableName: 'test_table',
        recordId: 'rec-1',
        operation: 'INSERT',
        changeData: { foo: 'bar' },
      },
    });

    expect(created).toBeDefined();
    expect(created.eventId).toBe(eventId);

    const found = await db.sync_events.findUnique({ where: { eventId } });
    expect(found).toBeDefined();
    expect(found.tableName).toBe('test_table');

    // clean up
    await db.sync_events.delete({ where: { eventId } });
  }, 20000);
});

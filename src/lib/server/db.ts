import Database from "better-sqlite3";
import { env } from "$env/dynamic/private";

const DB_PATH = env.DATABASE_PATH || "time-tracker.db";

type DbInstance = Database.Database;

const globalForDb = globalThis as unknown as {
  __timeTrackerDb?: DbInstance;
};

function createDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_totals (
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, day),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS active_timers (
      user_id TEXT PRIMARY KEY,
      started_at_epoch INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_day_totals_user_day ON day_totals(user_id, day);
  `);

  return db;
}

export function getDb() {
  if (!globalForDb.__timeTrackerDb) {
    globalForDb.__timeTrackerDb = createDb();
  }
  return globalForDb.__timeTrackerDb;
}

export function upsertUser(user: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO users (id, email, name, image, created_at, updated_at)
      VALUES (@id, @email, @name, @image, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        image = excluded.image,
        updated_at = excluded.updated_at
    `,
  ).run({
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export function getMonthTotals(userId: string, month: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT day, total_minutes
        FROM day_totals
        WHERE user_id = ? AND day LIKE ?
      `,
    )
    .all(userId, `${month}-%`) as Array<{ day: string; total_minutes: number }>;

  return Object.fromEntries(rows.map((row) => [row.day, row.total_minutes]));
}

export function setDayMinutes(userId: string, day: string, minutes: number) {
  const db = getDb();
  const safeMinutes = Math.max(0, Math.floor(minutes));

  db.prepare(
    `
      INSERT INTO day_totals (user_id, day, total_minutes, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, day) DO UPDATE SET
        total_minutes = excluded.total_minutes,
        updated_at = excluded.updated_at
    `,
  ).run(userId, day, safeMinutes, new Date().toISOString());

  return safeMinutes;
}

export function startTimer(userId: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT user_id FROM active_timers WHERE user_id = ?")
    .get(userId);
  if (existing) {
    return { started: false, reason: "TIMER_ALREADY_RUNNING" as const };
  }

  db.prepare(
    "INSERT INTO active_timers (user_id, started_at_epoch) VALUES (?, ?)",
  ).run(userId, Math.floor(Date.now() / 1000));

  return { started: true as const };
}

export function getTimerStatus(userId: string) {
  const db = getDb();
  const timer = db
    .prepare("SELECT started_at_epoch FROM active_timers WHERE user_id = ?")
    .get(userId) as { started_at_epoch: number } | undefined;

  if (!timer) {
    return { isRunning: false, elapsedSeconds: 0 };
  }

  return {
    isRunning: true,
    elapsedSeconds: Math.max(
      0,
      Math.floor(Date.now() / 1000) - timer.started_at_epoch,
    ),
  };
}

export function stopTimer(userId: string, day: string) {
  const db = getDb();

  const tx = db.transaction(() => {
    const timer = db
      .prepare("SELECT started_at_epoch FROM active_timers WHERE user_id = ?")
      .get(userId) as { started_at_epoch: number } | undefined;

    if (!timer) {
      return { stopped: false as const, reason: "TIMER_NOT_RUNNING" as const };
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor(Date.now() / 1000) - timer.started_at_epoch,
    );
    const minutesToAdd = Math.floor(elapsedSeconds / 60);

    const current = db
      .prepare(
        "SELECT total_minutes FROM day_totals WHERE user_id = ? AND day = ?",
      )
      .get(userId, day) as { total_minutes: number } | undefined;

    const nextTotal = (current?.total_minutes ?? 0) + minutesToAdd;

    db.prepare(
      `
        INSERT INTO day_totals (user_id, day, total_minutes, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, day) DO UPDATE SET
          total_minutes = excluded.total_minutes,
          updated_at = excluded.updated_at
      `,
    ).run(userId, day, nextTotal, new Date().toISOString());

    db.prepare("DELETE FROM active_timers WHERE user_id = ?").run(userId);

    return {
      stopped: true as const,
      elapsedSeconds,
      addedMinutes: minutesToAdd,
      totalMinutes: nextTotal,
    };
  });

  return tx();
}

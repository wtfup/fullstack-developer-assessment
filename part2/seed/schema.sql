-- Part 2 — "Class Booking Ops" lab schema (Postgres 16, synthetic data only).
-- Applied with `search_path` set to the target schema (part2_lab or part2_test_<24hex>).

CREATE TABLE members (
  id          serial PRIMARY KEY,
  name        text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id            serial PRIMARY KEY,
  title         text        NOT NULL,
  starts_at     timestamptz NOT NULL,
  duration_min  integer     NOT NULL CHECK (duration_min > 0),
  capacity      integer     NOT NULL CHECK (capacity > 0),
  coach         text        NOT NULL,
  cancelled_at  timestamptz NULL
);

CREATE TABLE bookings (
  id              serial PRIMARY KEY,
  class_id        integer     NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  member_id       integer     NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'attended')),
  idempotency_key text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX classes_starts_at_idx ON classes (starts_at);
CREATE INDEX bookings_class_id_idx ON bookings (class_id);

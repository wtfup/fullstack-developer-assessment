-- Part 2 — deterministic synthetic fixture (canonical; do not edit).
--
-- 8 members, 8 classes, 18 bookings.
-- Notes for context (not exhaustive):
--   * class 1 starts 2026-08-11 01:00 IST (= 2026-08-10 19:30 UTC) — IST/UTC boundary case.
--   * class 3 has capacity 2 and is already full.
--   * class 5 has one attended booking and a capacity of 6.
--   * class 7's title deliberately contains an HTML image tag (markup-safety test string).
--   * several members hold more than one booking; three bookings are cancelled.

INSERT INTO members (id, name, email, created_at) VALUES
  (1, 'Asha Verma',   'asha.verma@example.test',   '2026-07-01T09:00:00+05:30'),
  (2, 'Rahul Singh',  'rahul.singh@example.test',  '2026-07-02T10:15:00+05:30'),
  (3, 'Meera Pillai', 'meera.pillai@example.test', '2026-07-03T11:30:00+05:30'),
  (4, 'Karan Dogra',  'karan.dogra@example.test',  '2026-07-05T08:45:00+05:30'),
  (5, 'Nisha Rao',    'nisha.rao@example.test',    '2026-07-06T18:20:00+05:30'),
  (6, 'Vikram Joshi', 'vikram.joshi@example.test', '2026-07-08T07:10:00+05:30'),
  (7, 'Tara Menon',   'tara.menon@example.test',   '2026-07-09T19:05:00+05:30'),
  (8, 'Dev Anand',    'dev.anand@example.test',    '2026-07-10T12:40:00+05:30');
SELECT setval('members_id_seq', (SELECT max(id) FROM members));

INSERT INTO classes (id, title, starts_at, duration_min, capacity, coach, cancelled_at) VALUES
  (1, 'Sunrise Yoga Flow',           '2026-08-11T01:00:00+05:30', 45, 12, 'Priya Nair',   NULL),
  (2, 'Evening Spin Blast',          '2026-08-11T19:30:00+05:30', 60, 10, 'Arjun Mehta',  NULL),
  (3, 'Pilates Small Group',         '2026-08-12T10:00:00+05:30', 50,  2, 'Priya Nair',   NULL),
  (4, 'Strength Fundamentals',       '2026-08-12T18:00:00+05:30', 60,  8, 'Rohan Kapoor', NULL),
  (5, 'Mobility and Recovery',       '2026-08-13T07:30:00+05:30', 40,  6, 'Sneha Iyer',   NULL),
  (6, 'HIIT Express',                '2026-08-13T20:00:00+05:30', 30, 14, 'Arjun Mehta',  NULL),
  (7, '<img src=x onerror="window.__xss=1">', '2026-08-14T17:00:00+05:30', 45, 5, 'Sneha Iyer', NULL),
  (8, 'Weekend Bootcamp',            '2026-08-15T09:00:00+05:30', 90, 20, 'Rohan Kapoor', NULL);
SELECT setval('classes_id_seq', (SELECT max(id) FROM classes));

INSERT INTO bookings (id, class_id, member_id, status, idempotency_key, created_at) VALUES
  -- class 1 (Sunrise Yoga Flow): 3 booked + 1 cancelled for the same member
  (1,  1, 1, 'booked',    'seed-key-1-1',    '2026-08-08T09:00:00+05:30'),
  (2,  1, 2, 'booked',    'seed-key-1-2',    '2026-08-08T09:05:00+05:30'),
  (3,  1, 3, 'booked',    'seed-key-1-3',    '2026-08-08T09:10:00+05:30'),
  (4,  1, 1, 'cancelled', 'seed-key-1-4',    '2026-08-08T09:15:00+05:30'),
  -- class 2 (Evening Spin Blast): one member holds two rows
  (5,  2, 4, 'attended',  'seed-key-2-5',    '2026-08-08T10:00:00+05:30'),
  (6,  2, 4, 'booked',    'seed-key-2-6',    '2026-08-08T10:05:00+05:30'),
  (7,  2, 5, 'booked',    'seed-key-2-7',    '2026-08-08T10:10:00+05:30'),
  -- class 3 (Pilates Small Group): capacity 2, already full
  (8,  3, 6, 'booked',    'seed-key-3-8',    '2026-08-09T11:00:00+05:30'),
  (9,  3, 7, 'booked',    'seed-key-3-9',    '2026-08-09T11:05:00+05:30'),
  -- class 4 (Strength Fundamentals)
  (10, 4, 1, 'booked',    'seed-key-4-10',   '2026-08-09T12:00:00+05:30'),
  (11, 4, 2, 'cancelled', 'seed-key-4-11',   '2026-08-09T12:05:00+05:30'),
  -- class 5 (Mobility and Recovery)
  (12, 5, 3, 'attended',  'seed-key-5-12',   '2026-08-10T07:00:00+05:30'),
  -- class 6 (HIIT Express)
  (13, 6, 5, 'booked',    'seed-key-6-13',   '2026-08-10T08:00:00+05:30'),
  (14, 6, 7, 'booked',    'seed-key-6-14',   '2026-08-10T08:05:00+05:30'),
  (15, 6, 8, 'cancelled', 'seed-key-6-15',   '2026-08-10T08:10:00+05:30'),
  -- class 7 (title contains an HTML test string)
  (16, 7, 8, 'booked',    'seed-key-7-16',   '2026-08-10T13:00:00+05:30'),
  -- class 8 (Weekend Bootcamp)
  (17, 8, 2, 'booked',    'seed-key-8-17',   '2026-08-10T14:00:00+05:30'),
  (18, 8, 6, 'booked',    'seed-key-8-18',   '2026-08-10T14:05:00+05:30');
SELECT setval('bookings_id_seq', (SELECT max(id) FROM bookings));

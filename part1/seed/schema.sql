-- Part 1 — "Craft" assessment: canonical schema (frozen fixture schema).
-- Synthetic freelance-ops data only. All money is integer paise.

CREATE TABLE clients (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  created_at timestamp NOT NULL
);

CREATE TABLE projects (
  id         serial PRIMARY KEY,
  client_id  integer NOT NULL REFERENCES clients(id),
  name       text NOT NULL,
  status     text NOT NULL CHECK (status IN ('active', 'paused', 'closed')),
  rate_paise integer NOT NULL CHECK (rate_paise > 0),
  created_at timestamp NOT NULL
);

CREATE TABLE time_entries (
  id         serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id),
  worked_on  date NOT NULL,
  minutes    integer NOT NULL CHECK (minutes > 0),
  billable   boolean NOT NULL,
  note       text
);

CREATE TABLE invoices (
  id          serial PRIMARY KEY,
  client_id   integer NOT NULL REFERENCES clients(id),
  number      text NOT NULL UNIQUE,
  issued_on   date NOT NULL,
  due_on      date NOT NULL,
  status      text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  total_paise integer NOT NULL CHECK (total_paise > 0),
  created_at  timestamp NOT NULL,
  CHECK (due_on >= issued_on)
);

CREATE TABLE payments (
  id           serial PRIMARY KEY,
  invoice_id   integer REFERENCES invoices(id),
  client_id    integer NOT NULL REFERENCES clients(id),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  received_on  date NOT NULL,
  method       text NOT NULL,
  reference    text NOT NULL,
  created_at   timestamp NOT NULL
);

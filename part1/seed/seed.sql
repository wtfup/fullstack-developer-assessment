-- Part 1 — "Craft" assessment: canonical deterministic seed fixture (frozen).
-- Synthetic data only. Money is integer paise. One INSERT statement per line.

INSERT INTO clients (id, name, email, created_at) VALUES (1, 'Acme Power Yoga', 'acme@example.test', '2026-01-05 09:00:00');
INSERT INTO clients (id, name, email, created_at) VALUES (2, 'Blue Harbor Cafe', 'blue@example.test', '2026-01-06 10:30:00');
INSERT INTO clients (id, name, email, created_at) VALUES (3, 'Crestline Legal', 'legal@example.test', '2026-01-07 14:15:00');
INSERT INTO clients (id, name, email, created_at) VALUES (4, 'Drift Analytics', 'drift@example.test', '2026-01-08 11:45:00');
INSERT INTO clients (id, name, email, created_at) VALUES (5, 'Evergreen Foods', 'orders@example.test', '2026-01-09 16:20:00');
INSERT INTO clients (id, name, email, created_at) VALUES (6, 'Fernwood Studio', 'studio@example.test', '2026-01-10 08:05:00');

INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (1, 1, 'Website Redesign', 'active', 150000, '2026-01-12 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (2, 1, 'Mobile App', 'paused', 200000, '2026-02-02 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (3, 2, 'Brand Refresh', 'active', 120000, '2026-01-15 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (4, 3, 'Case Management Portal', 'active', 250000, '2026-02-10 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (5, 4, 'Analytics Dashboard', 'active', 180000, '2026-03-01 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (6, 5, 'E-commerce Migration', 'closed', 160000, '2026-01-20 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (7, 6, 'Portfolio Site', 'active', 100000, '2026-03-15 09:00:00');
INSERT INTO projects (id, client_id, name, status, rate_paise, created_at) VALUES (8, 2, 'Loyalty Program', 'paused', 140000, '2026-04-01 09:00:00');

INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (1, 1, '2026-03-02', 120, true, 'Discovery workshop');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (2, 1, '2026-03-09', 140, true, 'Wireframes');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (3, 1, '2026-03-16', 100, true, NULL);
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (4, 1, '2026-03-23', 60, true, 'Design review');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (5, 1, '2026-03-30', 60, true, 'Design review follow-up');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (6, 1, '2026-04-06', 120, false, 'Internal rework');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (7, 2, '2026-04-13', 100, true, 'API spike');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (8, 2, '2026-04-20', 100, true, 'API spike continues');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (9, 2, '2026-04-27', 100, true, NULL);
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (10, 2, '2026-05-04', 60, false, 'Recruitment call (unbillable)');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (11, 3, '2026-03-05', 75, true, 'Logo concepts');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (12, 3, '2026-03-12', 75, true, 'Brand guidelines');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (13, 3, '2026-03-19', 75, false, 'Client revisions (not billed)');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (14, 3, '2026-03-26', 75, false, NULL);
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (15, 4, '2026-05-11', 60, false, 'Scope workshop');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (16, 4, '2026-05-18', 60, false, 'Data model draft');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (17, 4, '2026-05-25', 60, false, 'Security questionnaire');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (18, 5, '2026-06-01', 75, true, 'Dashboard charts');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (19, 5, '2026-06-08', 75, true, 'Dashboard charts');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (20, 5, '2026-06-15', 75, true, NULL);
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (21, 5, '2026-06-22', 60, false, 'Onboarding session (free)');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (22, 5, '2026-06-29', 15, false, 'Admin');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (23, 6, '2026-02-02', 45, true, 'Shopify migration');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (24, 6, '2026-02-09', 45, true, 'Catalog import');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (25, 6, '2026-02-16', 30, false, 'Post-launch support');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (26, 7, '2026-07-06', 85, true, 'Portfolio build');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (27, 7, '2026-07-13', 85, true, 'Portfolio build');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (28, 7, '2026-07-20', 50, false, 'Content edits (free)');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (29, 7, '2026-07-27', 40, false, 'Photo optimization');
INSERT INTO time_entries (id, project_id, worked_on, minutes, billable, note) VALUES (30, 7, '2026-08-03', 40, false, NULL);

INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (1, 1, 'INV-1001', '2026-06-01', '2026-06-15', 'sent', 120000, '2026-06-01 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (2, 1, 'INV-1002', '2026-07-01', '2026-07-15', 'paid', 80000, '2026-07-01 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (3, 2, 'INV-1003', '2026-07-01', '2026-07-20', 'sent', 45000, '2026-07-01 11:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (4, 2, 'INV-1004', '2026-08-01', '2026-08-20', 'draft', 60000, '2026-08-01 12:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (5, 3, 'INV-1005', '2026-05-15', '2026-06-01', 'paid', 200000, '2026-05-15 09:30:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (6, 3, 'INV-1006', '2026-08-05', '2026-08-25', 'sent', 150000, '2026-08-05 09:30:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (7, 4, 'INV-1007', '2026-08-10', '2026-09-01', 'draft', 50000, '2026-08-10 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (8, 4, 'INV-1008', '2026-06-20', '2026-07-05', 'void', 30000, '2026-06-20 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (9, 5, 'INV-1009', '2026-08-05', '2026-08-30', 'sent', 95000, '2026-08-05 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (10, 5, 'INV-1010', '2026-07-15', '2026-07-31', 'paid', 70000, '2026-07-15 10:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (11, 6, 'INV-1011', '2026-08-05', '2026-09-05', 'paid', 110000, '2026-08-05 11:00:00');
INSERT INTO invoices (id, client_id, number, issued_on, due_on, status, total_paise, created_at) VALUES (12, 6, 'INV-1012', '2026-08-12', '2026-09-12', 'void', 25000, '2026-08-12 11:00:00');

INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (1, 2, 1, 80000, '2026-06-05', 'bank', 'IMPS-4001', '2026-06-05 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (2, NULL, 1, 30000, '2026-08-08', 'bank', 'NEFT-8801', '2026-08-08 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (3, NULL, 1, 25000, '2026-08-08', 'bank', 'NEFT-8802', '2026-08-08 10:05:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (4, 3, 2, 30000, '2026-07-20', 'card', 'AXIS-2201', '2026-07-20 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (5, NULL, 2, 30000, '2026-08-20', 'card', 'AXIS-2201', '2026-08-20 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (6, 5, 3, 100000, '2026-05-20', 'bank', 'RTGS-3300', '2026-05-20 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (7, NULL, 3, 50000, '2026-06-12', 'bank', 'NEFT-3401', '2026-06-12 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (8, NULL, 3, 75000, '2026-08-02', 'upi', 'UPI-7788', '2026-08-02 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (9, NULL, 3, 75000, '2026-08-02', 'upi', 'upi-7788', '2026-08-02 10:01:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (10, 10, 5, 70000, '2026-07-25', 'bank', 'HDFC-5100', '2026-07-25 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (11, NULL, 5, 30000, '2026-07-10', 'upi', 'NEFT-5501', '2026-07-10 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (12, NULL, 5, 30000, '2026-07-10', 'upi', 'NEFT-5501', '2026-07-10 10:02:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (13, NULL, 5, 30000, '2026-07-10', 'upi', 'NEFT-5502', '2026-07-10 10:03:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (14, NULL, 4, 50000, '2026-08-15', 'bank', 'RTGS-6100', '2026-08-15 10:00:00');
INSERT INTO payments (id, invoice_id, client_id, amount_paise, received_on, method, reference, created_at) VALUES (15, 11, 6, 110000, '2026-08-20', 'bank', 'NEFT-7700', '2026-08-20 10:00:00');

SELECT setval(pg_get_serial_sequence('clients', 'id'), (SELECT max(id) FROM clients), true);
SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT max(id) FROM projects), true);
SELECT setval(pg_get_serial_sequence('time_entries', 'id'), (SELECT max(id) FROM time_entries), true);
SELECT setval(pg_get_serial_sequence('invoices', 'id'), (SELECT max(id) FROM invoices), true);
SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT max(id) FROM payments), true);

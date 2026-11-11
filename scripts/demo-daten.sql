-- Beispiel-Leads für die lokale Demo (scripts/demo-lokal.sh). Erfundene Namen und
-- Nummern, nur in der lokalen Demo-Datenbank. Zeiten relativ zu „jetzt“.

INSERT INTO leads (nr, created_at, updated_at, status, vorname, telefon, email, situation, start, budget, erreichbar, woher, quelle, einwilligung_at, einwilligung_version, ip_hash, user_agent) VALUES
('481203', strftime('%s','now')*1000 - 2*3600000,   strftime('%s','now')*1000 - 2*3600000,   'neu',         'Thomas',    '+49 151 00000001', 'thomas@example.com', 'getrennt',  'sofort',      'raten', 'abends',      'instagram',  'gaslighting',       strftime('%s','now')*1000 - 2*3600000,   '2026-11-11', 'demo', 'demo'),
('593817', strftime('%s','now')*1000 - 5*3600000,   strftime('%s','now')*1000 - 5*3600000,   'neu',         'Daniel',    '+43 660 0000002',  NULL,                 'beziehung', 'wochen',      'ja',    'vormittags',  'tiktok',     'kontaktimpuls',     strftime('%s','now')*1000 - 5*3600000,   '2026-11-11', 'demo', 'demo'),
('702551', strftime('%s','now')*1000 - 26*3600000,  strftime('%s','now')*1000 - 26*3600000,  'neu',         'Kai',       '+49 152 00000007', NULL,                 'onoff',     'wochen',      'raten', 'abends',      'instagram',  'ex-vermissen',      strftime('%s','now')*1000 - 26*3600000,  '2026-11-11', 'demo', 'demo'),
('318764', strftime('%s','now')*1000 - 30*3600000,  strftime('%s','now')*1000 - 20*3600000,  'kontaktiert', 'Markus',    '+49 170 00000003', 'markus@example.com', 'onoff',     'sofort',      'ja',    'egal',        'google',     NULL,                strftime('%s','now')*1000 - 30*3600000,  '2026-11-11', 'demo', 'demo'),
('865390', strftime('%s','now')*1000 - 50*3600000,  strftime('%s','now')*1000 - 44*3600000,  'kontaktiert', 'Michael',   '+49 171 00000008', NULL,                 'beziehung', 'sofort',      'raten', 'vormittags',  'google',     NULL,                strftime('%s','now')*1000 - 50*3600000,  '2026-11-11', 'demo', 'demo'),
('247118', strftime('%s','now')*1000 - 3*86400000,  strftime('%s','now')*1000 - 2*86400000,  'termin',      'Jens',      '+41 79 000 00 04', 'jens@example.com',   'getrennt',  'sofort',      'raten', 'nachmittags', 'empfehlung', 'ratgeber-nachhall', strftime('%s','now')*1000 - 3*86400000,  '2026-11-11', 'demo', 'demo'),
('659021', strftime('%s','now')*1000 - 6*86400000,  strftime('%s','now')*1000 - 5*86400000,  'termin',      'Patrick',   '+49 160 00000009', NULL,                 'getrennt',  'wochen',      'ja',    'abends',      'instagram',  'gaslighting',       strftime('%s','now')*1000 - 6*86400000,  '2026-11-11', 'demo', 'demo'),
('130477', strftime('%s','now')*1000 - 9*86400000,  strftime('%s','now')*1000 - 4*86400000,  'klient',      'Florian',   '+49 160 00000005', 'florian@example.com','getrennt',  'sofort',      'ja',    'abends',      'instagram',  'uebergabe',         strftime('%s','now')*1000 - 9*86400000,  '2026-11-11', 'demo', 'demo'),
('774302', strftime('%s','now')*1000 - 20*86400000, strftime('%s','now')*1000 - 12*86400000, 'klient',      'Stefan',    '+49 175 00000010', NULL,                 'onoff',     'sofort',      'raten', 'egal',        'empfehlung', NULL,                strftime('%s','now')*1000 - 20*86400000, '2026-11-11', 'demo', 'demo'),
('912645', strftime('%s','now')*1000 - 14*86400000, strftime('%s','now')*1000 - 11*86400000, 'verloren',    'Sebastian', '+49 157 00000006', NULL,                 'anderes',   'informieren', 'ja',    'egal',        'anzeige',    NULL,                strftime('%s','now')*1000 - 14*86400000, '2026-11-11', 'demo', 'demo');

-- Jede Anfrage beginnt im Verlauf mit ihrem Eingang.
INSERT INTO lead_events (lead_id, at, kind, text)
SELECT id, created_at, 'angelegt', 'Anfrage über das Formular auf /terminbuchung/' FROM leads;

-- Ein paar Schritte, damit Pipeline und Verlauf nach echter Arbeit aussehen.
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at, 'status', 'Neu → Kontaktiert' FROM leads WHERE nr IN ('318764', '865390');
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at + 60000, 'notiz', 'Per WhatsApp geschrieben, antwortet heute Abend.' FROM leads WHERE nr = '318764';
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, created_at + 3600000, 'status', 'Neu → Kontaktiert' FROM leads WHERE nr IN ('247118', '659021', '130477', '774302', '912645');
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at, 'status', 'Kontaktiert → Termin vereinbart' FROM leads WHERE nr IN ('247118', '659021');
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at + 60000, 'notiz', 'Kennenlerngespräch Donnerstag, 18 Uhr, per WhatsApp-Video.' FROM leads WHERE nr = '247118';
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at - 86400000, 'status', 'Kontaktiert → Termin vereinbart' FROM leads WHERE nr IN ('130477', '774302');
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at, 'status', 'Termin vereinbart → Klient' FROM leads WHERE nr IN ('130477', '774302');
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at + 60000, 'notiz', 'Startet mit „Endlich Loslassen“, erste Sitzung nächste Woche.' FROM leads WHERE nr = '130477';
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at, 'status', 'Kontaktiert → Kein Interesse' FROM leads WHERE nr = '912645';
INSERT INTO lead_events (lead_id, at, kind, text) SELECT id, updated_at + 60000, 'notiz', 'Will sich erst selbst einlesen, Klarheitsguide empfohlen.' FROM leads WHERE nr = '912645';

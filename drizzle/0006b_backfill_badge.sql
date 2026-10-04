INSERT INTO items (id, owner_id, item_type, source, equipped, created_at)
SELECT lower(hex(randomblob(16))), id, 'badge:national', 'craft', 1, unixepoch() * 1000
FROM users
WHERE badge IS NOT NULL AND badge != ''
AND NOT EXISTS (SELECT 1 FROM items WHERE items.owner_id = users.id AND items.item_type = 'badge:national');

-- 设施产出冷却：每个产出设施每 30 分钟产生一次收入（0 = 从未产出，首次立即就绪）
ALTER TABLE game_tiles ADD COLUMN last_collect_at INTEGER NOT NULL DEFAULT 0;

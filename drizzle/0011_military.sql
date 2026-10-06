-- 军事化改造：建筑兵力值（兵场 >0，普通建筑 0）
ALTER TABLE game_tiles ADD COLUMN power INTEGER NOT NULL DEFAULT 0;

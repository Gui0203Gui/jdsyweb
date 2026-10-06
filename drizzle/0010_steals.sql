-- 游戏竞争模块：偷抢资源记录（防刷）
-- 每个攻击者每天从同一目标偷取资源有上限

CREATE TABLE IF NOT EXISTS game_steals (
  attacker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (attacker_id, target_id, date)
);

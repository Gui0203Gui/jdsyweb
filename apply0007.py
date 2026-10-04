# -*- coding: utf-8 -*-
import sqlite3

SQLITE = r"D:\jdsyweb\.wrangler\state\v3\d1\miniflare-D1DatabaseObject\0165726d4b7b8fd04651a8e98c737dae9f10e618b3d009fdb57cb071c0ff7f60.sqlite"
con = sqlite3.connect(SQLITE)
try:
    con.execute("ALTER TABLE teacher_likes ADD COLUMN day TEXT NOT NULL DEFAULT ''")
    print("col day ok")
except Exception as e:
    print("day col:", e)
try:
    con.execute("ALTER TABLE teacher_likes ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0")
    print("col cancelled ok")
except Exception as e:
    print("cancelled col:", e)
con.execute("UPDATE teacher_likes SET day = date((created_at / 1000) + 28800, 'unixepoch') WHERE day = ''")
try:
    con.execute("DROP INDEX IF EXISTS teacher_likes_user_teacher_idx")
    con.execute("CREATE UNIQUE INDEX teacher_likes_user_teacher_day_idx ON teacher_likes(user_id, teacher_id, day)")
    print("index rebuilt")
except Exception as e:
    print("index:", e)
con.commit()
cols = con.execute("PRAGMA table_info(teacher_likes)").fetchall()
print("cols:", [c[1] for c in cols])
print("rows:", con.execute("SELECT COUNT(*) FROM teacher_likes").fetchone())
con.close()

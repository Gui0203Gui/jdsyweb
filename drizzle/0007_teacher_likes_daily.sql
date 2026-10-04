-- 老师榜每日点赞：teacher_likes 增加点赞日期与取消标记
-- 每位老师每天最多被同一用户点赞 1 次（取消后当天不能再点）

ALTER TABLE teacher_likes ADD COLUMN day TEXT NOT NULL DEFAULT '';
ALTER TABLE teacher_likes ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0;

-- 历史数据回填：按创建时间（北京时间 UTC+8）推算点赞日期
UPDATE teacher_likes SET day = date((created_at / 1000) + 28800, 'unixepoch') WHERE day = '';

-- 旧唯一约束（每人每师一次）会阻止同一用户多天点赞，替换为按天唯一
DROP INDEX IF EXISTS teacher_likes_user_teacher_idx;
CREATE UNIQUE INDEX teacher_likes_user_teacher_day_idx ON teacher_likes(user_id, teacher_id, day);

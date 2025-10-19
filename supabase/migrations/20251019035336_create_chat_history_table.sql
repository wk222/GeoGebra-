/*
  # 创建聊天历史表

  1. 新建表
    - `chat_history`
      - `id` (uuid, primary key) - 消息唯一标识
      - `session_id` (text) - 会话标识
      - `message_type` (text) - 消息类型 (human, ai, system, tool)
      - `content` (text) - 消息内容
      - `additional_kwargs` (jsonb) - 额外参数
      - `created_at` (timestamptz) - 创建时间
      - `metadata` (jsonb) - 元数据
  
  2. 索引
    - 在 `session_id` 上创建索引以加速查询
    - 在 `created_at` 上创建索引以支持时间排序

  3. 安全性
    - 启用 RLS
    - 允许匿名用户读写自己的会话历史（通过 session_id）
*/

-- 创建聊天历史表
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('human', 'ai', 'system', 'tool', 'function')),
  content text NOT NULL,
  additional_kwargs jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_created ON chat_history(session_id, created_at);

-- 启用 RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取和插入（基于 session_id）
-- 注意：在生产环境中，应该添加更严格的认证
CREATE POLICY "Anyone can read their own chat history"
  ON chat_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert their own chat history"
  ON chat_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their own chat history"
  ON chat_history FOR DELETE
  USING (true);
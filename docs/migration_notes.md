# 数据迁移说明（migration notes）

## 当前目标版本
- `schema_version = "0.4"`

## 版本迁移链路
- `0.1 -> 0.2`
- `0.2 -> 0.3`
- `0.3 -> 0.4`

迁移入口：后端读取项目 JSON 时执行 `migrate_project(project: dict) -> dict`。

## 各阶段迁移规则

### 0.1 -> 0.2
- 兼容早期 `layers.positioning.content` / `layers.background.content`
- 保证存在：`characters`、`plot_threads`、`chapters`
- 写入 `schema_version = "0.2"`

### 0.2 -> 0.3
- 人物补默认字段：`goal/current_state/relationship/notes`
- 情节线补默认字段：`status/related_characters/notes`
- 章节补默认字段：`status/characters/plotlines/notes`
- 写入 `schema_version = "0.3"`

### 0.3 -> 0.4
- 同步兼容别名：`plot_threads <-> plotlines`
- 同步反馈兼容：`feedbacks -> feedback_notes`
- 保证 `update_notes` 存在
- 写入 `schema_version = "0.4"`

## 本轮修复记录（关键）

### 1) 保存 500：`feedback_notes` 类型不匹配
- 现象：`PUT /api/projects/{id}` 返回 500
- 根因：后端把 `FeedbackRecord[]` 直接赋给 `feedback_notes`（模型要求 `dict[]`）
- 修复：保存时将 `payload.feedbacks` 映射为 `item.model_dump()` 后再赋值

### 2) 备份阶段可能阻断主保存
- 现象：备份写入异常时，主保存流程被中断
- 修复：备份改为“尽力而为”，备份失败不阻断主保存流程

## 当前已知兼容策略
- 保存时会保留兼容字段：`plotlines`、`feedback_notes`、`update_notes`
- 不主动删除未知字段（迁移阶段尽量容忍历史结构）

## 当前已知风险（待后续版本处理）
1. 双字段漂移风险：`plot_threads/plotlines`、`feedbacks/feedback_notes`
2. 非原子写入风险：写入中断可能导致 JSON 损坏
3. 深层异常类型风险：个别历史脏数据仍可能触发校验失败

## 建议的下轮治理方向
1. 明确单一“主字段”并制定兼容字段退场计划
2. 引入原子写入（temp file + replace）
3. 增加“损坏 JSON 恢复”流程（自动回退最近备份）

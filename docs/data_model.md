# 数据模型（当前版本：schema_version = "0.4"）

## 1. 顶层结构（标准 + 兼容）
```json
{
  "schema_version": "0.4",
  "id": "project_xxx",
  "title": "小说标题",
  "description": "小说简介",
  "created_at": "2026-05-12T00:00:00+08:00",
  "updated_at": "2026-05-12T00:00:00+08:00",

  "positioning": "",
  "background": "",

  "characters": [],
  "plot_threads": [],
  "chapters": [],
  "feedbacks": [],

  "feedback": "",

  "plotlines": [],
  "update_notes": [],
  "feedback_notes": []
}
```

## 2. 字段分层说明

### 2.1 当前标准字段（前后端主读写）
- `schema_version: string`
- `id: string`
- `title: string`
- `description: string`
- `created_at: string`
- `updated_at: string`
- `positioning: string`
- `background: string`
- `characters: Character[]`
- `plot_threads: PlotThread[]`
- `chapters: Chapter[]`
- `feedbacks: FeedbackRecord[]`
- `feedback: string`（旧版文本反馈兼容保留）

### 2.2 兼容字段（迁移/历史保留）
- `plotlines: PlotThread[]`（`plot_threads` 的兼容镜像）
- `feedback_notes: object[]`（`feedbacks` 的兼容镜像）
- `update_notes: object[]`（历史“更新层”兼容容器）

> 注意：当前实现会在保存时保留兼容字段，不会自动清理旧字段。

## 3. 结构化对象定义

### 3.1 Character
```json
{
  "id": "char_1",
  "name": "",
  "role": "",
  "description": "",
  "motivation": "",
  "goal": "",
  "current_state": "",
  "relationship": "",
  "notes": ""
}
```

### 3.2 PlotThread
```json
{
  "id": "plot_1",
  "type": "",
  "title": "",
  "description": "",
  "status": "active",
  "related_characters": ["char_1"],
  "notes": ""
}
```

### 3.3 Chapter
```json
{
  "id": "chapter_1",
  "title": "",
  "summary": "",
  "chapter_goal": "",
  "previous_connection": "",
  "plot_progress": "",
  "character_change": "",
  "ending_hook": "",
  "next_setup": "",
  "unresolved_questions": [""],
  "status": "draft",
  "characters": ["char_1"],
  "plotlines": ["plot_1"],
  "notes": ""
}
```

### 3.4 FeedbackRecord
```json
{
  "id": "feedback_1",
  "source": "自我复盘",
  "scope": "单章",
  "target": "",
  "problem": "",
  "evidence": "",
  "decision": "",
  "affects": ["人物层"],
  "status": "待处理"
}
```

## 4. 默认值约定
- 所有文本字段默认 `""`
- 列表字段默认 `[]`
- `schema_version` 默认 `"0.4"`

## 5. 迁移与兼容约定
- 无 `schema_version` 视为 `0.1`
- 读取时自动迁移到可被 `0.4` 前端/后端处理的结构
- 保存时固定写入 `schema_version = "0.4"`
- 保存时保留 `plotlines`、`feedback_notes`、`update_notes` 以兼容旧数据

## 6. 风险提示（当前）
- `plot_threads` 与 `plotlines` 双字段并存，存在漂移风险
- `feedbacks` 与 `feedback_notes` 双字段并存，存在类型一致性风险
- JSON 当前为直接覆盖写入（非原子写入）

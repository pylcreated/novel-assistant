# 数据模型（当前版本：schema_version = "0.4"）

## 1. 顶层项目结构
```json
{
  "schema_version": "0.4",
  "id": "project_xxx",
  "title": "小说标题",
  "description": "简介",
  "created_at": "2026-05-13T00:00:00+08:00",
  "updated_at": "2026-05-13T00:00:00+08:00",

  "chapters": [],
  "notes": [],

  "positioning": "",
  "background": "",
  "characters": [],
  "plot_threads": [],
  "feedbacks": [],
  "feedback": "",
  "plotlines": [],
  "update_notes": [],
  "feedback_notes": []
}
```

说明：
- `chapters` 与 `notes` 是当前主读写核心。
- 其余字段为历史兼容保留，不作为主界面核心。

## 2. Chapter（正文章节）
```json
{
  "id": "chapter_xxx",
  "project_id": "project_xxx",
  "title": "第一章 起风",
  "content": "章节正文全文...",
  "order": 0,
  "created_at": "2026-05-13T00:00:00+08:00",
  "updated_at": "2026-05-13T00:00:00+08:00"
}
```

兼容说明：
- 历史字段如 `summary/chapter_goal/status/notes` 仍可存在，不会被强制删除。
- 若 `content` 为空，迁移层会尝试从历史 `notes` 或 `summary` 填充。

## 3. Note（创作档案）
```json
{
  "id": "note_xxx",
  "project_id": "project_xxx",
  "type": "character",
  "title": "赵郎中",
  "content": "自由文本档案内容...",
  "order": 0,
  "created_at": "2026-05-13T00:00:00+08:00",
  "updated_at": "2026-05-13T00:00:00+08:00"
}
```

`type` 可选值：
- `character`
- `foreshadow`
- `plotline`
- `other`

## 4. 默认值
- 字符串字段默认 `""`
- 列表字段默认 `[]`
- `order` 默认按新增顺序递增
- `schema_version` 默认 `"0.4"`

## 5. 旧数据兼容
- 无 `schema_version` 的旧项目按 `0.1` 迁移链处理。
- 如果旧项目无 `notes`：
  - `characters[]` 会自动映射为 `type=character` 的 `notes`
  - `plot_threads[]` 会自动映射为 `type=plotline` 的 `notes`
- 旧字段不删除，避免历史数据丢失。

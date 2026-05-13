# 系统架构说明（当前：v0.4 极简写作模式）

## 1. 架构目标
系统从“七层强结构管理”调整为“正文创作 + 文本档案”双核心：
- 正文创作区：专注章节正文写作与切换
- 档案管理区：专注人物/伏笔/情节线/其他自由文本记录

不引入数据库，继续本地 JSON 存储。

## 2. 技术结构
- 前端：原生 HTML/CSS/JavaScript
- 后端：FastAPI
- 存储：`data/projects/{project_id}.json`
- 兼容迁移：`backend/migrations.py`

## 3. 目录职责
- `frontend/index.html`：项目创建与列表入口
- `frontend/project.html`：项目工作台（章节正文 / 创作档案）
- `frontend/static/index.js`：首页逻辑
- `frontend/static/app.js`：项目页核心逻辑（章节与档案）
- `backend/main.py`：项目/章节/档案 API
- `backend/models.py`：Pydantic 模型
- `backend/storage.py`：本地读写与备份
- `backend/migrations.py`：旧数据迁移与缺省补全

## 4. 数据流
1. 前端进入项目页后：
   - `GET /api/projects/{id}`（项目元信息）
   - `GET /api/projects/{id}/chapters`
   - `GET /api/projects/{id}/notes`
2. 用户编辑章节：
   - `PUT /api/projects/{id}/chapters/{chapter_id}`
3. 用户编辑档案：
   - `PUT /api/projects/{id}/notes/{note_id}`
4. 保存前后端行为：
   - 后端写入前备份旧 JSON 到 `data/backups/YYYY-MM-DD/`
   - 后端保持 `schema_version = "0.4"` 与兼容字段

## 5. 当前 API
### 项目
- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PUT /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`
- `POST /api/projects/{project_id}/delete`（兼容）
- `POST /api/projects/{project_id}/remove`（兼容）

### 章节
- `GET /api/projects/{project_id}/chapters`
- `POST /api/projects/{project_id}/chapters`
- `PUT /api/projects/{project_id}/chapters/{chapter_id}`
- `DELETE /api/projects/{project_id}/chapters/{chapter_id}`

### 档案
- `GET /api/projects/{project_id}/notes`
- `GET /api/projects/{project_id}/notes?type=character|foreshadow|plotline|other`
- `POST /api/projects/{project_id}/notes`
- `PUT /api/projects/{project_id}/notes/{note_id}`
- `DELETE /api/projects/{project_id}/notes/{note_id}`

## 6. 兼容策略
- 不删除旧字段（characters/plot_threads/feedbacks 等仍保留）
- 新增核心结构：`chapters.content`、`notes[]`
- 迁移层会对缺字段自动补默认值，避免旧项目打开崩溃

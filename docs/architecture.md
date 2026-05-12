# 系统架构说明

## 总体结构
Novel Assistant 采用本地前后端分离架构：
- 前端（HTML/CSS/JavaScript）：页面展示、编辑交互、调用 API
- 后端（FastAPI）：项目读写接口、数据校验
- 存储（Local JSON）：本地文件持久化

## 目录职责
- `frontend/index.html`：项目入口页（创建/列表）
- `frontend/project.html`：项目工作台页
- `frontend/static/index.js`：首页创建/列表/删除逻辑
- `frontend/static/project-nav.js`：项目页左侧导航切换兜底
- `frontend/static/app.js`：项目页数据渲染、编辑与保存逻辑
- `frontend/static/style.css`：前端样式
- `backend/main.py`：API 路由入口
- `backend/models.py`：Pydantic 数据模型
- `backend/storage.py`：文件存储、备份、读取归一化
- `backend/migrations.py`：项目数据迁移

## 数据流
1. 前端请求项目数据：`GET /api/projects/{id}`
2. 后端读取 JSON 并执行 `migrate_project`
3. 迁移后数据归一化并返回前端
4. 前端编辑后 `PUT /api/projects/{id}`
5. 后端保存前备份旧文件，再写入新 JSON

## 兼容机制
- `schema_version` 标记项目版本
- 旧项目无版本时按 `0.1` 处理并自动迁移到 `0.4`
- 保留兼容字段（如 `plot_threads/plotlines`, `feedbacks/feedback_notes`）
- 前端 `normalizeProject` + 兼容兜底，避免缺字段报错

## 存储策略
- 项目数据：`data/projects/{project_id}.json`
- 备份数据：`data/backups/YYYY-MM-DD/*.json`

## API（当前）
- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PUT /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`
- `POST /api/projects/{project_id}/delete`（兼容删除）
- `POST /api/projects/{project_id}/remove`（兼容删除）

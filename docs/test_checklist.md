# Test Checklist

## 1. 基础流程
- 创建项目成功
- 项目列表可见
- 进入项目详情页成功
- 保存后刷新数据仍在

## 2. 兼容性
- 打开无 `schema_version` 的旧项目不报错
- `GET /api/projects/{id}` 返回 `schema_version`
- 缺失字段自动补默认值

## 3. 结构化编辑
- 人物新增/编辑/删除可保存
- 情节线新增/编辑/删除可保存
- 章节新增/编辑/删除可保存

## 4. 存储与备份
- 保存项目后 `data/projects/{id}.json` 更新
- 保存前生成备份：`data/backups/YYYY-MM-DD/`
- 删除项目前生成备份

## 5. API 连通
- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PUT /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`

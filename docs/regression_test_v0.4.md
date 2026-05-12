# Novel Assistant v0.4 全链路回归测试清单

> 目标：验证 `schema_version = "0.4"` 下前端、后端、存储三层稳定性与兼容性。  
> 范围：只测试现有能力，不新增功能。

## 0. 测试准备
- 后端目录：`D:\MyProjects\novel-assistant\backend`
- 前端入口：`D:\MyProjects\novel-assistant\frontend\index.html`
- 项目数据目录：`D:\MyProjects\novel-assistant\data\projects`
- 备份目录：`D:\MyProjects\novel-assistant\data\backups`

启动后端：
```bash
cd D:\MyProjects\novel-assistant\backend
py -3 -m uvicorn main:app --reload --port 8000
```

---

## 1. 后端启动与健康检查
1. 启动 uvicorn，确认控制台无阻断异常。
2. 访问 `http://127.0.0.1:8000/api/health`，预期 `200` + `{"status":"ok"}`。

---

## 2. 首页测试
1. 打开 `frontend/index.html`，页面正常渲染。
2. 项目列表正常加载。
3. 空列表时有明确提示。
4. 创建按钮可用。
5. 关闭后端再创建，出现明确错误提示。

---

## 3. 新建项目流程
1. 创建一个新项目。
2. 项目出现在列表中。
3. 点击进入详情页成功。
4. `data/projects/` 生成 `{project_id}.json`。
5. 新 JSON 含 `schema_version = "0.4"`。

---

## 4. 项目详情页基础功能
1. 标题正常显示。
2. 左侧导航可切换模块。
3. 保存按钮可触发请求。
4. 返回首页可用。

---

## 5. 内容编辑与保存（核心 CRUD）
1. 修改并保存创作定位。
2. 修改并保存世界设定。
3. 人物：新增、编辑、删除后保存。
4. 情节线：新增、编辑、删除后保存。
5. 章节：新增、编辑、删除后保存。
6. 反馈：新增、编辑、删除后保存。
7. 刷新页面后数据保持一致。
8. 重启后端后再次打开，数据仍保留。

---

## 6. 删除与备份
1. 首页删除项目。
2. 列表同步移除。
3. `data/projects/` 原文件删除。
4. `data/backups/YYYY-MM-DD/` 生成备份。
5. 删除接口验证：
   - `DELETE /api/projects/{id}`
   - `POST /api/projects/{id}/delete`
   - `POST /api/projects/{id}/remove`

---

## 7. 旧数据兼容与迁移
1. 准备一个无 `schema_version` 的旧 JSON。
2. 系统可正常读取。
3. 读取后结构可被当前前端渲染。
4. 保存后 `schema_version` 归一为 `0.4`。
5. `plot_threads/plotlines` 与 `feedbacks/feedback_notes` 兼容可用。

---

## 8. 错误场景
1. 打开不存在的项目 ID。
2. 删除不存在的项目 ID。
3. 提交非法数据（如空 title）应返回 4xx。
4. 关闭后端后点击保存，前端有明确提示。
5. 人为破坏 JSON 文件，后端日志可定位异常。

---

## 9. 本轮新增重点回归项（必须）
1. **Feedback 类型一致性**
   - 在“读者回声”新增反馈并保存。
   - 预期：`PUT /api/projects/{id}` 不再出现 `feedback_notes` 类型错误 500。
2. **备份不阻断主保存**
   - 人为制造备份目录异常（只读或权限限制）后尝试保存。
   - 预期：即使备份失败，主保存仍可成功。
3. **连续保存冲突**
   - 快速连续点击保存多次。
   - 预期：不出现同名备份冲突导致的 500。

---

## 10. 结果记录模板

| 测试项 | 操作步骤 | 预期结果 | 实际结果 | 是否通过 | 备注 |
|---|---|---|---|---|---|
| 示例：创建项目 | 输入标题后点击创建 | 跳转详情页并生成 JSON |  |  |  |

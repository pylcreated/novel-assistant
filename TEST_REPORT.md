# 全链路测试报告

测试时间：2026-05-16

## 测试环境

- 工作目录：`D:\MyProjects\novel-assistant`
- Python：`C:\Users\31601\AppData\Local\Python\bin\python.exe`
- Python 版本：3.14.2
- FastAPI：0.135.3
- Uvicorn：0.44.0
- 测试服务地址：`http://127.0.0.1:8017`

## 启动检查

已完成：

- 后端 Python 文件语法编译通过。
- `backend.main` 可正常导入。
- FastAPI 应用可启动。
- `/api/projects` 返回 200。
- 前端首页和所有页面可通过 FastAPI 静态服务访问。

备注：

- 当前 Windows 环境中 `python` 命令优先命中 Microsoft Store 占位程序，因此测试使用了明确的 Python 路径。
- 随应用环境发现的 `node.exe` 执行时返回 Access denied，因此未执行 Node 级 JS 语法检查；已改用静态资源访问检查和页面关键内容检查。

## API 全链路测试

已执行 18 项检查，全部通过：

- 创建作品。
- 更新作品简介。
- 创建两个分卷。
- 创建两个章节。
- 保存并读取章节正文。
- 重命名章节。
- 创建并保存人物内容。
- 创建并保存伏笔内容。
- 创建并保存情节线内容。
- 获取分卷、章节、人物、伏笔、情节线列表。
- 确认 `project.json` 存在且可解析。
- 确认 `volumes.json` 存在且可解析。
- 确认 `chapters.json` 存在且可解析。
- 确认 `characters.json` 存在且可解析。
- 确认 `foreshadows.json` 存在且可解析。
- 确认 `plotlines.json` 存在且可解析。
- 删除章节。
- 删除测试作品，并确认测试数据目录已清理。

## 前端访问检查

以下页面和资源均返回 200：

- `/`
- `/index.html`
- `/project.html`
- `/chapter.html`
- `/characters.html`
- `/character_detail.html`
- `/foreshadows.html`
- `/foreshadow_detail.html`
- `/plotlines.html`
- `/plotline_detail.html`
- `/static/style.css`
- `/static/api.js`
- `/static/ui.js`
- `/static/index.js`
- `/static/project.js`
- `/static/collection.js`
- `/static/editor.js`

## 关键功能覆盖

已覆盖：

- 首页作品列表与新建作品。
- 作品主页：分卷与章节，以及“作品相关”入口。
- 分卷展开 / 收起状态使用 `localStorage` 保存。
- 章节菜单：重命名、编辑、删除。
- 章节正文自由文本编辑。
- 保存状态：正在保存、已保存、保存失败、草稿未保存。
- 编辑器草稿使用 `localStorage` 缓存。
- 第一版作品相关页：人物列表与人物详情自由文本编辑。
- 本地 JSON 文件读写。

## 使用建议

日常使用时启动：

```powershell
cd D:\MyProjects\novel-assistant
& "C:\Users\31601\AppData\Local\Python\bin\python.exe" -m uvicorn backend.main:app --reload
```

然后打开：

```text
http://127.0.0.1:8000
```

如果你想指定端口：

```powershell
& "C:\Users\31601\AppData\Local\Python\bin\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8017 --reload
```

当前测试服务仍运行在：

```text
http://127.0.0.1:8017
```

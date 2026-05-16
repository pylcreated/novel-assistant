# 极简小说创作工作台

这是一个本地运行的小说创作工作台。它不做 AI 生成，不做自动分析，也不预设复杂模板，只负责管理、存储、跳转、展开和收纳。

## 技术栈

- 前端：原生 HTML + CSS + JavaScript
- 后端：Python + FastAPI
- 存储：本地 JSON 文件
- 数据库：无

## 启动方式

建议先进入项目目录：

```powershell
cd D:\MyProjects\novel-assistant
```

安装依赖：

```powershell
pip install -r requirements.txt
```

如果你的 Windows 上 `python` 被 Microsoft Store 占位程序拦截，可以使用本机已检测到的解释器路径：

```powershell
& "C:\Users\31601\AppData\Local\Python\bin\python.exe" -m pip install -r requirements.txt
```

启动服务：

```powershell
uvicorn backend.main:app --reload
```

或者：

```powershell
& "C:\Users\31601\AppData\Local\Python\bin\python.exe" -m uvicorn backend.main:app --reload
```

打开浏览器访问：

```text
http://127.0.0.1:8000
```

## 使用方式

1. 首页点击“新建作品”，填写作品名和简介。
2. 点击作品卡片进入作品主页。
3. 在“章节列表”中点击右上角“+”，先新建分卷，再新建章节。
4. 点击章节进入正文页，在大文本区自由写作。
5. 正文会显示“草稿未保存 / 正在保存 / 已保存 / 保存失败”等状态，并使用 `localStorage` 保留本地草稿。
6. 在作品主页点击“作品相关”，进入人物管理。
7. 人物详情只有人物名和自由文本内容，不预设字段。

## 数据目录

数据保存在：

```text
data/projects/{project_id}/
```

每个作品包含：

```text
project.json
volumes.json
chapters.json
characters.json
foreshadows.json
plotlines.json
```

## API 模块

主要接口前缀：

- `/api/projects`
- `/api/projects/{project_id}/volumes`
- `/api/projects/{project_id}/chapters`
- `/api/projects/{project_id}/characters`
- `/api/projects/{project_id}/foreshadows`
- `/api/projects/{project_id}/plotlines`

服务启动后也可以访问 FastAPI 文档：

```text
http://127.0.0.1:8000/docs
```

## 项目结构

```text
backend/
  main.py
  storage.py
  routers/
frontend/
  index.html
  project.html
  chapter.html
  related.html
  characters.html
  character_detail.html
  foreshadows.html
  foreshadow_detail.html
  plotlines.html
  plotline_detail.html
  static/
data/
  projects/
```

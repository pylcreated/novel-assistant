# Novel Assistant

一个面向长篇小说创作的本地辅助系统。  
它不负责“一键生成正文”，而是帮助作者把创作过程结构化、可维护、可迭代。

## 项目定位
Novel Assistant 以“创作管理”而非“自动写作”为核心，围绕小说项目提供结构化编辑与长期维护能力。

## 核心功能
- 创建、读取、更新、删除小说项目
- 7层创作信息管理（定位、背景、人物、情节、章节、更新、反馈）
- 人物 / 情节线 / 章节的结构化列表编辑（新增、编辑、删除）
- 反馈记录结构化管理
- `schema_version` 版本管理与读取时迁移
- 保存前备份（本地 JSON）

## 技术栈
- 后端：Python + FastAPI
- 前端：原生 HTML / CSS / JavaScript
- 存储：本地 JSON（无数据库）

## 本地运行方式
### 1) 启动后端
```bash
cd D:\MyProjects\novel-assistant\backend
py -3 -m pip install -r requirements.txt
py -3 -m uvicorn main:app --reload --port 8000
```

### 2) 打开前端
直接打开：
- `D:\MyProjects\novel-assistant\frontend\index.html`

### 3) 健康检查
- [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

## 项目结构
```text
novel-assistant/
├─ backend/                 # FastAPI 接口、模型、迁移、存储
├─ frontend/                # 原生前端页面与脚本
├─ data/
│  ├─ projects/             # 本地项目数据（git忽略，仅保留 .gitkeep）
│  └─ backups/              # 本地备份数据（git忽略，仅保留 .gitkeep）
├─ docs/                    # 产品、架构、数据模型、测试与迭代文档
├─ prompts/                 # 历史任务提示词
├─ .gitignore
└─ README.md
```

## 项目截图（占位）
> 可在发布前替换为真实截图并更新路径。

- 首页（项目列表）  
  `docs/screenshots/index-placeholder.png`
- 工作台（项目详情）  
  `docs/screenshots/project-placeholder.png`
- 结构化编辑（人物/情节/章节）  
  `docs/screenshots/editor-placeholder.png`

## 文档入口
- 文档索引：[docs/README_DOCS.md](docs/README_DOCS.md)
- 产品说明：[docs/product.md](docs/product.md)
- 架构说明：[docs/architecture.md](docs/architecture.md)
- 数据模型：[docs/data_model.md](docs/data_model.md)
- 迁移说明：[docs/migration_notes.md](docs/migration_notes.md)
- 回归测试：[docs/regression_test_v0.4.md](docs/regression_test_v0.4.md)
- 更新记录：[docs/changelog.md](docs/changelog.md)
- 路线图：[docs/roadmap.md](docs/roadmap.md)

## 后续计划
见：[docs/roadmap.md](docs/roadmap.md)

## 说明
- 本仓库默认不提交真实项目数据与本地备份。
- `data/projects/` 与 `data/backups/` 仅保留目录结构（`.gitkeep`）。

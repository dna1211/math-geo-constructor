# 3D 几何构造工具

基于命令输入 + 鼠标交互的 3D 几何图形构造工具。

## 技术栈

- **渲染引擎**：Three.js
- **UI 框架**：纯 HTML/CSS/JS
- **构建工具**：Vite
- **数据库**：better-sqlite3（开发环境）

## 项目结构

```
├── src/                       # 源码
│   ├── main.js                # 入口
│   ├── parser/                # 命令解析器
│   │   ├── tokenizer.js       #   词法分析
│   │   ├── parser.js          #   语法解析
│   │   └── executor.js        #   命令执行
│   ├── geometry/              # 几何数据层
│   │   ├── store.js           #   对象仓库 + 依赖图
│   │   ├── types.js           #   类型定义
│   │   ├── calc.js            #   几何计算
│   │   └── constraints.js     #   约束系统
│   ├── interaction/           # 交互控制层
│   │   ├── toolManager.js     #   工具状态机
│   │   ├── picker.js          #   3D 拾取
│   │   ├── dragger.js         #   拖拽控制
│   │   └── selector.js        #   选中管理
│   ├── render/                # 渲染层
│   │   ├── scene.js           #   场景初始化
│   │   ├── geomRenderer.js    #   几何渲染
│   │   ├── labelRenderer.js   #   标签渲染
│   │   ├── axesRenderer.js    #   坐标轴
│   │   └── gridRenderer.js    #   网格
│   ├── api/
│   │   └── client.js          # SQLite API 客户端
│   └── storage.js             # LocalStorage 自动保存
│
├── server/                    # 后端（Vite 插件）
│   ├── vite-plugin-api.js     # API 中间件
│   └── db.js                  # SQLite 操作
│
├── data/                      # 数据库文件
│   └── geometry.db
│
├── docs/                      # 文档
│
├── index.html                 # 入口页面
├── style.css                  # 样式
├── vite.config.js             # Vite 配置
├── package.json
└── .gitignore
```

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 保存方式

- **自动保存**：LocalStorage（每次命令后自动）
- **手动导出**：JSON 文件下载
- **数据库**：SQLite（开发环境，通过 Vite 插件）

# 3D 几何构造工具

基于命令输入 + 鼠标交互的 3D 几何图形构造工具。

## 技术栈

- **渲染引擎**：Three.js
- **UI 框架**：纯 HTML/CSS/JS
- **构建工具**：Vite

## 项目结构

```
├── src/                       # 源码
│   ├── main.js                # 入口，初始化模块，组装 UI
│   ├── storage.js             # LocalStorage 自动保存 + 文件导入导出
│   ├── ui/                    # UI 模块
│   │   ├── stepPanel.js       #   步骤面板
│   │   ├── propPanel.js       #   属性面板
│   │   ├── toolbar.js         #   工具栏
│   │   ├── commandPanel.js    #   命令面板
│   │   ├── shortcuts.js       #   快捷键
│   │   └── utils.js           #   UI 工具函数
│   ├── styles/                # 样式文件
│   │   ├── variables.css      #   主题变量
│   │   ├── base.css           #   重置 + 基础
│   │   ├── layout.css         #   整体布局
│   │   ├── toolbar.css        #   工具栏
│   │   ├── properties.css     #   属性面板
│   │   ├── command.css        #   命令面板
│   │   ├── step.css           #   步骤面板
│   │   └── modal.css          #   弹窗
│   ├── utils/
│   │   ├── eventBus.js        #   事件总线（带事件常量）
│   │   ├── stepManager.js     #   步骤管理器
│   │   └── themeManager.js    #   主题管理器
│   ├── parser/                # 命令解析器
│   │   ├── tokenizer.js       #   词法分析
│   │   ├── parser.js          #   语法解析（递归下降）
│   │   └── executor.js        #   命令执行
│   ├── geometry/              # 几何数据层
│   │   ├── store.js           #   对象仓库 + 依赖图
│   │   ├── types.js           #   类型定义
│   │   ├── calc.js            #   几何计算（中点、旋转、反射等）
│   │   ├── construct.js       #   复杂构造算法（正多边形等）
│   │   └── history.js         #   撤销/重做管理
│   ├── interaction/           # 交互控制层
│   │   ├── toolManager.js     #   工具状态机
│   │   ├── picker.js          #   3D 拾取（射线检测）
│   │   ├── dragger.js         #   拖拽控制
│   │   └── selector.js        #   选中管理 + 高亮
│   └── render/                # 渲染层
│       ├── scene.js           #   场景、相机、灯光、坐标轴、网格
│       ├── geomRenderer.js    #   几何对象 → Three.js Mesh
│       └── labelRenderer.js   #   CSS2D 标签渲染
│
├── docs/                      # 文档
├── index.html                 # 入口页面
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

## git 仓库

```bash
export http_proxy="http://127.0.0.1:7890" https_proxy="http://127.0.0.1:7890"
git push origin main
git pull origin main
git clone https://github.com/yourusername/math-geo-constructor.git
```

## 支持的命令

| 类别 | 命令 | 示例 |
|------|------|------|
| 构造 | Point, Segment, Line, Ray, Triangle, Polygon, Plane | `A = Point(0, 0, 0)` |
| 计算 | Midpoint, Fold, Reflect, Distance | `M = Midpoint(A, B)` |
| 高级 | RegularPolygon, EquilateralTriangle | `RP = RegularPolygon(S, 6, P, 30)` |
| 样式 | Color, Dash, LineWidth, Opacity, Hide, Show, Label | `Color(A, "#ff0000")` |
| 操作 | Delete, Undo, Redo, Clear, Grid, Axis | `Undo` |
| 步骤 | `---step 名称---` | `---step 底面---` |

## 保存方式

- **自动保存**：LocalStorage（每次命令后 2 秒节流）
- **手动导出**：JSON 文件下载（Ctrl+S）
- **导入**：JSON 文件加载（Ctrl+O）
- **导出图片**：PNG 截图（Ctrl+P）

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `V` | 选择工具 |
| `P` | 画点工具 |
| `L` | 画线工具 |
| `T` | 画面工具 |
| `H` | 拖拽工具 |
| `Space` | 切换投影方式 |
| `F1` | 帮助 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+S` | 保存文件 |
| `Ctrl+O` | 加载文件 |
| `Ctrl+P` | 导出 PNG |
| `Delete` | 删除选中对象 |
| `Tab` | 自动补全 |
| `↑/↓` | 翻阅命令历史 |

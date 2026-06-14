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

### 命令分层

命令分为**底层原语**（可自由组合）和**上层快捷方式**（常见模式封装）：

**构造线 → 求交点** 是基本模式：
```
L = Parallel(A, Segment(B,C))          # 底层：过A作BC平行线（返回线）
L = Perpendicular(A, Segment(B,C))     # 底层：过A作BC垂线（返回线）
D = Intersect(L1, L2)                  # 底层：求两线交点（返回点）
D = Foot(A, Segment(B,C))             # 快捷：= Intersect(Perpendicular(...), Segment(B,C))
```

### 构造类

| 命令 | 说明 | 示例 |
|------|------|------|
| `Point` / `(x,y,z)` | 创建点 | `A = Point(0, 0, 0)` 或 `A = (1, 2, 3)` |
| `Segment` | 线段（两点之间） | `segAB = Segment(A, B)` |
| `Line` | 无限直线 | `line1 = Line(A, B)` |
| `Ray` | 射线（从 A 过 B 延伸） | `ray1 = Ray(A, B)` |
| `Triangle` | 三角形面 | `triABC = Triangle(A, B, C)` |
| `Polygon` | 多边形面（≥3 点） | `poly1 = Polygon(A, B, C, D)` |
| `Plane` | 平面 | `Plane(A, B, C)` 或 `Plane(0, 0, 1, 0)` |

### 计算与变换类

| 命令 | 说明 | 示例 |
|------|------|------|
| `Midpoint` | 中点 | `M = Midpoint(A, B)` |
| `Fold` | 绕轴旋转（角度制） | `P' = Fold(P, Line(A,B), 90)` |
| `Reflect` | 对称/镜像 | `R = Reflect(P, Line(A,B))` 或 `Reflect(P, Plane(...))` |
| `Distance` | 两点距离 | `D = Distance(A, B)` |
| `Foot` | 点到线的垂足 | `F = Foot(P, Segment(A,B))` 或 `Foot(P, Line(A,B))` |
| `Parallel` | 过点作平行线 | `L = Parallel(A, Segment(B,C))` 或 `Parallel(A, Line(B,C))` |
| `Perpendicular` | 过点作垂线 | `L = Perpendicular(A, Segment(B,C))` 或 `Perpendicular(A, Line(B,C))` |
| `Intersect` | 两线交点 | `D = Intersect(L1, L2)` 或 `Intersect(L, Segment(A,B))` |

### 高级构造类

| 命令 | 说明 | 示例 |
|------|------|------|
| `RegularPolygon` | 正 n 边形 | `RP = RegularPolygon(Segment(A,B), 6, Plane(...), 0)` |
| `EquilateralTriangle` | 正三角形 | `ET = EquilateralTriangle(Segment(A,B), Plane(...), 0)` |

### 样式类

| 命令 | 说明 | 示例 |
|------|------|------|
| `Color` | 设置颜色 | `Color(A, "#ff0000")` |
| `Dash` | 虚线 | `Dash(segAB, true)` |
| `LineWidth` | 线宽 | `LineWidth(segAB, 3)` |
| `Opacity` | 透明度（0-1） | `Opacity(triABC, 0.5)` |
| `Hide` | 隐藏 | `Hide(A)` |
| `Show` | 显示 | `Show(A)` |
| `Label` | 自定义标签 | `Label(A, "顶点A")` |

### 操作类

| 命令 | 说明 | 示例 |
|------|------|------|
| `Delete` | 删除对象 | `Delete(A)` |
| `Undo` | 撤销 | `Undo` |
| `Redo` | 重做 | `Redo` |
| `Clear` | 清空全部 | `Clear` |
| `Grid` | 网格开关 | `Grid(true)` |
| `Axis` | 坐标轴开关 | `Axis(false)` |

### 步骤控制

| 语法 | 说明 | 示例 |
|------|------|------|
| `---step 名称---` | 标记新步骤的开始 | `---step 底面---` |

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

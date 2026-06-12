---
name: generate-geometry
description: 生成常见几何体的命令序列（支持步骤分步展示）
user_invocable: true
---

# 几何体命令生成器

根据用户描述生成 3D 几何构造命令。

## 坐标系约定

- **右手坐标系**：X 向右，Y 向前（屏幕里），Z 向上
- **单位**：无固定单位，默认边长为 1
- **原点**：默认居中于原点 (0, 0, 0)
- 常用近似值：√2 ≈ 1.414，√3 ≈ 1.732，√5 ≈ 2.236

## 命令语法速查

### 构造类

| 命令 | 语法 | 说明 |
|------|------|------|
| Point | `Name = Point(x, y, z)` 或 `Name = (x, y, z)` | 创建点 |
| Segment | `Name = Segment(A, B)` | 线段 |
| Line | `Name = Line(A, B)` | 无限直线 |
| Ray | `Name = Ray(A, B)` | 射线 |
| Triangle | `Name = Triangle(A, B, C)` | 三角形面 |
| Polygon | `Name = Polygon(A, B, C, ...)` | 多边形面（≥3 点） |
| Plane | `Name = Plane(A, B, C)` 或 `Plane(a, b, c, d)` | 平面 |

### 计算类

| 命令 | 语法 | 说明 |
|------|------|------|
| Midpoint | `M = Midpoint(A, B)` | 中点 |
| Fold | `F = Fold(P, Line(A,B), angle)` | 绕轴旋转（角度制） |
| Reflect | `R = Reflect(P, Line(A,B))` | 对称/镜像 |
| Distance | `D = Distance(A, B)` | 两点距离 |

### 高级构造

| 命令 | 语法 | 说明 |
|------|------|------|
| RegularPolygon | `RegularPolygon(Segment(A,B), n, Plane(X,Y,Z), angle)` | 正 n 边形 |
| EquilateralTriangle | `EquilateralTriangle(Segment(A,B), Plane(X,Y,Z), angle)` | 正三角形 |

### 样式类

| 命令 | 语法 | 说明 |
|------|------|------|
| Color | `Color(A, "#ff0000")` | 设置颜色 |
| Dash | `Dash(A, true)` | 虚线 |
| LineWidth | `LineWidth(A, 3)` | 线宽（1-10） |
| Opacity | `Opacity(A, 0.5)` | 透明度（0-1） |
| Hide | `Hide(A)` | 隐藏 |
| Show | `Show(A)` | 显示 |
| Label | `Label(A, "文字")` | 自定义标签 |

### 操作类

| 命令 | 语法 | 说明 |
|------|------|------|
| Delete | `Delete(A)` | 删除对象 |
| Undo | `Undo` | 撤销 |
| Redo | `Redo` | 重做 |
| Clear | `Clear` | 清空全部 |
| Grid | `Grid(true/false)` | 网格开关 |
| Axis | `Axis(true/false)` | 坐标轴开关 |

### 步骤控制

| 语法 | 说明 |
|------|------|
| `---step 步骤名称---` | 标记新步骤的开始（独占一行） |

## 强制规则

### 1. 对象必须命名

所有几何对象创建时必须赋名称，便于后续操作：

```
# ✅ 正确
A = Point(0, 0, 0)
seg1 = Segment(A, B)
tri1 = Triangle(A, B, C)

# ❌ 避免（自动命名不直观）
Segment(A, B)
Triangle(A, B, C)
```

### 2. 辅助线默认虚线

根据线条性质判断样式：

| 线条性质 | 样式 | 判断依据 |
|----------|------|----------|
| 几何体棱边 | 实线（默认） | 构成几何体轮廓的边 |
| 辅助线 | 虚线 | 为解题额外添加的线段 |
| Line（无限直线） | 虚线 | 默认虚线 |
| Ray（射线） | 虚线 | 默认虚线 |

```
# 棱边 — 实线
segAB = Segment(A, B)

# 辅助线 — 虚线
M = Midpoint(A, C)
segBM = Segment(B, M)
Dash(segBM, true)
```

### 3. 证明目标颜色标注

| 目标类型 | 颜色 | 说明 |
|----------|------|------|
| 要证的线 | 红色 `#ff4444` | 如"证明 PC // 平面 BDE"中的 PC |
| 要证的面 | 蓝色半透明 `#4488ff` opacity 0.2 | 如平面 BDE |
| 桥梁线 | 绿色 `#44cc44` | 证明中起连接作用的辅助线 |

```
Color(segPC, "#ff4444")
triBDE = Triangle(B, D, E)
Color(triBDE, "#4488ff")
Opacity(triBDE, 0.2)
Color(segEM, "#44cc44")
```

### 4. 对角线交点表示中心

正方形、矩形等的中心，通过对角线交点获得：

```
segAC = Segment(A, C)
Dash(segAC, true)
segBD = Segment(B, D)
Dash(segBD, true)
M = Midpoint(A, C)  # AC 与 BD 的交点
```

## 步骤分步展示

使用 `---step 名称---` 将命令分割为多个步骤，支持逐步展示构造过程。

**写法示例：**
```
---step 底面四点---
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(1, 1, 0)
D = Point(0, 1, 0)
---step 底面---
Polygon(A, B, C, D)
---step 顶面四点---
E = Point(0, 0, 1)
F = Point(1, 0, 1)
G = Point(1, 1, 1)
H = Point(0, 1, 1)
---step 顶面---
Polygon(E, F, G, H)
---step 侧棱---
segAE = Segment(A, E)
segBF = Segment(B, F)
segCG = Segment(C, G)
segDH = Segment(D, H)
---step 侧面---
Polygon(A, B, F, E)
Polygon(B, C, G, F)
Polygon(C, D, H, G)
Polygon(D, A, E, H)
```

**步骤命名规范：**
- 使用简洁中文名称，概括本步骤内容
- 每步 2-5 条命令为宜
- 辅助线应在独立步骤中创建

---

## 几何体模板

### 正四面体（4 个面）

```
---step 顶点---
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(0.5, 0.866, 0)
D = Point(0.5, 0.289, 0.816)
---step 面---
tri1 = Triangle(A, B, C)
tri2 = Triangle(A, B, D)
tri3 = Triangle(A, C, D)
tri4 = Triangle(B, C, D)
```

### 正方体（6 个面）

```
---step 底面四点---
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(1, 1, 0)
D = Point(0, 1, 0)
---step 顶面四点---
E = Point(0, 0, 1)
F = Point(1, 0, 1)
G = Point(1, 1, 1)
H = Point(0, 1, 1)
---step 底面---
poly1 = Polygon(A, B, C, D)
---step 顶面---
poly2 = Polygon(E, F, G, H)
---step 侧面---
poly3 = Polygon(A, B, F, E)
poly4 = Polygon(B, C, G, F)
poly5 = Polygon(C, D, H, G)
poly6 = Polygon(D, A, E, H)
```

### 正八面体（8 个面）

```
---step 顶点---
A = Point(0, 0, 1)
B = Point(0, 0, -1)
C = Point(1, 0, 0)
D = Point(-1, 0, 0)
E = Point(0, 1, 0)
F = Point(0, -1, 0)
---step 上半部分---
tri1 = Triangle(A, C, E)
tri2 = Triangle(A, E, D)
tri3 = Triangle(A, D, F)
tri4 = Triangle(A, F, C)
---step 下半部分---
tri5 = Triangle(B, C, F)
tri6 = Triangle(B, F, D)
tri7 = Triangle(B, D, E)
tri8 = Triangle(B, E, C)
```

### 正十二面体（12 个面）

```
t = (1 + 1.732) / 2
---step 顶点---
A = Point(0, 1/t, t)
B = Point(0, 1/t, -t)
C = Point(0, -1/t, t)
D = Point(0, -1/t, -t)
E = Point(1/t, t, 0)
F = Point(1/t, -t, 0)
G = Point(-1/t, t, 0)
H = Point(-1/t, -t, 0)
I = Point(t, 0, 1/t)
J = Point(t, 0, -1/t)
K = Point(-t, 0, 1/t)
L = Point(-t, 0, -1/t)
M = Point(1, 1, 1)
N = Point(1, 1, -1)
O = Point(1, -1, 1)
P = Point(1, -1, -1)
Q = Point(-1, 1, 1)
R = Point(-1, 1, -1)
S = Point(-1, -1, 1)
T = Point(-1, -1, -1)
---step 面（部分）---
poly1 = Polygon(M, A, Q, G, E)
poly2 = Polygon(M, E, I, O, C)
poly3 = Polygon(M, C, A, Q, G)
```

### 正二十面体（20 个面）

```
t = (1 + 1.732) / 2
---step 顶点---
A = Point(-1, t, 0)
B = Point(1, t, 0)
C = Point(-1, -t, 0)
D = Point(1, -t, 0)
E = Point(0, -1, t)
F = Point(0, 1, t)
G = Point(0, -1, -t)
H = Point(0, 1, -t)
I = Point(t, 0, -1)
J = Point(t, 0, 1)
K = Point(-t, 0, -1)
L = Point(-t, 0, 1)
---step 上半部分---
tri1 = Triangle(A, F, B)
tri2 = Triangle(A, B, H)
tri3 = Triangle(A, H, K)
tri4 = Triangle(A, K, L)
tri5 = Triangle(A, L, F)
tri6 = Triangle(B, F, J)
tri7 = Triangle(B, J, I)
tri8 = Triangle(B, I, H)
---step 下半部分---
tri9 = Triangle(F, L, E)
tri10 = Triangle(F, E, J)
tri11 = Triangle(L, K, C)
tri12 = Triangle(L, C, E)
tri13 = Triangle(K, H, G)
tri14 = Triangle(K, G, C)
tri15 = Triangle(H, I, D)
tri16 = Triangle(H, D, G)
tri17 = Triangle(I, J, D)
tri18 = Triangle(J, E, D)
tri19 = Triangle(C, G, D)
tri20 = Triangle(G, I, D)
```

### 金字塔（四棱锥）

```
---step 底面四点---
A = Point(-1, -1, 0)
B = Point(1, -1, 0)
C = Point(1, 1, 0)
D = Point(-1, 1, 0)
---step 顶点---
E = Point(0, 0, 2)
---step 底面---
poly1 = Polygon(A, B, C, D)
---step 侧面---
tri1 = Triangle(A, B, E)
tri2 = Triangle(B, C, E)
tri3 = Triangle(C, D, E)
tri4 = Triangle(D, A, E)
```

### 三棱柱

```
---step 底面三点---
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(0.5, 0.866, 0)
---step 顶面三点---
D = Point(0, 0, 2)
E = Point(1, 0, 2)
F = Point(0.5, 0.866, 2)
---step 底面---
tri1 = Triangle(A, B, C)
---step 顶面---
tri2 = Triangle(D, E, F)
---step 侧面---
poly1 = Polygon(A, B, E, D)
poly2 = Polygon(B, C, F, E)
poly3 = Polygon(C, A, D, F)
```

### 五棱柱

```
---step 底面五点---
A = Point(0, 1, 0)
B = Point(0.951, 0.309, 0)
C = Point(0.588, -0.809, 0)
D = Point(-0.588, -0.809, 0)
E = Point(-0.951, 0.309, 0)
---step 顶面五点---
F = Point(0, 1, 2)
G = Point(0.951, 0.309, 2)
H = Point(0.588, -0.809, 2)
I = Point(-0.588, -0.809, 2)
J = Point(-0.951, 0.309, 2)
---step 底面---
poly1 = Polygon(A, B, C, D, E)
---step 顶面---
poly2 = Polygon(F, G, H, I, J)
---step 侧面---
poly3 = Polygon(A, B, G, F)
poly4 = Polygon(B, C, H, G)
poly5 = Polygon(C, D, I, H)
poly6 = Polygon(D, E, J, I)
poly7 = Polygon(E, A, F, J)
```

### 圆柱体（近似，8 边形）

```
---step 底面八点---
A = Point(1, 0, 0)
B = Point(0.707, 0.707, 0)
C = Point(0, 1, 0)
D = Point(-0.707, 0.707, 0)
E = Point(-1, 0, 0)
F = Point(-0.707, -0.707, 0)
G = Point(0, -1, 0)
H = Point(0.707, -0.707, 0)
---step 顶面八点---
I = Point(1, 0, 2)
J = Point(0.707, 0.707, 2)
K = Point(0, 1, 2)
L = Point(-0.707, 0.707, 2)
M = Point(-1, 0, 2)
N = Point(-0.707, -0.707, 2)
O = Point(0, -1, 2)
P = Point(0.707, -0.707, 2)
---step 底面---
poly1 = Polygon(A, B, C, D, E, F, G, H)
---step 顶面---
poly2 = Polygon(I, J, K, L, M, N, O, P)
---step 侧棱---
seg1 = Segment(A, I)
seg2 = Segment(B, J)
seg3 = Segment(C, K)
seg4 = Segment(D, L)
seg5 = Segment(E, M)
seg6 = Segment(F, N)
seg7 = Segment(G, O)
seg8 = Segment(H, P)
```

### 圆锥体（近似，8 边形底面）

```
---step 底面八点---
A = Point(1, 0, 0)
B = Point(0.707, 0.707, 0)
C = Point(0, 1, 0)
D = Point(-0.707, 0.707, 0)
E = Point(-1, 0, 0)
F = Point(-0.707, -0.707, 0)
G = Point(0, -1, 0)
H = Point(0.707, -0.707, 0)
---step 顶点---
I = Point(0, 0, 2)
---step 底面---
poly1 = Polygon(A, B, C, D, E, F, G, H)
---step 侧面---
tri1 = Triangle(A, H, I)
tri2 = Triangle(B, A, I)
tri3 = Triangle(C, B, I)
tri4 = Triangle(D, C, I)
tri5 = Triangle(E, D, I)
tri6 = Triangle(F, E, I)
tri7 = Triangle(G, F, I)
tri8 = Triangle(H, G, I)
```

### 球体（近似，经纬线）

```
---step 极点---
A = Point(0, 0, 1)
B = Point(0, 0, -1)
---step 赤道四点---
C = Point(1, 0, 0)
D = Point(-1, 0, 0)
E = Point(0, 1, 0)
F = Point(0, -1, 0)
---step 赤道辅助点---
G = Point(0.707, 0.707, 0)
H = Point(-0.707, 0.707, 0)
I = Point(-0.707, -0.707, 0)
J = Point(0.707, -0.707, 0)
---step 经线1---
K = Point(0.707, 0, 0.707)
L = Point(-0.707, 0, 0.707)
M = Point(-0.707, 0, -0.707)
N = Point(0.707, 0, -0.707)
---step 经线2---
O = Point(0, 0.707, 0.707)
P = Point(0, -0.707, 0.707)
Q = Point(0, -0.707, -0.707)
R = Point(0, 0.707, -0.707)
---step 经线连接---
seg1 = Segment(A, K)
seg2 = Segment(K, C)
seg3 = Segment(C, N)
seg4 = Segment(N, B)
seg5 = Segment(B, M)
seg6 = Segment(M, D)
seg7 = Segment(D, L)
seg8 = Segment(L, A)
---step 纬线连接---
seg9 = Segment(A, O)
seg10 = Segment(O, E)
seg11 = Segment(E, R)
seg12 = Segment(R, B)
seg13 = Segment(B, Q)
seg14 = Segment(Q, F)
seg15 = Segment(F, P)
seg16 = Segment(P, A)
---step 赤道连接---
seg17 = Segment(C, G)
seg18 = Segment(G, E)
seg19 = Segment(E, H)
seg20 = Segment(H, D)
seg21 = Segment(D, I)
seg22 = Segment(I, F)
seg23 = Segment(F, J)
seg24 = Segment(J, C)
```

---

## 使用说明

1. 输入几何体名称（如"正四面体"、"正方体"、"金字塔"等）
2. 可选：指定大小、位置、旋转角度
3. 生成的命令可直接复制到命令输入框执行
4. 使用 `---step---` 标记实现逐步展示

## 示例输入

- "正四面体"
- "正方体 边长2"
- "金字塔 高3"
- "圆柱 高4 半径2"
- "球体 半径1.5"
- "正方体带步骤展示"

## 生成规则

1. 默认边长为 1，居中于原点
2. 所有对象必须显式命名
3. 辅助线默认虚线（`Dash(name, true)`）
4. 证明目标用颜色标注（红=目标线，蓝=目标面，绿=桥梁线）
5. 复杂几何体使用近似表示（如球体用经纬线）
6. 使用 `---step---` 分步展示构造过程
7. 每步 2-5 条命令，步骤名用简洁中文

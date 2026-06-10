---
name: generate-geometry
description: 生成常见几何体的命令序列
user_invocable: true
---

# 几何体命令生成器

根据用户描述生成对应的 3D 几何构造命令。

## 使用方式

用户输入想要的几何体名称或描述，生成对应的命令序列。

## 支持的几何体

### 基础几何体

**正四面体（4个面）**
```
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(0.5, 0.866, 0)
D = Point(0.5, 0.289, 0.816)
Triangle(A, B, C)
Triangle(A, B, D)
Triangle(A, C, D)
Triangle(B, C, D)
```

**正方体（6个面）**
```
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(1, 1, 0)
D = Point(0, 1, 0)
E = Point(0, 0, 1)
F = Point(1, 0, 1)
G = Point(1, 1, 1)
H = Point(0, 1, 1)
Polygon(A, B, C, D)
Polygon(E, F, G, H)
Polygon(A, B, F, E)
Polygon(B, C, G, F)
Polygon(C, D, H, G)
Polygon(D, A, E, H)
```

**正八面体（8个面）**
```
A = Point(0, 0, 1)
B = Point(0, 0, -1)
C = Point(1, 0, 0)
D = Point(-1, 0, 0)
E = Point(0, 1, 0)
F = Point(0, -1, 0)
Triangle(A, C, E)
Triangle(A, E, D)
Triangle(A, D, F)
Triangle(A, F, C)
Triangle(B, C, F)
Triangle(B, F, D)
Triangle(B, D, E)
Triangle(B, E, C)
```

**正二十面体（20个面）**
```
t = (1 + sqrt(5)) / 2
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
Triangle(A, F, B)
Triangle(A, B, H)
Triangle(A, H, K)
Triangle(A, K, L)
Triangle(A, L, F)
Triangle(B, F, J)
Triangle(B, J, I)
Triangle(B, I, H)
Triangle(F, L, E)
Triangle(F, E, J)
Triangle(L, K, C)
Triangle(L, C, E)
Triangle(K, H, G)
Triangle(K, G, C)
Triangle(H, I, D)
Triangle(H, D, G)
Triangle(I, J, D)
Triangle(J, E, D)
Triangle(C, G, D)
Triangle(G, I, D)
```

### 常见形状

**金字塔（四棱锥）**
```
A = Point(-1, -1, 0)
B = Point(1, -1, 0)
C = Point(1, 1, 0)
D = Point(-1, 1, 0)
E = Point(0, 0, 2)
Polygon(A, B, C, D)
Triangle(A, B, E)
Triangle(B, C, E)
Triangle(C, D, E)
Triangle(D, A, E)
```

**圆柱体（近似）**
```
A = Point(1, 0, 0)
B = Point(0.707, 0.707, 0)
C = Point(0, 1, 0)
D = Point(-0.707, 0.707, 0)
E = Point(-1, 0, 0)
F = Point(-0.707, -0.707, 0)
G = Point(0, -1, 0)
H = Point(0.707, -0.707, 0)
I = Point(1, 0, 2)
J = Point(0.707, 0.707, 2)
K = Point(0, 1, 2)
L = Point(-0.707, 0.707, 2)
M = Point(-1, 0, 2)
N = Point(-0.707, -0.707, 2)
O = Point(0, -1, 2)
P = Point(0.707, -0.707, 2)
Polygon(A, B, C, D, E, F, G, H)
Polygon(I, J, K, L, M, N, O, P)
Segment(A, I)
Segment(B, J)
Segment(C, K)
Segment(D, L)
Segment(E, M)
Segment(F, N)
Segment(G, O)
Segment(H, P)
```

**圆锥体（近似）**
```
A = Point(1, 0, 0)
B = Point(0.707, 0.707, 0)
C = Point(0, 1, 0)
D = Point(-0.707, 0.707, 0)
E = Point(-1, 0, 0)
F = Point(-0.707, -0.707, 0)
G = Point(0, -1, 0)
H = Point(0.707, -0.707, 0)
I = Point(0, 0, 2)
Polygon(A, B, C, D, E, F, G, H)
Triangle(A, H, I)
Triangle(B, A, I)
Triangle(C, B, I)
Triangle(D, C, I)
Triangle(E, D, I)
Triangle(F, E, I)
Triangle(G, F, I)
Triangle(H, G, I)
```

**球体（近似，经纬线）**
```
A = Point(0, 0, 1)
B = Point(0, 0, -1)
C = Point(1, 0, 0)
D = Point(-1, 0, 0)
E = Point(0, 1, 0)
F = Point(0, -1, 0)
G = Point(0.707, 0.707, 0)
H = Point(-0.707, 0.707, 0)
I = Point(-0.707, -0.707, 0)
J = Point(0.707, -0.707, 0)
K = Point(0.707, 0, 0.707)
L = Point(-0.707, 0, 0.707)
M = Point(-0.707, 0, -0.707)
N = Point(0.707, 0, -0.707)
O = Point(0, 0.707, 0.707)
P = Point(0, -0.707, 0.707)
Q = Point(0, -0.707, -0.707)
R = Point(0, 0.707, -0.707)
Segment(A, K)
Segment(K, C)
Segment(C, N)
Segment(N, B)
Segment(B, M)
Segment(M, D)
Segment(D, L)
Segment(L, A)
Segment(A, O)
Segment(O, E)
Segment(E, R)
Segment(R, B)
Segment(B, Q)
Segment(Q, F)
Segment(F, P)
Segment(P, A)
Segment(C, G)
Segment(G, E)
Segment(E, H)
Segment(H, D)
Segment(D, I)
Segment(I, F)
Segment(F, J)
Segment(J, C)
```

### 正多边形棱柱

**三棱柱**
```
A = Point(0, 0, 0)
B = Point(1, 0, 0)
C = Point(0.5, 0.866, 0)
D = Point(0, 0, 2)
E = Point(1, 0, 2)
F = Point(0.5, 0.866, 2)
Triangle(A, B, C)
Triangle(D, E, F)
Polygon(A, B, E, D)
Polygon(B, C, F, E)
Polygon(C, A, D, F)
```

**五棱柱**
```
A = Point(0, 1, 0)
B = Point(0.951, 0.309, 0)
C = Point(0.588, -0.809, 0)
D = Point(-0.588, -0.809, 0)
E = Point(-0.951, 0.309, 0)
F = Point(0, 1, 2)
G = Point(0.951, 0.309, 2)
H = Point(0.588, -0.809, 2)
I = Point(-0.588, -0.809, 2)
J = Point(-0.951, 0.309, 2)
Polygon(A, B, C, D, E)
Polygon(F, G, H, I, J)
Polygon(A, B, G, F)
Polygon(B, C, H, G)
Polygon(C, D, I, H)
Polygon(D, E, J, I)
Polygon(E, A, F, J)
```

## 使用说明

1. 输入几何体名称（如"正四面体"、"正方体"、"金字塔"等）
2. 可选：指定大小、位置、旋转角度
3. 生成的命令可直接复制到命令输入框执行

## 示例输入

- "正四面体"
- "正方体 边长2"
- "金字塔 高3"
- "圆柱 高4 半径2"
- "球体 半径1.5"

## 生成规则

1. 默认边长为 1，居中于原点
2. 可通过缩放命令调整大小
3. 复杂几何体使用近似表示（如球体用经纬线）

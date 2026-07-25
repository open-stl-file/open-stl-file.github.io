# 🧊 STL 在线打开与 3D 几何分析工具

[![GitHub Pages Deployment](https://img.shields.io/github/deployments/open-stl-file/open-stl-file.github.io/github-pages?label=GitHub%20Pages&logo=github)](https://open-stl-file.github.io/zh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL](https://img.shields.io/badge/WebGL-HTML5-orange.svg)](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API)
[![Languages](https://img.shields.io/badge/Language-English%20%7C%20中文-brightgreen.svg)](#-国际化架构)

[**中文版 (Chinese Version)**](./README.zh-CN.md) | [**English Version (英文版)**](./README.md)

---

## 🌟 项目简介

**STL 在线打开与 3D 几何分析工具** 是一款专为 3D 打印爱好者、建筑设计师、机械工程师及三维设计人员打造的免费 WebGL 网页端应用。

无需下载或安装任何重型软件（如 AutoCAD、SolidWorks 或 MeshLab），直接在浏览器中拖拽即可瞬间打开二进制 (Binary) 及文本 (ASCII) 格式的 `.stl` 3D 模型，**100% 本地解析，确保几何数据隐私安全**。

👉 **中文在线体验地址**：[https://open-stl-file.github.io/zh/](https://open-stl-file.github.io/zh/)  
👉 **英文主页地址**：[https://open-stl-file.github.io/](https://open-stl-file.github.io/)

---

## ✨ 核心功能特质

- 🚀 **纯前端高速解析**：采用原生 JavaScript `DataView` 直接读取解析 STL 三角面片数据，毫秒级加载渲染，无需任何后端服务器。
- 📐 **CAD 工程边框风格**：内置高对比度黑色轮廓线条 (`THREE.EdgesGeometry`) 与阴影面结合的经典 CAD 工程制图模式。
- 📊 **三维几何特征分析**：自动计算包围盒尺寸 ($X \times Y \times Z$ mm)、几何总体积 ($cm^3$)、总表面积 ($cm^2$)、三角面片数与顶点总数。
- ⚖️ **3D 打印耗材重量估算**：支持 PLA、ABS、PETG、光敏树脂、铝合金及不锈钢材料的重量 ($g$) 精确估算。
- ✂️ **动态剖面切割 (Clipping Plane)**：支持沿 X / Y / Z 轴向滑块切割，透视剖透内部结构与壁厚。
- 📏 **3D 空间点对点测距**：基于 Raycaster 射线投射算法，点击模型表面任意两点即可精准测量空间间距 (mm)。
- 🗿 **内置精选 3D 模型**：
  1. ♾️ **莫比乌斯环雕塑**：展示拓扑学单曲面奇迹的科技青色 3D 雕塑。
  2. 🏛️ **北京天坛祈年殿**：中式古建筑地标，包含三层白玉圆坛、朱红柱身与三层重檐蓝琉璃顶。
  3. ⚙️ **工业精密齿轮**：16 齿标准传动机械齿轮。
- 🌈 **15-Bit RGB 顶点色彩提取**：完全支持 Binary STL 15 位 RGB 颜色解析与材质展现。

---

## 📁 目录结构

```text
.
├── index.html              # 根目录英文主页 (https://open-stl-file.github.io/)
├── zh/
│   └── index.html          # 中文主页 (https://open-stl-file.github.io/zh/)
├── style.css               # Glassmorphism 现代深色主题样式表
├── js/
│   ├── stlParser.js        # 二进制与 ASCII STL 高性能解析器
│   ├── samples.js          # 3D 示例模型生成器 (莫比乌斯环、天坛、齿轮)
│   └── app.js              # Three.js WebGL 渲染引擎与几何分析控制器
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions 零 Token 自动化 Pages 部署脚本
├── README.md               # 英文说明文档
└── README.zh-CN.md         # 中文说明文档
```

---

## 🛠️ 技术栈

- **3D 渲染引擎**：[Three.js](https://threejs.org/) (PerspectiveCamera, WebGLRenderer, OrbitControls)
- **UI 设计**：Modern Glassmorphism 毛玻璃风格 + CSS 变量 + Google Fonts (`Inter` & `JetBrains Mono`)
- **图标**：FontAwesome 6
- **自动化构建**：GitHub Actions + GitHub Pages

---

## 🌐 本地运行指南

直接克隆仓库并在本地启动静态 Web 服务器即可体验：

```bash
git clone https://github.com/open-stl-file/open-stl-file.github.io.git
cd open-stl-file.github.io

# 启动本地 HTTP 服务器
python -m http.server 8080
```

打开浏览器访问 `http://localhost:8080/zh/` (中文) 或 `http://localhost:8080/` (英文)。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。

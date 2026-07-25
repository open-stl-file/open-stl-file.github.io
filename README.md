# 🧊 Online 3D STL Viewer & Geometry Analyzer

[![GitHub Pages Deployment](https://img.shields.io/github/deployments/open-stl-file/open-stl-file.github.io/github-pages?label=GitHub%20Pages&logo=github)](https://open-stl-file.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WebGL](https://img.shields.io/badge/WebGL-HTML5-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
[![Languages](https://img.shields.io/badge/Language-English%20%7C%20中文-brightgreen.svg)](#-internationalization-i18n)

[**English Version**](./README.md) | [**中文版 (Chinese Version)**](./README.zh-CN.md)

---

## 🌟 Overview

**Online 3D STL Viewer & Geometry Analyzer** is a modern, high-performance, browser-based WebGL application designed for 3D printing enthusiasts, CAD designers, mechanical engineers, and makers. 

It allows you to open, view, inspect, and measure Binary and ASCII `.stl` 3D files instantly with **zero software installation** and **100% local client-side data privacy**.

👉 **Live Demo**: [https://open-stl-file.github.io/](https://open-stl-file.github.io/)  
👉 **中文版 (Chinese Demo)**: [https://open-stl-file.github.io/zh/](https://open-stl-file.github.io/zh/)

---

## ✨ Key Features

- 🚀 **Instant Client-Side Parsing**: Parses both Binary and ASCII STL files in milliseconds using pure JavaScript `DataView`. Zero server uploads required.
- 🎨 **CAD Technical Edges Mode**: Features a dedicated crisp engineering outline rendering style (`THREE.EdgesGeometry`) paired with flat shading on pure light background—matching authentic technical drawing aesthetics.
- 📊 **3D Geometry Analytics**: Automatically computes 3D Bounding Box dimensions ($X \times Y \times Z$ mm), total volume ($cm^3$), surface area ($cm^2$), triangle count, and vertex count.
- ⚖️ **3D Printing Material Weight Estimator**: Instant weight calculation ($g$) for PLA, ABS, PETG, Resin, Aluminum, and Stainless Steel filaments.
- ✂️ **Dynamic Section Clipping Plane**: Axis-aligned ($X/Y/Z$) slicing plane to inspect interior hollow geometry, core structures, and wall thickness.
- 📏 **Point-to-Point 3D Measurement**: Raycast interactive spatial distance measurement between any two points on the 3D surface.
- 🗿 **Pre-Loaded 3D Models**:
  1. ♾️ **Möbius Strip Sculpture**: Iconic single-surface topological geometry sculpture in cyan metallic finish.
  2. 🏛️ **Temple of Heaven (Beijing)**: Architectural masterpiece with 3-tiered marble altar, red columns, and triple-tier royal blue roofs.
  3. ⚙️ **Mechanical Spur Gear**: Precision 16-tooth transmission gear ideal for CAD outline inspection.
- 🌈 **15-Bit RGB Vertex Color Support**: Full binary STL 15-bit color attribute parsing and rendering.

---

## 📁 Repository Structure

```text
.
├── index.html              # Root English homepage (https://open-stl-file.github.io/)
├── zh/
│   └── index.html          # Chinese homepage (https://open-stl-file.github.io/zh/)
├── style.css               # Glassmorphism UI stylesheet
├── js/
│   ├── stlParser.js        # High-performance Binary & ASCII STL parser
│   ├── samples.js          # Procedural 3D model generator (Möbius, Temple, Gear)
│   └── app.js              # Three.js WebGL controller & analytics engine
├── .github/
│   └── workflows/
│       └── deploy.yml      # Zero-token automated GitHub Pages CI/CD workflow
├── README.md               # English documentation
└── README.zh-CN.md         # Chinese documentation
```

---

## 🛠️ Technology Stack

- **3D Engine**: [Three.js](https://threejs.org/) (WebGL Renderer, OrbitControls, PCFSoftShadowMap)
- **UI Design**: Modern Glassmorphism layout with CSS Custom Properties & Google Fonts (`Inter` & `JetBrains Mono`)
- **Icons**: FontAwesome 6
- **Deployment**: GitHub Actions + GitHub Pages

---

## 🌐 Local Setup

Simply clone the repository and serve static files locally:

```bash
git clone https://github.com/open-stl-file/open-stl-file.github.io.git
cd open-stl-file.github.io
# Start a local HTTP server
python -m http.server 8080
```

Open `http://localhost:8080/` in your browser.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

/**
 * Main WebGL Application & STL Viewer Controller
 * Optimized for large (30MB+) STL files with lazy geometry creation & V8/GPU memory disposal.
 * Supports high-resolution Image Export (PNG/JPG/WebP, 4K, 1080p, Transparent background)
 * and 360° Animated Motion Video/GIF Exporter (WebM, MP4, GIF).
 * Supports Selective Area / Facet Regional Color Painting with Undo / Redo History (Ctrl+Z / Ctrl+Y).
 */
class STLViewerApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Current loaded mesh objects
        this.currentMesh = null;
        this.wireframeMesh = null;
        this.edgesMesh = null;
        this.pointsMesh = null;
        this.boundingBoxHelper = null;
        this.gridHelper = null;
        this.axesHelper = null;

        // Active Three.js BufferGeometry
        this.currentGeometry = null;

        // Clipping Plane
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
        this.clippingEnabled = false;

        // Materials & Render Settings
        this.currentRenderMode = 'shaded';
        this.currentColor = '#3b82f6';
        this.userOverrodeColor = false; // Flag indicating if user picked a custom material color

        // Regional Paint Mode State & Undo History Stack
        this.paintMode = false; // Entire model vs selective regional area painting
        this.brushRadius = 0; // 0 = Single Facet, >0 = Radius in mm
        this.paintHistory = []; // Snapshots of Float32Array color attribute
        this.paintHistoryIndex = -1;
        this.maxHistorySteps = 25;

        // Stats & Data
        this.currentStats = null;
        this.currentFileName = '';

        // Measurement state
        this.measureMode = false;
        this.measurePoints = [];
        this.measureLine = null;
        this.measureMarkers = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Lighting
        this.lights = {};

        // Auto Rotation & Custom Direction
        this.isAutoRotating = false;
        this.autoRotateDirection = 'y-cw'; // 'y-cw', 'y-ccw', 'x-cw', 'z-cw'
        this.autoRotateSpeed = 0.008;

        this.initThree();
        this.initLights();
        this.initGridAndAxes();
        this.initEventListeners();

        // 默认初始化展示模型: 北京天坛祈年殿
        this.loadSample('temple');

        // Animation Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * Initializes Three.js Scene, Camera, Renderer, and OrbitControls
     */
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#0f172a');

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
        this.camera.position.set(60, 60, 80);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.localClippingEnabled = true;

        this.container.appendChild(this.renderer.domElement);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 1500;
        this.controls.minDistance = 1;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 2.5;

        // Handle Window Resize
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    /**
     * Set up lights
     */
    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.95);
        mainLight.position.set(100, 150, 100);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
        fillLight.position.set(-100, 50, -100);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0x818cf8, 0.35);
        backLight.position.set(0, -100, 100);
        this.scene.add(backLight);

        this.lights = { ambientLight, mainLight, fillLight, backLight };
    }

    /**
     * Set up Grid & Axes helpers
     */
    initGridAndAxes() {
        // Grid
        this.gridHelper = new THREE.GridHelper(200, 40, 0x3b82f6, 0x334155);
        this.gridHelper.position.y = -0.01;
        this.scene.add(this.gridHelper);

        // Axes (Red = X, Green = Y, Blue = Z)
        this.axesHelper = new THREE.AxesHelper(30);
        this.scene.add(this.axesHelper);
    }

    /**
     * Disposes old 3D meshes, geometries, and materials to free V8 and WebGL RAM
     */
    disposeCurrentScene() {
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            if (this.currentMesh.material) this.currentMesh.material.dispose();
            this.currentMesh = null;
        }
        if (this.wireframeMesh) {
            this.scene.remove(this.wireframeMesh);
            if (this.wireframeMesh.geometry) this.wireframeMesh.geometry.dispose();
            if (this.wireframeMesh.material) this.wireframeMesh.material.dispose();
            this.wireframeMesh = null;
        }
        if (this.edgesMesh) {
            this.scene.remove(this.edgesMesh);
            if (this.edgesMesh.geometry) this.edgesMesh.geometry.dispose();
            if (this.edgesMesh.material) this.edgesMesh.material.dispose();
            this.edgesMesh = null;
        }
        if (this.pointsMesh) {
            this.scene.remove(this.pointsMesh);
            if (this.pointsMesh.geometry) this.pointsMesh.geometry.dispose();
            if (this.pointsMesh.material) this.pointsMesh.material.dispose();
            this.pointsMesh = null;
        }
        if (this.boundingBoxHelper) {
            this.scene.remove(this.boundingBoxHelper);
            this.boundingBoxHelper = null;
        }
        if (this.currentGeometry) {
            this.currentGeometry.dispose();
            this.currentGeometry = null;
        }
        this.paintHistory = [];
        this.paintHistoryIndex = -1;
    }

    /**
     * Loads STL file ArrayBuffer into the 3D scene
     */
    loadSTLBuffer(buffer, fileName = "model.stl") {
        this.showLoading(true);

        setTimeout(() => {
            try {
                this.disposeCurrentScene();
                this.userOverrodeColor = false; // Reset color override flag on new model load

                const startTime = performance.now();
                const parseResult = STLParser.parse(buffer);
                const parseTime = (performance.now() - startTime).toFixed(1);

                this.currentFileName = fileName;
                this.currentStats = parseResult.stats;

                // Build Three.js BufferGeometry
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(parseResult.positions, 3));

                if (parseResult.normals && parseResult.normals.length > 0) {
                    geometry.setAttribute('normal', new THREE.BufferAttribute(parseResult.normals, 3));
                } else {
                    geometry.computeVertexNormals();
                }

                if (parseResult.colors && parseResult.colors.length > 0) {
                    geometry.setAttribute('color', new THREE.BufferAttribute(parseResult.colors, 3));
                }

                // Center geometry to origin
                geometry.computeBoundingBox();
                const bbox = geometry.boundingBox;
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                geometry.translate(-center.x, -center.y, -center.z);

                // Place geometry base on grid floor
                geometry.computeBoundingBox();
                const minY = geometry.boundingBox.min.y;
                geometry.translate(0, -minY, 0);

                geometry.computeBoundingBox();

                this.currentGeometry = geometry;

                this.renderGeometry(geometry);
                this.updateUIStats(parseTime);
                this.resetCameraView();
                this.clearMeasurement();

                document.getElementById('file-info-name').textContent = fileName;
            } catch (err) {
                alert("STL 文件解析失败: " + err.message);
                console.error(err);
            } finally {
                this.showLoading(false);
            }
        }, 30);
    }

    /**
     * Renders processed Three.js geometry with lazy auxiliary meshes
     */
    renderGeometry(geometry) {
        const hasVertexColors = !!(geometry.attributes.color) && !this.userOverrodeColor;

        // Standard Material
        const material = new THREE.MeshStandardMaterial({
            color: hasVertexColors ? 0xffffff : new THREE.Color(this.currentColor),
            vertexColors: hasVertexColors,
            roughness: 0.3,
            metalness: 0.3,
            side: THREE.DoubleSide,
            clippingPlanes: this.clippingEnabled ? [this.clippingPlane] : []
        });

        this.currentMesh = new THREE.Mesh(geometry, material);
        this.currentMesh.castShadow = true;
        this.currentMesh.receiveShadow = true;
        this.scene.add(this.currentMesh);

        // Bounding Box Helper
        this.boundingBoxHelper = new THREE.BoxHelper(this.currentMesh, 0xef4444);
        this.boundingBoxHelper.visible = document.getElementById('toggle-bbox') ? document.getElementById('toggle-bbox').checked : false;
        this.scene.add(this.boundingBoxHelper);

        // Update clipping plane slider max range based on model height
        const height = geometry.boundingBox.max.y;
        const clipSlider = document.getElementById('clip-offset');
        if (clipSlider) {
            clipSlider.min = 0;
            clipSlider.max = height * 1.2;
            clipSlider.value = height;
            this.clippingPlane.constant = parseFloat(clipSlider.value);
        }

        this.setRenderMode(this.currentRenderMode);
    }

    /**
     * Lazy creation of Wireframe mesh
     */
    ensureWireframeMesh() {
        if (!this.wireframeMesh && this.currentGeometry) {
            const wireframeGeo = new THREE.WireframeGeometry(this.currentGeometry);
            const activeColor = new THREE.Color(this.currentColor);
            const wireframeMat = new THREE.LineBasicMaterial({
                color: activeColor,
                transparent: true,
                opacity: 0.8,
                clippingPlanes: this.clippingEnabled ? [this.clippingPlane] : []
            });
            this.wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
            this.scene.add(this.wireframeMesh);
        }
    }

    /**
     * Lazy creation of CAD Edges mesh
     */
    ensureEdgesMesh() {
        if (!this.edgesMesh && this.currentGeometry) {
            const edgesGeo = new THREE.EdgesGeometry(this.currentGeometry, 25);
            const edgesMat = new THREE.LineBasicMaterial({
                color: 0x1e293b,
                linewidth: 2,
                clippingPlanes: this.clippingEnabled ? [this.clippingPlane] : []
            });
            this.edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
            this.scene.add(this.edgesMesh);
        }
    }

    /**
     * Lazy creation of Points mesh
     */
    ensurePointsMesh() {
        if (!this.pointsMesh && this.currentGeometry) {
            const activeColor = new THREE.Color(this.currentColor);
            const pointsMat = new THREE.PointsMaterial({
                color: activeColor,
                size: 1.5,
                sizeAttenuation: true
            });
            this.pointsMesh = new THREE.Points(this.currentGeometry, pointsMat);
            this.scene.add(this.pointsMesh);
        }
    }

    /**
     * Sets render mode (shaded, cad, wireframe, points, normal, xray, solid-wireframe)
     */
    setRenderMode(mode) {
        this.currentRenderMode = mode;
        if (!this.currentMesh) return;

        this.currentMesh.visible = true;
        if (this.wireframeMesh) this.wireframeMesh.visible = false;
        if (this.edgesMesh) this.edgesMesh.visible = false;
        if (this.pointsMesh) this.pointsMesh.visible = false;

        const clipPlanes = this.clippingEnabled ? [this.clippingPlane] : [];
        const hasVertexColors = (!!(this.currentMesh.geometry.attributes.color) && !this.userOverrodeColor) || (this.currentMesh.geometry.attributes.color && this.paintMode);
        const activeColor = new THREE.Color(this.currentColor);

        switch (mode) {
            case 'shaded':
                this.currentMesh.material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : activeColor,
                    vertexColors: hasVertexColors,
                    roughness: 0.3,
                    metalness: 0.3,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                break;
            case 'cad':
                this.currentMesh.material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : (this.userOverrodeColor ? activeColor : new THREE.Color('#cbd5e1')),
                    vertexColors: hasVertexColors,
                    roughness: 0.5,
                    metalness: 0.1,
                    flatShading: true,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                this.ensureEdgesMesh();
                if (this.edgesMesh) this.edgesMesh.visible = true;
                break;
            case 'wireframe':
                this.ensureWireframeMesh();
                if (this.wireframeMesh) {
                    this.wireframeMesh.visible = true;
                    if (this.wireframeMesh.material) {
                        this.wireframeMesh.material.color = activeColor;
                    }
                }
                this.currentMesh.visible = false;
                break;
            case 'points':
                this.ensurePointsMesh();
                if (this.pointsMesh) {
                    this.pointsMesh.visible = true;
                    if (this.pointsMesh.material) {
                        this.pointsMesh.material.color = activeColor;
                    }
                }
                this.currentMesh.visible = false;
                break;
            case 'normal':
                this.currentMesh.material = new THREE.MeshNormalMaterial({
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                break;
            case 'xray':
                this.currentMesh.material = new THREE.MeshPhysicalMaterial({
                    color: hasVertexColors ? 0xffffff : activeColor,
                    vertexColors: hasVertexColors,
                    transmission: 0.82,
                    opacity: 1,
                    transparent: true,
                    roughness: 0.1,
                    ior: 1.5,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                break;
            case 'solid-wireframe':
                this.currentMesh.material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : activeColor,
                    vertexColors: hasVertexColors,
                    roughness: 0.35,
                    metalness: 0.25,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                this.ensureWireframeMesh();
                if (this.wireframeMesh) {
                    this.wireframeMesh.visible = true;
                    if (this.wireframeMesh.material) {
                        this.wireframeMesh.material.color = activeColor;
                    }
                }
                break;
        }
    }

    /**
     * Updates model color across all sub-meshes.
     * In entire model mode: recolors entire model.
     */
    setModelColor(hexColor) {
        this.currentColor = hexColor;
        this.userOverrodeColor = true;

        if (this.currentMesh) {
            if (!this.paintMode) {
                if (this.currentMesh.material && this.currentRenderMode !== 'normal') {
                    this.currentMesh.material.vertexColors = false;
                    if (this.currentMesh.material.color) {
                        this.currentMesh.material.color.set(hexColor);
                    }
                    this.currentMesh.material.needsUpdate = true;
                }
            }
        }
        if (this.wireframeMesh && this.wireframeMesh.material) {
            this.wireframeMesh.material.color.set(hexColor);
            this.wireframeMesh.material.needsUpdate = true;
        }
        if (this.pointsMesh && this.pointsMesh.material) {
            this.pointsMesh.material.color.set(hexColor);
            this.pointsMesh.material.needsUpdate = true;
        }

        if (!this.paintMode) {
            this.setRenderMode(this.currentRenderMode);
        }
    }

    /**
     * Sets regional paint mode on/off
     */
    setPaintMode(enabled) {
        this.paintMode = enabled;
        if (enabled && this.currentMesh) {
            this.ensureVertexColorAttribute();
            if (this.currentMesh.material) {
                this.currentMesh.material.vertexColors = true;
                this.currentMesh.material.color.set(0xffffff);
                this.currentMesh.material.needsUpdate = true;
            }
            // Save initial state if history empty
            if (this.paintHistory.length === 0 && this.currentGeometry && this.currentGeometry.attributes.color) {
                this.savePaintSnapshot();
            }
        }
        this.updatePaintHistoryUI();
    }

    /**
     * Sets paint brush radius (0 = Single facet, >0 = Radius in mm)
     */
    setBrushRadius(radiusMm) {
        this.brushRadius = parseFloat(radiusMm);
    }

    /**
     * Ensures `color` Float32Array attribute exists on BufferGeometry for regional painting
     */
    ensureVertexColorAttribute() {
        const geo = this.currentGeometry;
        if (!geo) return;

        if (!geo.attributes.color) {
            const posAttr = geo.attributes.position;
            const colorArray = new Float32Array(posAttr.count * 3);
            const baseColor = new THREE.Color(this.currentColor);

            for (let i = 0; i < posAttr.count; i++) {
                colorArray[i * 3] = baseColor.r;
                colorArray[i * 3 + 1] = baseColor.g;
                colorArray[i * 3 + 2] = baseColor.b;
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        }
    }

    /**
     * Saves a snapshot of current vertex colors to the paint history stack
     */
    savePaintSnapshot() {
        if (!this.currentGeometry || !this.currentGeometry.attributes.color) return;
        const colorArray = this.currentGeometry.attributes.color.array;

        // Truncate redo stack if needed
        if (this.paintHistoryIndex < this.paintHistory.length - 1) {
            this.paintHistory = this.paintHistory.slice(0, this.paintHistoryIndex + 1);
        }

        // Clone current color array
        this.paintHistory.push(new Float32Array(colorArray));

        // Limit stack size
        if (this.paintHistory.length > this.maxHistorySteps) {
            this.paintHistory.shift();
        }

        this.paintHistoryIndex = this.paintHistory.length - 1;
        this.updatePaintHistoryUI();
    }

    /**
     * Undo regional paint step (Ctrl+Z)
     */
    undoPaint() {
        if (this.paintHistoryIndex > 0) {
            this.paintHistoryIndex--;
            this.applyPaintSnapshot(this.paintHistory[this.paintHistoryIndex]);
            this.updatePaintHistoryUI();
        }
    }

    /**
     * Redo regional paint step (Ctrl+Y)
     */
    redoPaint() {
        if (this.paintHistoryIndex < this.paintHistory.length - 1) {
            this.paintHistoryIndex++;
            this.applyPaintSnapshot(this.paintHistory[this.paintHistoryIndex]);
            this.updatePaintHistoryUI();
        }
    }

    /**
     * Applies snapshot Float32Array to geometry color attribute
     */
    applyPaintSnapshot(snapshotArray) {
        if (!this.currentGeometry || !this.currentGeometry.attributes.color || !snapshotArray) return;
        const colorAttr = this.currentGeometry.attributes.color;
        colorAttr.array.set(snapshotArray);
        colorAttr.needsUpdate = true;

        if (this.currentMesh && this.currentMesh.material) {
            this.currentMesh.material.vertexColors = true;
            this.currentMesh.material.color.set(0xffffff);
            this.currentMesh.material.needsUpdate = true;
        }
    }

    /**
     * Updates Undo / Redo button disabled states in UI
     */
    updatePaintHistoryUI() {
        const undoBtn = document.getElementById('btn-paint-undo');
        const redoBtn = document.getElementById('btn-paint-redo');

        const canUndo = this.paintHistoryIndex > 0;
        const canRedo = this.paintHistoryIndex >= 0 && this.paintHistoryIndex < this.paintHistory.length - 1;

        if (undoBtn) {
            undoBtn.disabled = !canUndo;
            undoBtn.style.opacity = canUndo ? '1' : '0.4';
            undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
        }
        if (redoBtn) {
            redoBtn.disabled = !canRedo;
            redoBtn.style.opacity = canRedo ? '1' : '0.4';
            redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
        }
    }

    /**
     * Handles 3D Canvas Click when Regional Paint Mode is Active
     */
    handlePaintClick(event) {
        if (!this.paintMode || !this.currentMesh || !this.currentGeometry) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentMesh);

        if (intersects.length > 0) {
            const hit = intersects[0];

            // Save snapshot before paint action
            if (this.paintHistory.length === 0) {
                this.savePaintSnapshot();
            }

            this.paintRegion(hit.point, hit.faceIndex);

            // Save snapshot after paint action
            this.savePaintSnapshot();
        }
    }

    /**
     * Paints selected region or facet on the 3D model
     */
    paintRegion(hitPoint, faceIndex) {
        this.ensureVertexColorAttribute();
        const geo = this.currentGeometry;
        if (!geo || !geo.attributes.color) return;

        const colorAttr = geo.attributes.color;
        const posAttr = geo.attributes.position;
        const paintColor = new THREE.Color(this.currentColor);

        if (this.brushRadius <= 0) {
            // Single triangle facet
            if (faceIndex !== undefined && faceIndex !== null) {
                const startVert = faceIndex * 3;
                for (let i = 0; i < 3; i++) {
                    const idx = startVert + i;
                    colorAttr.setXYZ(idx, paintColor.r, paintColor.g, paintColor.b);
                }
            }
        } else {
            // Radius flood-fill painting around hitPoint
            const rSq = this.brushRadius * this.brushRadius;
            const v = new THREE.Vector3();

            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                if (v.distanceToSquared(hitPoint) <= rSq) {
                    colorAttr.setXYZ(i, paintColor.r, paintColor.g, paintColor.b);
                }
            }
        }

        colorAttr.needsUpdate = true;

        if (this.currentMesh && this.currentMesh.material) {
            this.currentMesh.material.vertexColors = true;
            this.currentMesh.material.color.set(0xffffff);
            this.currentMesh.material.needsUpdate = true;
        }
    }

    /**
     * Resets regional custom colors back to base uniform color
     */
    resetRegionalColors() {
        if (!this.currentGeometry) return;
        const geo = this.currentGeometry;
        const baseColor = new THREE.Color(this.currentColor);

        if (geo.attributes.color) {
            this.savePaintSnapshot();
            const colorAttr = geo.attributes.color;
            for (let i = 0; i < colorAttr.count; i++) {
                colorAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
            }
            colorAttr.needsUpdate = true;
            this.savePaintSnapshot();
        }

        if (this.currentMesh && this.currentMesh.material) {
            if (!this.paintMode) {
                this.currentMesh.material.vertexColors = false;
                this.currentMesh.material.color.set(this.currentColor);
            }
            this.currentMesh.material.needsUpdate = true;
        }
    }

    /**
     * Enables or disables auto rotation, preserving user's adjusted camera angle and tilt
     */
    setAutoRotate(enabled) {
        this.isAutoRotating = enabled;
        this.updateAutoRotateState();
    }

    /**
     * Sets auto-rotation direction ('y-cw', 'y-ccw', 'x-cw', 'z-cw')
     */
    setAutoRotateDirection(dir) {
        this.autoRotateDirection = dir;
        this.updateAutoRotateState();
    }

    /**
     * Updates OrbitControls auto-rotate parameters based on user selected direction
     */
    updateAutoRotateState() {
        if (!this.controls) return;

        if (this.isAutoRotating) {
            if (this.autoRotateDirection === 'y-cw') {
                this.controls.autoRotate = true;
                this.controls.autoRotateSpeed = 2.5;
            } else if (this.autoRotateDirection === 'y-ccw') {
                this.controls.autoRotate = true;
                this.controls.autoRotateSpeed = -2.5;
            } else {
                // For X-axis pitch or Z-axis roll, use incremental mesh rotation
                this.controls.autoRotate = false;
            }
        } else {
            this.controls.autoRotate = false;
        }
    }

    /**
     * Updates background style
     */
    setBackground(style) {
        switch (style) {
            case 'dark':
                this.scene.background = new THREE.Color('#0f172a');
                break;
            case 'black':
                this.scene.background = new THREE.Color('#000000');
                break;
            case 'light':
                this.scene.background = new THREE.Color('#f8fafc');
                break;
            case 'blueprint':
                this.scene.background = new THREE.Color('#032b56');
                break;
            case 'transparent':
                this.scene.background = null;
                break;
        }
    }

    /**
     * Lighting Presets
     */
    setLightingPreset(preset) {
        const { ambientLight, mainLight, fillLight, backLight } = this.lights;
        switch (preset) {
            case 'studio':
                ambientLight.intensity = 0.65;
                mainLight.intensity = 0.95;
                fillLight.intensity = 0.45;
                backLight.intensity = 0.35;
                mainLight.color.setHex(0xffffff);
                break;
            case 'bright':
                ambientLight.intensity = 1.0;
                mainLight.intensity = 1.2;
                fillLight.intensity = 0.8;
                backLight.intensity = 0.5;
                mainLight.color.setHex(0xffffff);
                break;
            case 'cyberpunk':
                ambientLight.intensity = 0.3;
                mainLight.intensity = 1.0;
                fillLight.intensity = 0.8;
                backLight.intensity = 1.0;
                mainLight.color.setHex(0x06b6d4);
                fillLight.color.setHex(0xec4899);
                backLight.color.setHex(0x8b5cf6);
                break;
            case 'dramatic':
                ambientLight.intensity = 0.2;
                mainLight.intensity = 1.5;
                fillLight.intensity = 0.1;
                backLight.intensity = 0.8;
                mainLight.color.setHex(0xffedd5);
                break;
        }
    }

    /**
     * Camera View Presets
     */
    setCameraView(viewName) {
        if (!this.currentMesh) return;
        const box = new THREE.Box3().setFromObject(this.currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 2.2;

        const targetPos = new THREE.Vector3();

        switch (viewName) {
            case 'iso':
                targetPos.set(center.x + dist, center.y + dist * 0.8, center.z + dist);
                break;
            case 'front':
                targetPos.set(center.x, center.y, center.z + dist * 1.5);
                break;
            case 'back':
                targetPos.set(center.x, center.y, center.z - dist * 1.5);
                break;
            case 'top':
                targetPos.set(center.x, center.y + dist * 1.8, center.z + 0.001);
                break;
            case 'bottom':
                targetPos.set(center.x, center.y - dist * 1.8, center.z + 0.001);
                break;
            case 'left':
                targetPos.set(center.x - dist * 1.5, center.y, center.z);
                break;
            case 'right':
                targetPos.set(center.x + dist * 1.5, center.y, center.z);
                break;
        }

        this.animateCameraTo(targetPos, center);
    }

    /**
     * Reset camera to fit mesh nicely
     */
    resetCameraView() {
        this.setCameraView('iso');
    }

    /**
     * Smooth Camera Animation
     */
    animateCameraTo(newPos, targetCenter) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();

        let progress = 0;
        const duration = 400; // ms
        const startTime = performance.now();

        const step = (now) => {
            const elapsed = now - startTime;
            progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // Ease Out Cubic

            this.camera.position.lerpVectors(startPos, newPos, ease);
            this.controls.target.lerpVectors(startTarget, targetCenter, ease);
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }

    /**
     * Handles Point-to-Point Measurement
     */
    handleMeasurementClick(event) {
        if (!this.measureMode || !this.currentMesh) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentMesh);

        if (intersects.length > 0) {
            const point = intersects[0].point;

            // Add marker sphere
            const sphereGeo = new THREE.SphereGeometry(0.8, 16, 16);
            const sphereMat = new THREE.MeshBasicMaterial({ color: 0xef4444, depthTest: false });
            const marker = new THREE.Mesh(sphereGeo, sphereMat);
            marker.position.copy(point);
            this.scene.add(marker);
            this.measureMarkers.push(marker);
            this.measurePoints.push(point);

            if (this.measurePoints.length === 2) {
                // Draw connecting line
                const lineGeo = new THREE.BufferGeometry().setFromPoints(this.measurePoints);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3, depthTest: false });
                this.measureLine = new THREE.Line(lineGeo, lineMat);
                this.scene.add(this.measureLine);

                // Calculate distance
                const p1 = this.measurePoints[0];
                const p2 = this.measurePoints[1];
                const distance = p1.distanceTo(p2);

                const resElem = document.getElementById('measure-result-val');
                if (resElem) resElem.textContent = `${distance.toFixed(2)} mm`;
                const infoBox = document.getElementById('measure-info-box');
                if (infoBox) infoBox.style.display = 'block';
            } else if (this.measurePoints.length > 2) {
                // Reset for new measurement
                this.clearMeasurement();
                this.measureMarkers.push(marker);
                this.measurePoints.push(point);
                const infoBox = document.getElementById('measure-info-box');
                if (infoBox) infoBox.style.display = 'none';
            }
        }
    }

    clearMeasurement() {
        this.measureMarkers.forEach(m => {
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
            this.scene.remove(m);
        });
        if (this.measureLine) {
            if (this.measureLine.geometry) this.measureLine.geometry.dispose();
            if (this.measureLine.material) this.measureLine.material.dispose();
            this.scene.remove(this.measureLine);
        }
        this.measureMarkers = [];
        this.measurePoints = [];
        this.measureLine = null;
        const infoBox = document.getElementById('measure-info-box');
        if (infoBox) infoBox.style.display = 'none';
    }

    /**
     * Loads preset samples (Mobius, Temple of Heaven, Gear)
     */
    loadSample(sampleType) {
        let sample;
        if (sampleType === 'mobius') {
            sample = SampleModels.getMobiusStrip();
        } else if (sampleType === 'temple') {
            sample = SampleModels.getTempleOfHeaven();
        } else if (sampleType === 'gear') {
            sample = SampleModels.getMechanicalGear();
        }

        if (sample) {
            this.loadSTLBuffer(sample.buffer, sample.fileName);
        }
    }

    /**
     * High-Resolution Image Export (PNG / JPG / WebP)
     */
    exportScreenshot(options = {}) {
        const {
            width = this.container.clientWidth,
            height = this.container.clientHeight,
            format = 'image/png',
            bgTransparent = false,
            filename = `stl_to_image_${(this.currentFileName || 'model').replace(/\.[^/.]+$/, "")}_${Date.now()}`
        } = options;

        const originalAspect = this.camera.aspect;
        const originalSize = new THREE.Vector2();
        this.renderer.getSize(originalSize);
        const originalBg = this.scene.background;

        if (bgTransparent) {
            this.scene.background = null;
        }

        // Temporarily resize renderer for high-res output
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);

        // Hide helpers temporarily if requested
        const gridVis = this.gridHelper ? this.gridHelper.visible : false;
        const axesVis = this.axesHelper ? this.axesHelper.visible : false;
        const bboxVis = this.boundingBoxHelper ? this.boundingBoxHelper.visible : false;

        if (options.hideHelpers) {
            if (this.gridHelper) this.gridHelper.visible = false;
            if (this.axesHelper) this.axesHelper.visible = false;
            if (this.boundingBoxHelper) this.boundingBoxHelper.visible = false;
        }

        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL(format);

        // Restore state
        if (options.hideHelpers) {
            if (this.gridHelper) this.gridHelper.visible = gridVis;
            if (this.axesHelper) this.axesHelper.visible = axesVis;
            if (this.boundingBoxHelper) this.boundingBoxHelper.visible = bboxVis;
        }

        this.scene.background = originalBg;
        this.camera.aspect = originalAspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(originalSize.x, originalSize.y, false);
        this.renderer.render(this.scene, this.camera);

        const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
        const link = document.createElement('a');
        link.download = `${filename}.${ext}`;
        link.href = dataURL;
        link.click();

        return dataURL;
    }

    /**
     * Captures 360° Rotating Motion Video or Animation (WebM, MP4)
     */
    record360Animation(options = {}) {
        const {
            duration = 4000, // 4 seconds full spin
            fps = 30,
            format = 'webm', // 'webm', 'mp4'
            hideHelpers = true,
            filename = `stl_360_animation_${(this.currentFileName || 'model').replace(/\.[^/.]+$/, "")}_${Date.now()}`
        } = options;

        if (!this.currentMesh) {
            alert('请先加载 3D STL 模型 / Please load a 3D model first');
            return;
        }

        this.showLoading(true);

        // Hide helpers during video recording if requested
        const gridVis = this.gridHelper ? this.gridHelper.visible : false;
        const axesVis = this.axesHelper ? this.axesHelper.visible : false;
        const bboxVis = this.boundingBoxHelper ? this.boundingBoxHelper.visible : false;

        if (hideHelpers) {
            if (this.gridHelper) this.gridHelper.visible = false;
            if (this.axesHelper) this.axesHelper.visible = false;
            if (this.boundingBoxHelper) this.boundingBoxHelper.visible = false;
        }

        const canvas = this.renderer.domElement;
        const stream = canvas.captureStream(fps);

        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }
        if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        }

        let mediaRecorder;
        try {
            mediaRecorder = new MediaRecorder(stream, { mimeType });
        } catch (e) {
            mediaRecorder = new MediaRecorder(stream);
        }

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            // Restore helpers
            if (hideHelpers) {
                if (this.gridHelper) this.gridHelper.visible = gridVis;
                if (this.axesHelper) this.axesHelper.visible = axesVis;
                if (this.boundingBoxHelper) this.boundingBoxHelper.visible = bboxVis;
            }

            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `${filename}.${ext}`;
            a.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.showLoading(false);
        };

        // Capture starting camera orientation (Azimuth, Polar height, Radius distance to target)
        const startAzimuth = this.controls.getAzimuthalAngle();
        const polar = this.controls.getPolarAngle();
        const target = this.controls.target.clone();
        const radius = this.camera.position.distanceTo(target);

        const dir = this.autoRotateDirection;
        const dirSign = (dir === 'y-ccw') ? -1 : 1;

        const startTime = performance.now();
        const wasAutoRotating = this.isAutoRotating;
        this.setAutoRotate(false);

        mediaRecorder.start();

        const animateSpin = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const fullAngle = progress * Math.PI * 2;

            if (dir === 'x-cw' || dir === 'z-cw') {
                const speed = (Math.PI * 2) / (duration / 1000 * 60);
                const applyRot = (m) => {
                    if (!m) return;
                    if (dir === 'x-cw') m.rotateX(speed);
                    else if (dir === 'z-cw') m.rotateZ(speed);
                };
                applyRot(this.currentMesh);
                applyRot(this.wireframeMesh);
                applyRot(this.edgesMesh);
                applyRot(this.pointsMesh);
                if (this.boundingBoxHelper) this.boundingBoxHelper.update();
            } else {
                // Orbit camera around target starting from user's current azimuth & polar tilt height!
                const angle = startAzimuth + dirSign * fullAngle;
                this.camera.position.x = target.x + radius * Math.sin(polar) * Math.sin(angle);
                this.camera.position.y = target.y + radius * Math.cos(polar);
                this.camera.position.z = target.z + radius * Math.sin(polar) * Math.cos(angle);
                this.camera.lookAt(target);
            }

            this.renderer.render(this.scene, this.camera);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                mediaRecorder.stop();
                this.setAutoRotate(wasAutoRotating);
            }
        };

        requestAnimationFrame(animateSpin);
    }

    /**
     * Updates Stats Panel & 3D Print Material Weight Estimator
     */
    updateUIStats(parseTimeMs) {
        if (!this.currentStats) return;
        const stats = this.currentStats;

        const fmtElem = document.getElementById('stat-format');
        if (fmtElem) fmtElem.textContent = stats.format + (stats.hasColors ? ' (RGB Color)' : '');
        const triElem = document.getElementById('stat-triangles');
        if (triElem) triElem.textContent = stats.triangleCount.toLocaleString();
        const vertElem = document.getElementById('stat-vertices');
        if (vertElem) vertElem.textContent = stats.vertexCount.toLocaleString();
        const parseElem = document.getElementById('stat-parse-time');
        if (parseElem) parseElem.textContent = `${parseTimeMs} ms`;

        // Dimensions
        const size = stats.boundingBox.size;
        const sx = document.getElementById('stat-size-x');
        if (sx) sx.textContent = `${size.x.toFixed(2)} mm`;
        const sy = document.getElementById('stat-size-y');
        if (sy) sy.textContent = `${size.y.toFixed(2)} mm`;
        const sz = document.getElementById('stat-size-z');
        if (sz) sz.textContent = `${size.z.toFixed(2)} mm`;

        // Volume & Surface Area
        const volumeCm3 = stats.volume / 1000.0;
        const areaCm2 = stats.surfaceArea / 100.0;

        const volElem = document.getElementById('stat-volume');
        if (volElem) volElem.textContent = `${volumeCm3.toFixed(2)} cm³`;
        const surfElem = document.getElementById('stat-surface-area');
        if (surfElem) surfElem.textContent = `${areaCm2.toFixed(2)} cm²`;

        // Material Weight Calculation
        this.updateMaterialWeight(volumeCm3);
    }

    /**
     * Material Weight Estimator
     */
    updateMaterialWeight(volumeCm3) {
        if (!volumeCm3) {
            volumeCm3 = (this.currentStats ? this.currentStats.volume : 0) / 1000.0;
        }
        const densitySelect = document.getElementById('material-density-select');
        const density = parseFloat(densitySelect ? densitySelect.value : 1.24); // Default PLA
        const weightGrams = volumeCm3 * density;

        const weightElem = document.getElementById('stat-weight');
        if (weightElem) {
            weightElem.textContent = `${weightGrams.toFixed(2)} g`;
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Init DOM Event Listeners
     */
    initEventListeners() {
        // Drag & Drop
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            window.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            });
            window.addEventListener('dragleave', (e) => {
                if (e.relatedTarget === null) {
                    dropZone.classList.remove('drag-active');
                }
            });
            window.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
        }

        // File Input Select
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        // 3D Canvas Click listener for Paint Mode or Measurement Mode
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.addEventListener('click', (e) => {
                if (this.paintMode) {
                    this.handlePaintClick(e);
                } else if (this.measureMode) {
                    this.handleMeasurementClick(e);
                }
            });
        }

        // Keyboard Shortcuts (Ctrl+Z Undo, Ctrl+Y Redo, Space Auto-Rotate, etc.)
        window.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    this.redoPaint();
                } else {
                    this.undoPaint();
                }
                e.preventDefault();
            } else if (isCtrl && e.key.toLowerCase() === 'y') {
                this.redoPaint();
                e.preventDefault();
            } else if (e.key === ' ') { // Space toggles auto rotation
                this.setAutoRotate(!this.isAutoRotating);
                const toggle = document.getElementById('toggle-autorotate');
                if (toggle) toggle.checked = this.isAutoRotating;
                const rotateDirGroup = document.getElementById('auto-rotate-dir-group');
                if (rotateDirGroup) rotateDirGroup.style.display = this.isAutoRotating ? 'block' : 'none';
            } else if (e.key.toLowerCase() === 'r' && !isCtrl) {
                this.resetCameraView();
            } else if (e.key.toLowerCase() === 'w' && !isCtrl) {
                const nextMode = this.currentRenderMode === 'wireframe' ? 'shaded' : 'wireframe';
                this.setRenderMode(nextMode);
                const select = document.getElementById('render-mode-select');
                if (select) select.value = nextMode;
            }
        });
    }

    handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.stl')) {
            alert('请上传 .stl 格式的 3D 模型文件 / Please upload an .stl file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadSTLBuffer(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Main Animation Render Loop
     */
    animate() {
        requestAnimationFrame(this.animate);

        this.controls.update();

        if (this.isAutoRotating && this.currentMesh) {
            const speed = this.autoRotateSpeed;
            const dir = this.autoRotateDirection;

            if (dir === 'x-cw') {
                const applyRot = (m) => {
                    if (m) m.rotateX(speed);
                };
                applyRot(this.currentMesh);
                applyRot(this.wireframeMesh);
                applyRot(this.edgesMesh);
                applyRot(this.pointsMesh);
                if (this.boundingBoxHelper) this.boundingBoxHelper.update();
            } else if (dir === 'z-cw') {
                const applyRot = (m) => {
                    if (m) m.rotateZ(speed);
                };
                applyRot(this.currentMesh);
                applyRot(this.wireframeMesh);
                applyRot(this.edgesMesh);
                applyRot(this.pointsMesh);
                if (this.boundingBoxHelper) this.boundingBoxHelper.update();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Global App Instance Variable
let appInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new STLViewerApp();
});

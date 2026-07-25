/**
 * Main WebGL Application & STL Viewer Controller
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

        // Clipping Plane
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
        this.clippingEnabled = false;

        // Materials
        this.materials = {};
        this.currentRenderMode = 'shaded';
        this.currentColor = '#3b82f6';

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

        // Auto Rotation
        this.isAutoRotating = false;

        this.initThree();
        this.initLights();
        this.initGridAndAxes();
        this.initEventListeners();

        // 恢复最早开局默认展示的模型: 工业精密齿轮 (Mechanical Gear)
        this.loadSample('gear');

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
     * Loads STL file ArrayBuffer into the 3D scene
     */
    loadSTLBuffer(buffer, fileName = "model.stl") {
        this.showLoading(true);

        setTimeout(() => {
            try {
                const startTime = performance.now();
                const parseResult = STLParser.parse(buffer);
                const parseTime = (performance.now() - startTime).toFixed(1);

                this.currentFileName = fileName;
                this.currentStats = parseResult.stats;

                // Build Three.js Geometry
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

                // Re-compute stats after centering
                geometry.computeBoundingBox();

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
     * Renders the processed Three.js geometry with materials
     */
    renderGeometry(geometry) {
        // Remove old mesh objects
        if (this.currentMesh) this.scene.remove(this.currentMesh);
        if (this.wireframeMesh) this.scene.remove(this.wireframeMesh);
        if (this.edgesMesh) this.scene.remove(this.edgesMesh);
        if (this.pointsMesh) this.scene.remove(this.pointsMesh);
        if (this.boundingBoxHelper) this.scene.remove(this.boundingBoxHelper);

        const hasVertexColors = !!(geometry.attributes.color);

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

        // Wireframe mesh
        const wireframeGeo = new THREE.WireframeGeometry(geometry);
        const wireframeMat = new THREE.LineBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.6,
            clippingPlanes: this.clippingEnabled ? [this.clippingPlane] : []
        });
        this.wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
        this.wireframeMesh.visible = false;
        this.scene.add(this.wireframeMesh);

        // Crisp CAD Edges Mesh
        const edgesGeo = new THREE.EdgesGeometry(geometry, 25);
        const edgesMat = new THREE.LineBasicMaterial({
            color: 0x1e293b,
            linewidth: 2,
            clippingPlanes: this.clippingEnabled ? [this.clippingPlane] : []
        });
        this.edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
        this.edgesMesh.visible = false;
        this.scene.add(this.edgesMesh);

        // Points mesh
        const pointsMat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 1.2,
            sizeAttenuation: true
        });
        this.pointsMesh = new THREE.Points(geometry, pointsMat);
        this.pointsMesh.visible = false;
        this.scene.add(this.pointsMesh);

        // Bounding Box Helper
        this.boundingBoxHelper = new THREE.BoxHelper(this.currentMesh, 0xef4444);
        this.boundingBoxHelper.visible = document.getElementById('toggle-bbox').checked;
        this.scene.add(this.boundingBoxHelper);

        // Update clipping plane slider max range based on model height
        geometry.computeBoundingBox();
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
     * Sets render mode (shaded, cad, wireframe, points, normal, xray, solid-wireframe)
     */
    setRenderMode(mode) {
        this.currentRenderMode = mode;
        if (!this.currentMesh) return;

        this.currentMesh.visible = true;
        this.wireframeMesh.visible = false;
        if (this.edgesMesh) this.edgesMesh.visible = false;
        this.pointsMesh.visible = false;

        const clipPlanes = this.clippingEnabled ? [this.clippingPlane] : [];
        const hasVertexColors = !!(this.currentMesh.geometry.attributes.color);

        switch (mode) {
            case 'shaded':
                this.currentMesh.material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : new THREE.Color(this.currentColor),
                    vertexColors: hasVertexColors,
                    roughness: 0.3,
                    metalness: 0.3,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                break;
            case 'cad':
                this.currentMesh.material = new THREE.MeshStandardMaterial({
                    color: hasVertexColors ? 0xffffff : new THREE.Color('#cbd5e1'),
                    vertexColors: hasVertexColors,
                    roughness: 0.5,
                    metalness: 0.1,
                    flatShading: true,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                if (this.edgesMesh) this.edgesMesh.visible = true;
                break;
            case 'wireframe':
                this.currentMesh.visible = false;
                this.wireframeMesh.visible = true;
                break;
            case 'points':
                this.currentMesh.visible = false;
                this.pointsMesh.visible = true;
                break;
            case 'normal':
                this.currentMesh.material = new THREE.MeshNormalMaterial({
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                break;
            case 'xray':
                this.currentMesh.material = new THREE.MeshPhysicalMaterial({
                    color: hasVertexColors ? 0xffffff : new THREE.Color(this.currentColor),
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
                    color: hasVertexColors ? 0xffffff : new THREE.Color(this.currentColor),
                    vertexColors: hasVertexColors,
                    roughness: 0.35,
                    metalness: 0.25,
                    side: THREE.DoubleSide,
                    clippingPlanes: clipPlanes
                });
                this.wireframeMesh.visible = true;
                break;
        }
    }

    /**
     * Updates model color
     */
    setModelColor(hexColor) {
        this.currentColor = hexColor;
        if (this.currentMesh && this.currentRenderMode !== 'normal') {
            this.setRenderMode(this.currentRenderMode);
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

                document.getElementById('measure-result-val').textContent = `${distance.toFixed(2)} mm`;
                document.getElementById('measure-info-box').style.display = 'block';
            } else if (this.measurePoints.length > 2) {
                // Reset for new measurement
                this.clearMeasurement();
                this.measureMarkers.push(marker);
                this.measurePoints.push(point);
                document.getElementById('measure-info-box').style.display = 'none';
            }
        }
    }

    clearMeasurement() {
        this.measureMarkers.forEach(m => this.scene.remove(m));
        if (this.measureLine) this.scene.remove(this.measureLine);
        this.measureMarkers = [];
        this.measurePoints = [];
        this.measureLine = null;
        document.getElementById('measure-info-box').style.display = 'none';
    }

    /**
     * Loads preset samples (Gear, Wukong, Eiffel Tower, Pop Monster, Rocket, Planetary Gearbox)
     */
    loadSample(sampleType) {
        let sample;
        if (sampleType === 'gear') {
            sample = SampleModels.getMechanicalGear();
        } else if (sampleType === 'wukong') {
            sample = SampleModels.getWukongFigurine();
        } else if (sampleType === 'eiffel') {
            sample = SampleModels.getEiffelTower();
        } else if (sampleType === 'pop-monster') {
            sample = SampleModels.getPopLabubuFigurine();
        } else if (sampleType === 'rocket') {
            sample = SampleModels.getSpaceRocket();
        } else if (sampleType === 'gearbox') {
            sample = SampleModels.getPlanetaryGearbox();
        }

        if (sample) {
            this.loadSTLBuffer(sample.buffer, sample.fileName);
        }
    }

    /**
     * Export canvas to high-res PNG screenshot
     */
    exportScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `stl_snapshot_${this.currentFileName || 'model'}_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    }

    /**
     * Updates Stats Panel & 3D Print Material Weight Estimator
     */
    updateUIStats(parseTimeMs) {
        if (!this.currentStats) return;
        const stats = this.currentStats;

        document.getElementById('stat-format').textContent = stats.format + (stats.hasColors ? ' (RGB Color)' : '');
        document.getElementById('stat-triangles').textContent = stats.triangleCount.toLocaleString();
        document.getElementById('stat-vertices').textContent = stats.vertexCount.toLocaleString();
        document.getElementById('stat-parse-time').textContent = `${parseTimeMs} ms`;

        // Dimensions
        const size = stats.boundingBox.size;
        document.getElementById('stat-size-x').textContent = `${size.x.toFixed(2)} mm`;
        document.getElementById('stat-size-y').textContent = `${size.y.toFixed(2)} mm`;
        document.getElementById('stat-size-z').textContent = `${size.z.toFixed(2)} mm`;

        // Volume & Surface Area
        const volumeCm3 = stats.volume / 1000.0;
        const areaCm2 = stats.surfaceArea / 100.0;

        document.getElementById('stat-volume').textContent = `${volumeCm3.toFixed(2)} cm³`;
        document.getElementById('stat-surface-area').textContent = `${areaCm2.toFixed(2)} cm²`;

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

        // File Input Select
        const fileInput = document.getElementById('file-input');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Measurement click listener
        this.renderer.domElement.addEventListener('click', (e) => this.handleMeasurementClick(e));

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === ' ') { // Space toggles auto rotation
                this.isAutoRotating = !this.isAutoRotating;
                document.getElementById('toggle-autorotate').checked = this.isAutoRotating;
            } else if (e.key.toLowerCase() === 'r') {
                this.resetCameraView();
            } else if (e.key.toLowerCase() === 'w') {
                const nextMode = this.currentRenderMode === 'wireframe' ? 'shaded' : 'wireframe';
                this.setRenderMode(nextMode);
                document.getElementById('render-mode-select').value = nextMode;
            }
        });
    }

    handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.stl')) {
            alert('请上传 .stl 格式的 3D 模型文件');
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
            this.currentMesh.rotation.y += 0.008;
            if (this.wireframeMesh) this.wireframeMesh.rotation.y += 0.008;
            if (this.edgesMesh) this.edgesMesh.rotation.y += 0.008;
            if (this.pointsMesh) this.pointsMesh.rotation.y += 0.008;
            if (this.boundingBoxHelper) this.boundingBoxHelper.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Global App Instance Variable
let appInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new STLViewerApp();
});

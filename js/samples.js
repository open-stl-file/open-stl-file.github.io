/**
 * Preset sample models generator for instant STL preview.
 * Converts Three.js geometries into standard Binary STL ArrayBuffers.
 */
class SampleModels {
    /**
     * Converts a Three.js BufferGeometry to a Binary STL ArrayBuffer.
     * @param {THREE.BufferGeometry} geometry 
     * @returns {ArrayBuffer}
     */
    static geometryToBinarySTL(geometry) {
        const nonIndexed = geometry.toNonIndexed();
        const posAttr = nonIndexed.getAttribute('position');
        const normAttr = nonIndexed.getAttribute('normal');

        const triangleCount = posAttr.count / 3;
        const bufferLength = 84 + triangleCount * 50;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const dataView = new DataView(arrayBuffer);

        // Write 80-byte header
        const headerStr = "STL Online Viewer Sample Model - Generated Procedurally";
        for (let i = 0; i < 80; i++) {
            dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 32);
        }

        // Write triangle count
        dataView.setUint32(80, triangleCount, true);

        let offset = 84;
        for (let i = 0; i < triangleCount; i++) {
            const i3 = i * 3;

            let nx = 0, ny = 0, nz = 0;
            if (normAttr) {
                nx = normAttr.getX(i3);
                ny = normAttr.getY(i3);
                nz = normAttr.getZ(i3);
            } else {
                const ax = posAttr.getX(i3 + 1) - posAttr.getX(i3);
                const ay = posAttr.getY(i3 + 1) - posAttr.getY(i3);
                const az = posAttr.getZ(i3 + 1) - posAttr.getZ(i3);
                const bx = posAttr.getX(i3 + 2) - posAttr.getX(i3);
                const by = posAttr.getY(i3 + 2) - posAttr.getY(i3);
                const bz = posAttr.getZ(i3 + 2) - posAttr.getZ(i3);
                nx = ay * bz - az * by;
                ny = az * bx - ax * bz;
                nz = ax * by - ay * bx;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                nx /= len; ny /= len; nz /= len;
            }

            // Normal
            dataView.setFloat32(offset, nx, true);
            dataView.setFloat32(offset + 4, ny, true);
            dataView.setFloat32(offset + 8, nz, true);

            // 3 Vertices
            for (let v = 0; v < 3; v++) {
                const vx = posAttr.getX(i3 + v);
                const vy = posAttr.getY(i3 + v);
                const vz = posAttr.getZ(i3 + v);
                dataView.setFloat32(offset + 12 + v * 12, vx, true);
                dataView.setFloat32(offset + 12 + v * 12 + 4, vy, true);
                dataView.setFloat32(offset + 12 + v * 12 + 8, vz, true);
            }

            dataView.setUint16(offset + 48, 0, true);
            offset += 50;
        }

        return arrayBuffer;
    }

    /**
     * Preset sample 1: 3D Calibration Cube (20mm x 20mm x 20mm)
     */
    static getCalibrationCube() {
        const geometry = new THREE.BoxGeometry(20, 20, 20, 4, 4, 4);
        geometry.center();
        return {
            name: "标准 20mm 校准立方体 (Calibration Cube)",
            fileName: "calibration_cube_20mm.stl",
            buffer: this.geometryToBinarySTL(geometry)
        };
    }

    /**
     * Preset sample 2: Mechanical Spur Gear
     */
    static getMechanicalGear() {
        const shape = new THREE.Shape();
        const teeth = 16;
        const outerRadius = 25;
        const innerRadius = 20;
        const holeRadius = 8;

        for (let i = 0; i < teeth; i++) {
            const angle1 = (i / teeth) * Math.PI * 2;
            const angle2 = ((i + 0.25) / teeth) * Math.PI * 2;
            const angle3 = ((i + 0.5) / teeth) * Math.PI * 2;
            const angle4 = ((i + 0.75) / teeth) * Math.PI * 2;

            if (i === 0) {
                shape.moveTo(Math.cos(angle1) * innerRadius, Math.sin(angle1) * innerRadius);
            }
            shape.lineTo(Math.cos(angle2) * outerRadius, Math.sin(angle2) * outerRadius);
            shape.lineTo(Math.cos(angle3) * outerRadius, Math.sin(angle3) * outerRadius);
            shape.lineTo(Math.cos(angle4) * innerRadius, Math.sin(angle4) * innerRadius);
        }

        const holePath = new THREE.Path();
        holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);

        const extrudeSettings = {
            depth: 8,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 1,
            bevelThickness: 1
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.center();

        return {
            name: "工业精密齿轮 (Mechanical Spur Gear)",
            fileName: "mechanical_gear_16t.stl",
            buffer: this.geometryToBinarySTL(geometry)
        };
    }

    /**
     * Preset sample 3: Twisted Torus Knot Sculpture
     */
    static getTorusKnot() {
        const geometry = new THREE.TorusKnotGeometry(15, 4.5, 120, 24, 2, 3);
        geometry.center();
        return {
            name: "环形扭结雕塑 (Torus Knot Sculpture)",
            fileName: "torus_knot_art.stl",
            buffer: this.geometryToBinarySTL(geometry)
        };
    }
}

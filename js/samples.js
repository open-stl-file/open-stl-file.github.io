/**
 * Preset sample models generator.
 * Features 3 models: Möbius Strip Sculpture, Temple of Heaven, and Mechanical Spur Gear.
 * Supports English & Chinese localized model titles.
 */
class SampleModels {
    /**
     * Helper to merge multiple Three.js geometries and assign distinct RGB Vertex Colors per part.
     * @param {Array<{geo: THREE.BufferGeometry, color: Array<number>}>} partsList 
     */
    static mergeGeometriesWithColors(partsList) {
        const posList = [];
        const normList = [];
        const colList = [];

        partsList.forEach(({ geo, color }) => {
            const nonIndexed = geo.toNonIndexed();
            const pos = nonIndexed.getAttribute('position');
            const norm = nonIndexed.getAttribute('normal');

            const [r, g, b] = color || [0.7, 0.7, 0.7];

            for (let i = 0; i < pos.count; i++) {
                posList.push(pos.getX(i), pos.getY(i), pos.getZ(i));
                if (norm) {
                    normList.push(norm.getX(i), norm.getY(i), norm.getZ(i));
                } else {
                    normList.push(0, 1, 0);
                }
                colList.push(r, g, b);
            }
        });

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3));
        merged.setAttribute('normal', new THREE.Float32BufferAttribute(normList, 3));
        merged.setAttribute('color', new THREE.Float32BufferAttribute(colList, 3));
        return merged;
    }

    /**
     * Converts a Three.js BufferGeometry to a Binary STL ArrayBuffer with 15-bit RGB color attributes per face.
     * @param {THREE.BufferGeometry} geometry 
     * @returns {ArrayBuffer}
     */
    static geometryToBinarySTL(geometry) {
        const nonIndexed = geometry.toNonIndexed();
        const posAttr = nonIndexed.getAttribute('position');
        const normAttr = nonIndexed.getAttribute('normal');
        const colAttr = nonIndexed.getAttribute('color');

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

            // Write 15-bit RGB color in 2-byte attribute
            let attrVal = 0;
            if (colAttr) {
                const r5 = Math.floor(colAttr.getX(i3) * 31);
                const g5 = Math.floor(colAttr.getY(i3) * 31);
                const b5 = Math.floor(colAttr.getZ(i3) * 31);
                attrVal = 0x8000 | (r5 << 10) | (g5 << 5) | b5;
            }

            dataView.setUint16(offset + 48, attrVal, true);
            offset += 50;
        }

        return arrayBuffer;
    }

    /**
     * 1. Möbius Strip Sculpture
     */
    static getMobiusStrip() {
        const parts = [];

        const base = new THREE.CylinderGeometry(14, 16, 3, 32);
        base.translate(0, 1.5, 0);
        parts.push({ geo: base, color: [0.15, 0.18, 0.22] });

        const mobiusGeo = new THREE.TorusKnotGeometry(16, 4.5, 120, 24, 2, 3);
        mobiusGeo.center();
        mobiusGeo.translate(0, 22, 0);

        parts.push({ geo: mobiusGeo, color: [0.06, 0.72, 0.85] });

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        const isZh = document.documentElement.lang.startsWith('zh');
        return {
            name: isZh ? "莫比乌斯环艺术雕塑 (Möbius Strip Sculpture)" : "Möbius Strip Sculpture",
            fileName: "mobius_strip_art.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 2. Temple of Heaven
     */
    static getTempleOfHeaven() {
        const parts = [];

        const MARBLE_WHITE = [0.92, 0.94, 0.96];
        const IMPERIAL_RED = [0.85, 0.15, 0.15];
        const ROYAL_BLUE = [0.12, 0.35, 0.75];
        const GOLD_FINIAL = [0.95, 0.78, 0.15];

        const base1 = new THREE.CylinderGeometry(28, 30, 3.5, 32);
        base1.translate(0, 1.75, 0);
        const base2 = new THREE.CylinderGeometry(23, 25, 3.0, 32);
        base2.translate(0, 5, 0);
        const base3 = new THREE.CylinderGeometry(18, 20, 2.5, 32);
        base3.translate(0, 7.75, 0);

        parts.push(
            { geo: base1, color: MARBLE_WHITE },
            { geo: base2, color: MARBLE_WHITE },
            { geo: base3, color: MARBLE_WHITE }
        );

        const room1 = new THREE.CylinderGeometry(14, 15, 7, 24);
        room1.translate(0, 12.5, 0);
        const eaves1 = new THREE.ConeGeometry(22, 5, 24);
        eaves1.translate(0, 17, 0);
        parts.push({ geo: room1, color: IMPERIAL_RED }, { geo: eaves1, color: ROYAL_BLUE });

        const room2 = new THREE.CylinderGeometry(11, 12, 6, 24);
        room2.translate(0, 21, 0);
        const eaves2 = new THREE.ConeGeometry(17, 4.5, 24);
        eaves2.translate(0, 25, 0);
        parts.push({ geo: room2, color: IMPERIAL_RED }, { geo: eaves2, color: ROYAL_BLUE });

        const room3 = new THREE.CylinderGeometry(8, 8.5, 5, 24);
        room3.translate(0, 28.5, 0);
        const eaves3 = new THREE.ConeGeometry(12, 6, 24);
        eaves3.translate(0, 33, 0);
        parts.push({ geo: room3, color: IMPERIAL_RED }, { geo: eaves3, color: ROYAL_BLUE });

        const finialBase = new THREE.CylinderGeometry(2, 3, 2.5, 16);
        finialBase.translate(0, 37, 0);
        const finialSphere = new THREE.SphereGeometry(2.5, 16, 16);
        finialSphere.translate(0, 39.5, 0);
        parts.push({ geo: finialBase, color: GOLD_FINIAL }, { geo: finialSphere, color: GOLD_FINIAL });

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        const isZh = document.documentElement.lang.startsWith('zh');
        return {
            name: isZh ? "北京天坛祈年殿 (Temple of Heaven)" : "Temple of Heaven (Beijing)",
            fileName: "temple_of_heaven_beijing.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 3. Mechanical Spur Gear
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

        const isZh = document.documentElement.lang.startsWith('zh');
        return {
            name: isZh ? "工业精密齿轮 (Mechanical Spur Gear)" : "Mechanical Spur Gear",
            fileName: "mechanical_gear_16t.stl",
            buffer: this.geometryToBinarySTL(geometry)
        };
    }
}

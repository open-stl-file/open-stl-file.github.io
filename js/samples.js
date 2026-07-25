/**
 * Preset sample models generator with hyper-authentic real-world architectural details.
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

            const [r, g, b] = color || [0.72, 0.74, 0.78];

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
        const headerStr = "STL Online Viewer Eiffel Tower Authentic Model - Generated Procedurally";
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
     * 1. 真实比例精细化: 法国巴黎埃菲尔铁塔 (Hyper-Authentic Real-World Eiffel Tower Model)
     * Faithfully models the 4 flared lattice piers, grand arches, 1st & 2nd platform balconies,
     * upper merged lattice spire, 3rd level observation hall, dome & beacon antenna.
     */
    static getEiffelTower() {
        const parts = [];

        // Realistic Eiffel Brown Metallic Palette
        const EIFFEL_BRONZE = [0.45, 0.42, 0.4];     // 埃菲尔专用古铜棕褐色
        const STEEL_TRUSS = [0.65, 0.62, 0.6];       // 桁架网格梁
        const PLATFORM_DARK = [0.25, 0.23, 0.22];    // 观景台与基座
        const GOLD_BEACON = [0.95, 0.8, 0.2];        // 塔顶大灯与避雷针

        // ----------------------------------------------------
        // 1. Concrete Pedestals (4 大独立混凝土基座)
        // ----------------------------------------------------
        const legCenters = [
            { x: -18, z: -18, rotY: Math.PI / 4 },
            { x: 18, z: -18, rotY: -Math.PI / 4 },
            { x: -18, z: 18, rotY: (3 * Math.PI) / 4 },
            { x: 18, z: 18, rotY: -(3 * Math.PI) / 4 }
        ];

        legCenters.forEach(leg => {
            const pedestal = new THREE.BoxGeometry(7, 3, 7);
            pedestal.translate(leg.x, 1.5, leg.z);
            parts.push({ geo: pedestal, color: PLATFORM_DARK });
        });

        // ----------------------------------------------------
        // 2. Base Tier: 4 Angled Flared Piers with Double Beams (第一层四大内倾斜桁架网格腿)
        // ----------------------------------------------------
        legCenters.forEach(leg => {
            const sx = Math.sign(leg.x);
            const sz = Math.sign(leg.z);

            // Double Main Corner Beams per Leg
            for (let offsetSide = -1.8; offsetSide <= 1.8; offsetSide += 3.6) {
                const beamGeo = new THREE.CylinderGeometry(1.6, 2.5, 24, 4);
                beamGeo.rotateY(leg.rotY);
                beamGeo.rotateX(-sz * 0.32);
                beamGeo.rotateZ(sx * 0.32);
                beamGeo.translate(leg.x * 0.72 + (leg.z > 0 ? offsetSide * 0.4 : -offsetSide * 0.4), 13, leg.z * 0.72 + (leg.x > 0 ? -offsetSide * 0.4 : offsetSide * 0.4));
                parts.push({ geo: beamGeo, color: EIFFEL_BRONZE });
            }

            // Cross Lattice Braces along each pier (腿身 X 交叉网格加固梁)
            for (let h = 4; h <= 20; h += 4) {
                const factor = 1 - h / 45;
                const braceX = new THREE.BoxGeometry(0.6, 0.6, 6.5 * factor);
                braceX.rotateY(leg.rotY + Math.PI / 4);
                braceX.translate(leg.x * factor, h, leg.z * factor);

                const braceY = new THREE.BoxGeometry(0.6, 0.6, 6.5 * factor);
                braceY.rotateY(leg.rotY - Math.PI / 4);
                braceY.translate(leg.x * factor, h, leg.z * factor);

                parts.push({ geo: braceX, color: STEEL_TRUSS }, { geo: braceY, color: STEEL_TRUSS });
            }
        });

        // ----------------------------------------------------
        // 3. Grand Double-Curved Decorative Arches (四大底层半圆跨度拱门与双重拱券)
        // ----------------------------------------------------
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;

            // Outer Structural Arch
            const outerArch = new THREE.TorusGeometry(13.5, 1.4, 8, 20, Math.PI);
            outerArch.rotateY(angle);
            outerArch.translate(0, 13, 0);

            // Inner Decorative Arch Frieze
            const innerArch = new THREE.TorusGeometry(12.0, 0.8, 8, 20, Math.PI);
            innerArch.rotateY(angle);
            innerArch.translate(0, 13, 0);

            parts.push({ geo: outerArch, color: EIFFEL_BRONZE }, { geo: innerArch, color: STEEL_TRUSS });
        }

        // ----------------------------------------------------
        // 4. First Platform & Double Frieze Balcony (第一层双层观景大平台与栏杆 - 57m 比例)
        // ----------------------------------------------------
        const plat1Base = new THREE.BoxGeometry(30, 2.5, 30);
        plat1Base.translate(0, 23.5, 0);

        const plat1Frieze = new THREE.BoxGeometry(32, 1.2, 32);
        plat1Frieze.translate(0, 25, 0);

        // Balcony Railings & Pavilions
        const plat1Railing = new THREE.BoxGeometry(32.8, 1.5, 32.8);
        plat1Railing.translate(0, 26.2, 0);

        parts.push(
            { geo: plat1Base, color: PLATFORM_DARK },
            { geo: plat1Frieze, color: EIFFEL_BRONZE },
            { geo: plat1Railing, color: STEEL_TRUSS }
        );

        // ----------------------------------------------------
        // 5. Middle Section: Tapered Legs & Dense Lattice Girders (第二层塔身 - 115m 比例)
        // ----------------------------------------------------
        const midLegs = new THREE.CylinderGeometry(8.5, 12.5, 26, 4);
        midLegs.rotateY(Math.PI / 4);
        midLegs.translate(0, 38.5, 0);
        parts.push({ geo: midLegs, color: EIFFEL_BRONZE });

        // Horizontal Lattice Truss Rings on Middle Section
        for (let y = 28; y <= 50; y += 4.5) {
            const w = 24 - (y - 25) * 0.55;
            const trussRing = new THREE.BoxGeometry(w, 0.9, w);
            trussRing.translate(0, y, 0);
            parts.push({ geo: trussRing, color: STEEL_TRUSS });
        }

        // ----------------------------------------------------
        // 6. Second Platform & Observation Deck (第二层露天双层观景台)
        // ----------------------------------------------------
        const plat2Base = new THREE.BoxGeometry(18, 2, 18);
        plat2Base.translate(0, 52, 0);

        const plat2Deck = new THREE.BoxGeometry(19.5, 1.0, 19.5);
        plat2Deck.translate(0, 53.2, 0);

        parts.push({ geo: plat2Base, color: PLATFORM_DARK }, { geo: plat2Deck, color: EIFFEL_BRONZE });

        // ----------------------------------------------------
        // 7. Upper Tower: Merged Slender Tapered Lattice Column (第三层高耸融合单塔 - 276m 比例)
        // ----------------------------------------------------
        const upperSpire = new THREE.CylinderGeometry(3.0, 8.2, 42, 4);
        upperSpire.rotateY(Math.PI / 4);
        upperSpire.translate(0, 74.5, 0);
        parts.push({ geo: upperSpire, color: EIFFEL_BRONZE });

        // 10 Dense Horizontal Truss Reinforcement Belts
        for (let y = 55; y <= 94; y += 4) {
            const w = 15 - (y - 54) * 0.3;
            const belt = new THREE.BoxGeometry(w, 0.7, w);
            belt.translate(0, y, 0);
            parts.push({ geo: belt, color: STEEL_TRUSS });
        }

        // ----------------------------------------------------
        // 8. Third Level Double-Deck Observation Hall (第三层双层室内观景大厅)
        // ----------------------------------------------------
        const hallLevel1 = new THREE.CylinderGeometry(4.2, 4.2, 3.5, 16);
        hallLevel1.translate(0, 97, 0);

        const hallLevel2 = new THREE.CylinderGeometry(3.5, 3.5, 3.0, 16);
        hallLevel2.translate(0, 100, 0);

        parts.push({ geo: hallLevel1, color: PLATFORM_DARK }, { geo: hallLevel2, color: EIFFEL_BRONZE });

        // ----------------------------------------------------
        // 9. Top Dome, Light Beacon & Antenna (顶尖灯塔、弧形圆顶与双重天线 - 330m 比例)
        // ----------------------------------------------------
        const topDome = new THREE.SphereGeometry(3.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        topDome.translate(0, 101.5, 0);

        // Light Beacon Dome (探照灯塔)
        const beacon = new THREE.CylinderGeometry(1.8, 2.5, 4, 16);
        beacon.translate(0, 104.5, 0);

        // High Antenna Mast & Lightning Rod (避雷针主天线)
        const mast = new THREE.CylinderGeometry(0.5, 1.2, 16, 12);
        mast.translate(0, 114.5, 0);

        const antennaTip = new THREE.SphereGeometry(1.0, 12, 12);
        antennaTip.translate(0, 123, 0);

        parts.push(
            { geo: topDome, color: STEEL_TRUSS },
            { geo: beacon, color: GOLD_BEACON },
            { geo: mast, color: EIFFEL_BRONZE },
            { geo: antennaTip, color: GOLD_BEACON }
        );

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "法国巴黎埃菲尔铁塔 (Real Eiffel Tower 330m Ratio)",
            fileName: "eiffel_tower_authentic.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 2. 《黑神话：悟空》齐天大圣完整战甲模型 (Black Myth Wukong Figurine)
     */
    static getWukongFigurine() {
        const parts = [];

        const BRONZE_GOLD = [0.85, 0.65, 0.25];
        const DARK_ARMOR = [0.22, 0.2, 0.25];
        const RED_CLOTH = [0.65, 0.15, 0.15];
        const PEACOCK_GREEN = [0.1, 0.55, 0.4];
        const MONKEY_FUR = [0.55, 0.42, 0.3];
        const ROD_WOOD = [0.28, 0.2, 0.15];
        const CYAN_CORE = [0.05, 0.85, 0.95];

        const pedestal = new THREE.CylinderGeometry(18, 22, 5, 24);
        pedestal.translate(0, 2.5, 0);
        parts.push({ geo: pedestal, color: DARK_ARMOR });

        const bootL = new THREE.CylinderGeometry(3.5, 2.8, 12, 16);
        bootL.translate(-5.5, 9, 0);
        const bootR = new THREE.CylinderGeometry(3.5, 2.8, 12, 16);
        bootR.translate(5.5, 9, 0);
        parts.push({ geo: bootL, color: BRONZE_GOLD }, { geo: bootR, color: BRONZE_GOLD });

        const skirtOuter = new THREE.ConeGeometry(12, 16, 16, 1, true);
        skirtOuter.translate(0, 17, 0);
        const skirtInner = new THREE.ConeGeometry(11, 14, 16, 1, true);
        skirtInner.translate(0, 16, 0);
        parts.push({ geo: skirtOuter, color: BRONZE_GOLD }, { geo: skirtInner, color: RED_CLOTH });

        const chestCuirass = new THREE.CylinderGeometry(8, 6.5, 14, 16);
        chestCuirass.translate(0, 26, 0);
        parts.push({ geo: chestCuirass, color: DARK_ARMOR });

        const plateL = new THREE.SphereGeometry(3, 12, 12);
        plateL.scale(1, 1, 0.4);
        plateL.translate(-3.5, 28, 6.5);
        const plateR = new THREE.SphereGeometry(3, 12, 12);
        plateR.scale(1, 1, 0.4);
        plateR.translate(3.5, 28, 6.5);
        const redRibbonNode = new THREE.TorusGeometry(3.5, 0.6, 8, 16);
        redRibbonNode.translate(0, 27, 7);
        parts.push({ geo: plateL, color: BRONZE_GOLD }, { geo: plateR, color: BRONZE_GOLD }, { geo: redRibbonNode, color: RED_CLOTH });

        const shoulderL = new THREE.SphereGeometry(5.5, 16, 16);
        shoulderL.scale(1.2, 0.8, 1.1);
        shoulderL.translate(-9, 31, 0);
        const hornL = new THREE.ConeGeometry(2, 6, 12);
        hornL.rotateZ(Math.PI / 4);
        hornL.translate(-12, 34, 0);

        const shoulderR = new THREE.SphereGeometry(5.5, 16, 16);
        shoulderR.scale(1.2, 0.8, 1.1);
        shoulderR.translate(9, 31, 0);
        const hornR = new THREE.ConeGeometry(2, 6, 12);
        hornR.rotateZ(-Math.PI / 4);
        hornR.translate(12, 34, 0);

        parts.push({ geo: shoulderL, color: BRONZE_GOLD }, { geo: hornL, color: BRONZE_GOLD }, { geo: shoulderR, color: BRONZE_GOLD }, { geo: hornR, color: BRONZE_GOLD });

        const innerSkeleton = new THREE.CylinderGeometry(2, 2, 22, 12);
        innerSkeleton.translate(0, 24, 0);
        const innerCore = new THREE.SphereGeometry(4, 16, 16);
        innerCore.translate(0, 26, 0);
        parts.push({ geo: innerSkeleton, color: DARK_ARMOR }, { geo: innerCore, color: CYAN_CORE });

        const head = new THREE.SphereGeometry(7, 24, 24);
        head.translate(0, 39, 0);
        const maneCollar = new THREE.TorusGeometry(7.5, 1.8, 12, 24);
        maneCollar.rotateX(Math.PI / 2);
        maneCollar.translate(0, 36, 0);
        parts.push({ geo: head, color: MONKEY_FUR }, { geo: maneCollar, color: MONKEY_FUR });

        const crownBase = new THREE.CylinderGeometry(5.5, 6.5, 4, 16);
        crownBase.translate(0, 43, 0);
        const crownRim = new THREE.TorusGeometry(6.5, 0.8, 12, 24);
        crownRim.rotateX(Math.PI / 2);
        crownRim.translate(0, 44, 0);
        parts.push({ geo: crownBase, color: BRONZE_GOLD }, { geo: crownRim, color: BRONZE_GOLD });

        for (let side = -1; side <= 1; side += 2) {
            const plumeStem = new THREE.CylinderGeometry(0.5, 1.0, 18, 12);
            plumeStem.rotateZ(side * Math.PI / 12);
            plumeStem.translate(side * 2.5, 52, -1);

            const plumeTip = new THREE.ConeGeometry(2.0, 12, 12);
            plumeTip.rotateZ(side * Math.PI / 10);
            plumeTip.translate(side * 4, 65, -2);

            parts.push({ geo: plumeStem, color: BRONZE_GOLD }, { geo: plumeTip, color: PEACOCK_GREEN });
        }

        const rodShaft = new THREE.CylinderGeometry(1.2, 1.2, 70, 16);
        rodShaft.rotateZ(-Math.PI / 4);
        rodShaft.translate(-2, 20, 10);

        const capTop = new THREE.CylinderGeometry(2.2, 1.8, 8, 16);
        capTop.rotateZ(-Math.PI / 4);
        capTop.translate(22, 44, 10);

        const capBottom = new THREE.CylinderGeometry(1.8, 2.5, 10, 16);
        capBottom.rotateZ(-Math.PI / 4);
        capBottom.translate(-26, -4, 10);

        parts.push({ geo: rodShaft, color: ROD_WOOD }, { geo: capTop, color: BRONZE_GOLD }, { geo: capBottom, color: BRONZE_GOLD });

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "黑神话：齐天大圣 (Black Myth Wukong - Official Armor)",
            fileName: "black_myth_wukong_official.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 3. 潮玩盲盒怪兽手办 (Pop Monster Figurine)
     */
    static getPopLabubuFigurine() {
        const parts = [];

        const PURPLE = [0.65, 0.3, 0.95];
        const PINK = [0.95, 0.35, 0.65];
        const CYAN = [0.05, 0.85, 0.95];
        const WHITE = [0.95, 0.95, 0.98];
        const BLACK = [0.1, 0.1, 0.12];

        const base = new THREE.CylinderGeometry(16, 19, 4, 32);
        base.translate(0, 2, 0);
        parts.push({ geo: base, color: BLACK });

        const body = new THREE.SphereGeometry(10.5, 24, 24);
        body.scale(1, 1.25, 0.95);
        body.translate(0, 16.5, 0);
        parts.push({ geo: body, color: PURPLE });

        const belly = new THREE.SphereGeometry(7, 16, 16);
        belly.scale(1, 1.1, 0.4);
        belly.translate(0, 16, 7);
        parts.push({ geo: belly, color: PINK });

        const innerCore = new THREE.SphereGeometry(5.5, 16, 16);
        innerCore.translate(0, 16, 0);
        parts.push({ geo: innerCore, color: CYAN });

        const head = new THREE.SphereGeometry(13.5, 24, 24);
        head.scale(1.1, 1, 1);
        head.translate(0, 32, 0);
        parts.push({ geo: head, color: PURPLE });

        const earL = new THREE.ConeGeometry(4, 20, 16);
        earL.rotateZ(Math.PI / 9);
        earL.translate(-7.5, 47, 0);
        const earR = new THREE.ConeGeometry(4, 20, 16);
        earR.rotateZ(-Math.PI / 9);
        earR.translate(7.5, 47, 0);
        parts.push({ geo: earL, color: PINK }, { geo: earR, color: PINK });

        const mouth = new THREE.TorusGeometry(6.5, 1.0, 8, 16, Math.PI);
        mouth.rotateX(Math.PI);
        mouth.translate(0, 30, 12.5);
        parts.push({ geo: mouth, color: WHITE });

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "潮玩盲盒怪兽手办 (Pop Monster Figurine)",
            fileName: "pop_monster_labubu.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 4. 赛博星际航天火箭 (Cyber Rocket & Tower)
     */
    static getSpaceRocket() {
        const parts = [];

        const TITANIUM = [0.8, 0.85, 0.9];
        const RED_STRIPE = [0.9, 0.2, 0.2];
        const BLUE_TANK = [0.2, 0.5, 0.95];
        const ORANGE_TANK = [0.95, 0.5, 0.1];
        const GOLD_SATELLITE = [1.0, 0.8, 0.2];
        const TOWER_GREY = [0.3, 0.35, 0.4];

        const towerMain = new THREE.BoxGeometry(8, 60, 8);
        towerMain.translate(-16, 30, -10);
        parts.push({ geo: towerMain, color: TOWER_GREY });

        const mainBody = new THREE.CylinderGeometry(7, 7, 42, 24);
        mainBody.translate(0, 26, 0);
        parts.push({ geo: mainBody, color: TITANIUM });

        const redBand = new THREE.TorusGeometry(7.1, 0.5, 8, 24);
        redBand.rotateX(Math.PI / 2);
        redBand.translate(0, 38, 0);
        parts.push({ geo: redBand, color: RED_STRIPE });

        const fairing = new THREE.ConeGeometry(7, 16, 24);
        fairing.translate(0, 55, 0);
        parts.push({ geo: fairing, color: TITANIUM });

        const oxyTank = new THREE.SphereGeometry(5.8, 20, 20);
        oxyTank.scale(1, 1.4, 1);
        oxyTank.translate(0, 37, 0);

        const fuelTank = new THREE.SphereGeometry(5.8, 20, 20);
        fuelTank.scale(1, 1.4, 1);
        fuelTank.translate(0, 21, 0);

        const satellite = new THREE.OctahedronGeometry(3.5);
        satellite.translate(0, 52, 0);

        parts.push(
            { geo: oxyTank, color: BLUE_TANK },
            { geo: fuelTank, color: ORANGE_TANK },
            { geo: satellite, color: GOLD_SATELLITE }
        );

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "赛博航天火箭与发射塔 (Cyber Rocket & Tower)",
            fileName: "cyber_starship_rocket.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }

    /**
     * 5. 行星齿轮减速机 (Planetary Gearbox Engine)
     */
    static getPlanetaryGearbox() {
        const parts = [];

        const PURPLE_CASING = [0.4, 0.2, 0.7];
        const GOLD_SUN = [0.95, 0.75, 0.15];
        const CYAN_PLANET = [0.1, 0.8, 0.9];
        const STEEL_SHAFT = [0.8, 0.85, 0.9];

        const outerCasing = new THREE.CylinderGeometry(20, 20, 12, 32);
        outerCasing.translate(0, 6, 0);
        parts.push({ geo: outerCasing, color: PURPLE_CASING });

        const sunGear = new THREE.CylinderGeometry(5, 5, 10, 12);
        sunGear.translate(0, 6, 0);
        parts.push({ geo: sunGear, color: GOLD_SUN });

        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const px = Math.cos(angle) * 11;
            const pz = Math.sin(angle) * 11;

            const planetGear = new THREE.CylinderGeometry(4.5, 4.5, 10, 10);
            planetGear.translate(px, 6, pz);
            parts.push({ geo: planetGear, color: CYAN_PLANET });
        }

        const shaft = new THREE.CylinderGeometry(2.5, 2.5, 22, 16);
        shaft.translate(0, 6, 0);
        parts.push({ geo: shaft, color: STEEL_SHAFT });

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "行星齿轮减速机 (Planetary Gearbox Engine)",
            fileName: "planetary_gearbox_multi.stl",
            buffer: this.geometryToBinarySTL(merged)
        };
    }
}

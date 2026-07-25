/**
 * Preset sample models generator.
 * Features a detailed Black Myth Wukong model matching the user's reference image,
 * along with Eiffel Tower, Labubu Pop Monster, Cyber Rocket, and Planetary Gearbox.
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
        const headerStr = "STL Online Viewer Black Myth Wukong - Generated Procedurally";
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
     * 1. 《黑神话：悟空》齐天大圣完整战甲模型 (Black Myth Wukong Figurine - Matching Reference Image)
     * Recreates Sun Wukong with Phoenix Crown, Peacock Feathers, Dragon Shoulder Armor, Layered Armor Skirt & Golden Rod.
     */
    static getWukongFigurine() {
        const parts = [];

        // Exact Palette matching user's Black Myth Wukong reference image
        const BRONZE_GOLD = [0.85, 0.65, 0.25];   // 锁子黄金甲 / 金冠 / 龙首护肩
        const DARK_ARMOR = [0.22, 0.2, 0.25];     // 山文甲胸甲 / 暗色皮甲
        const RED_CLOTH = [0.65, 0.15, 0.15];     // 战裙红衬 / 绳结
        const PEACOCK_GREEN = [0.1, 0.55, 0.4];  // 凤翅紫金冠 - 孔雀雉翎羽毛
        const MONKEY_FUR = [0.55, 0.42, 0.3];    // 猴毛 / 面部美猴王毛发
        const ROD_WOOD = [0.28, 0.2, 0.15];      // 如意金箍棒暗木色棍身
        const CYAN_CORE = [0.05, 0.85, 0.95];    // 内部发光灵石核心 (透视/剖切可见)

        // Ornate Base Pedestal (祥云石雕底座)
        const pedestal = new THREE.CylinderGeometry(18, 22, 5, 24);
        pedestal.translate(0, 2.5, 0);
        parts.push({ geo: pedestal, color: DARK_ARMOR });

        // Armored Boots & Legs (战靴与胫甲)
        const bootL = new THREE.CylinderGeometry(3.5, 2.8, 12, 16);
        bootL.translate(-5.5, 9, 0);
        const bootR = new THREE.CylinderGeometry(3.5, 2.8, 12, 16);
        bootR.translate(5.5, 9, 0);
        parts.push({ geo: bootL, color: BRONZE_GOLD }, { geo: bootR, color: BRONZE_GOLD });

        // Layered Armor Skirt (战裙与腿裙 - 贴合参考图)
        const skirtOuter = new THREE.ConeGeometry(12, 16, 16, 1, true);
        skirtOuter.translate(0, 17, 0);
        const skirtInner = new THREE.ConeGeometry(11, 14, 16, 1, true);
        skirtInner.translate(0, 16, 0);

        parts.push({ geo: skirtOuter, color: BRONZE_GOLD }, { geo: skirtInner, color: RED_CLOTH });

        // Main Mountain-Pattern Chest Armor (山文黄金锁子甲)
        const chestCuirass = new THREE.CylinderGeometry(8, 6.5, 14, 16);
        chestCuirass.translate(0, 26, 0);
        parts.push({ geo: chestCuirass, color: DARK_ARMOR });

        // Breastplate Gold Plates & Red Tassel Ribbons (胸前金盘与红绳结)
        const plateL = new THREE.SphereGeometry(3, 12, 12);
        plateL.scale(1, 1, 0.4);
        plateL.translate(-3.5, 28, 6.5);

        const plateR = new THREE.SphereGeometry(3, 12, 12);
        plateR.scale(1, 1, 0.4);
        plateR.translate(3.5, 28, 6.5);

        const redRibbonNode = new THREE.TorusGeometry(3.5, 0.6, 8, 16);
        redRibbonNode.translate(0, 27, 7);

        parts.push({ geo: plateL, color: BRONZE_GOLD }, { geo: plateR, color: BRONZE_GOLD }, { geo: redRibbonNode, color: RED_CLOTH });

        // Dragon Head Beast Shoulder Pauldrons (双肩龙首/兽面护肩 - 贴合参考图)
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

        // INTERNAL STRUCTURE: Inner Glowing Energy Core (内部灵石核心 - 剖切可见)
        const innerSkeleton = new THREE.CylinderGeometry(2, 2, 22, 12);
        innerSkeleton.translate(0, 24, 0);
        const innerCore = new THREE.SphereGeometry(4, 16, 16);
        innerCore.translate(0, 26, 0);
        parts.push({ geo: innerSkeleton, color: DARK_ARMOR }, { geo: innerCore, color: CYAN_CORE });

        // Monkey King Head & Mane Fur (齐天大圣头部美猴王美发)
        const head = new THREE.SphereGeometry(7, 24, 24);
        head.translate(0, 39, 0);
        const maneCollar = new THREE.TorusGeometry(7.5, 1.8, 12, 24);
        maneCollar.rotateX(Math.PI / 2);
        maneCollar.translate(0, 36, 0);

        parts.push({ geo: head, color: MONKEY_FUR }, { geo: maneCollar, color: MONKEY_FUR });

        // Phoenix Crown Filigree (凤翅紫金冠 - 金冠底座)
        const crownBase = new THREE.CylinderGeometry(5.5, 6.5, 4, 16);
        crownBase.translate(0, 43, 0);
        const crownRim = new THREE.TorusGeometry(6.5, 0.8, 12, 24);
        crownRim.rotateX(Math.PI / 2);
        crownRim.translate(0, 44, 0);

        parts.push({ geo: crownBase, color: BRONZE_GOLD }, { geo: crownRim, color: BRONZE_GOLD });

        // Peacock Feather Plumes (凤翅紫金冠 - 孔雀雉翎 - 贴合参考图 2 根高耸绿雉羽)
        for (let side = -1; side <= 1; side += 2) {
            const plumeStem = new THREE.CylinderGeometry(0.5, 1.0, 18, 12);
            plumeStem.rotateZ(side * Math.PI / 12);
            plumeStem.translate(side * 2.5, 52, -1);

            const plumeTip = new THREE.ConeGeometry(2.0, 12, 12);
            plumeTip.rotateZ(side * Math.PI / 10);
            plumeTip.translate(side * 4, 65, -2);

            parts.push({ geo: plumeStem, color: BRONZE_GOLD }, { geo: plumeTip, color: PEACOCK_GREEN });
        }

        // Ruyi Jingu Bang (如意金箍棒 - 贴合参考图：右臂斜握持棒，棒身伸向斜下方)
        const rodShaft = new THREE.CylinderGeometry(1.2, 1.2, 70, 16);
        rodShaft.rotateZ(-Math.PI / 4);
        rodShaft.translate(-2, 20, 10);

        // Dragon Carved Golden Caps on both ends of Jingu Bang (两端龙纹金箍)
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
     * 2. 巴黎埃菲尔铁塔 (Eiffel Tower Model)
     */
    static getEiffelTower() {
        const parts = [];
        const STEEL_GREY = [0.72, 0.74, 0.78];
        const DARK_STEEL = [0.45, 0.48, 0.52];
        const PLATFORM_GREY = [0.35, 0.38, 0.42];

        const legPositions = [
            { x: -16, z: -16, angle: Math.PI / 4 },
            { x: 16, z: -16, angle: -Math.PI / 4 },
            { x: -16, z: 16, angle: (3 * Math.PI) / 4 },
            { x: 16, z: 16, angle: -(3 * Math.PI) / 4 }
        ];

        legPositions.forEach(pos => {
            const legBeam = new THREE.CylinderGeometry(3.5, 5.5, 22, 4);
            legBeam.rotateY(pos.angle);
            legBeam.rotateX((pos.z > 0 ? -1 : 1) * 0.28);
            legBeam.rotateZ((pos.x > 0 ? 1 : -1) * 0.28);
            legBeam.translate(pos.x * 0.75, 10, pos.z * 0.75);

            parts.push({ geo: legBeam, color: STEEL_GREY });

            for (let h = 3; h <= 18; h += 4) {
                const strut = new THREE.BoxGeometry(0.8, 0.8, 6);
                strut.rotateY(pos.angle);
                strut.translate(pos.x * (1 - h / 50), h, pos.z * (1 - h / 50));
                parts.push({ geo: strut, color: DARK_STEEL });
            }
        });

        for (let i = 0; i < 4; i++) {
            const arch = new THREE.TorusGeometry(12, 1.2, 8, 16, Math.PI);
            arch.rotateY((i * Math.PI) / 2);
            arch.translate(0, 11, 0);
            parts.push({ geo: arch, color: STEEL_GREY });
        }

        const plat1 = new THREE.BoxGeometry(26, 3, 26);
        plat1.translate(0, 20, 0);
        const plat1Lip = new THREE.BoxGeometry(28, 1, 28);
        plat1Lip.translate(0, 21.5, 0);

        parts.push({ geo: plat1, color: PLATFORM_GREY }, { geo: plat1Lip, color: STEEL_GREY });

        const midTower = new THREE.CylinderGeometry(8, 11.5, 22, 4);
        midTower.rotateY(Math.PI / 4);
        midTower.translate(0, 32, 0);
        parts.push({ geo: midTower, color: STEEL_GREY });

        for (let y = 23; y <= 40; y += 4) {
            const band = new THREE.BoxGeometry(17 - (y - 20) * 0.35, 0.8, 17 - (y - 20) * 0.35);
            band.translate(0, y, 0);
            parts.push({ geo: band, color: DARK_STEEL });
        }

        const plat2 = new THREE.BoxGeometry(16, 2.5, 16);
        plat2.translate(0, 44, 0);
        const plat2Lip = new THREE.BoxGeometry(17.5, 0.8, 17.5);
        plat2Lip.translate(0, 45.2, 0);
        parts.push({ geo: plat2, color: PLATFORM_GREY }, { geo: plat2Lip, color: STEEL_GREY });

        const upperSpire = new THREE.CylinderGeometry(2.5, 7.5, 34, 4);
        upperSpire.rotateY(Math.PI / 4);
        upperSpire.translate(0, 63, 0);
        parts.push({ geo: upperSpire, color: STEEL_GREY });

        for (let y = 47; y <= 78; y += 5) {
            const band = new THREE.BoxGeometry(11 - (y - 45) * 0.25, 0.6, 11 - (y - 45) * 0.25);
            band.translate(0, y, 0);
            parts.push({ geo: band, color: DARK_STEEL });
        }

        const topDome = new THREE.CylinderGeometry(3.2, 3.2, 4, 16);
        topDome.translate(0, 81, 0);
        const topCap = new THREE.SphereGeometry(3.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        topCap.translate(0, 83, 0);

        const antenna = new THREE.CylinderGeometry(0.5, 1.2, 12, 12);
        antenna.translate(0, 90, 0);
        const antennaTip = new THREE.SphereGeometry(0.8, 12, 12);
        antennaTip.translate(0, 96.5, 0);

        parts.push(
            { geo: topDome, color: PLATFORM_GREY },
            { geo: topCap, color: STEEL_GREY },
            { geo: antenna, color: STEEL_GREY },
            { geo: antennaTip, color: [0.95, 0.75, 0.15] }
        );

        const merged = this.mergeGeometriesWithColors(parts);
        merged.center();

        return {
            name: "法国巴黎埃菲尔铁塔 (Eiffel Tower)",
            fileName: "eiffel_tower_paris.stl",
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

/**
 * STL Parser for Binary and ASCII STL files.
 * Calculates geometry, volume, surface area, bounding box, and 15-bit RGB face colors.
 */
class STLParser {
    /**
     * Parses an ArrayBuffer containing STL data into Three.js BufferGeometry compatible data.
     * @param {ArrayBuffer} buffer 
     * @returns {Object} { positions, normals, colors, stats }
     */
    static parse(buffer) {
        const isBinary = this.checkIsBinary(buffer);
        if (isBinary) {
            return this.parseBinary(buffer);
        } else {
            return this.parseASCII(buffer);
        }
    }

    /**
     * Accurately determines whether the buffer is Binary or ASCII STL.
     */
    static checkIsBinary(buffer) {
        const reader = new DataView(buffer);
        if (buffer.byteLength < 84) return false;

        const faceCount = reader.getUint32(80, true);
        const expectedBinarySize = 84 + faceCount * 50;

        if (expectedBinarySize === buffer.byteLength) {
            return true;
        }

        const headerDecoder = new TextDecoder('ascii');
        const headerText = headerDecoder.decode(new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength)));
        if (headerText.startsWith('solid') && !headerText.includes('\n')) {
            const bytes = new Uint8Array(buffer, 0, Math.min(500, buffer.byteLength));
            for (let i = 0; i < bytes.length; i++) {
                if (bytes[i] > 127) return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Parses Binary STL format with 15-bit RGB Color support.
     */
    static parseBinary(buffer) {
        const reader = new DataView(buffer);
        const faceCount = reader.getUint32(80, true);

        const positions = new Float32Array(faceCount * 9);
        const normals = new Float32Array(faceCount * 9);
        const colors = new Float32Array(faceCount * 9);

        let hasColors = false;

        let posIdx = 0;
        let offset = 84;

        let totalVolume = 0;
        let totalArea = 0;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < faceCount; i++) {
            if (offset + 50 > buffer.byteLength) break;

            // Normal
            const nx = reader.getFloat32(offset, true);
            const ny = reader.getFloat32(offset + 4, true);
            const nz = reader.getFloat32(offset + 8, true);

            // Vertices
            const v1x = reader.getFloat32(offset + 12, true);
            const v1y = reader.getFloat32(offset + 16, true);
            const v1z = reader.getFloat32(offset + 20, true);

            const v2x = reader.getFloat32(offset + 24, true);
            const v2y = reader.getFloat32(offset + 28, true);
            const v2z = reader.getFloat32(offset + 32, true);

            const v3x = reader.getFloat32(offset + 36, true);
            const v3y = reader.getFloat32(offset + 40, true);
            const v3z = reader.getFloat32(offset + 44, true);

            // 15-bit RGB Attribute
            const attrVal = reader.getUint16(offset + 48, true);

            offset += 50;

            // Fill positions
            positions[posIdx] = v1x; positions[posIdx + 1] = v1y; positions[posIdx + 2] = v1z;
            positions[posIdx + 3] = v2x; positions[posIdx + 4] = v2y; positions[posIdx + 5] = v2z;
            positions[posIdx + 6] = v3x; positions[posIdx + 7] = v3y; positions[posIdx + 8] = v3z;

            // Fill normals
            for (let k = 0; k < 3; k++) {
                normals[posIdx + k * 3] = nx;
                normals[posIdx + k * 3 + 1] = ny;
                normals[posIdx + k * 3 + 2] = nz;
            }

            // Fill 15-bit RGB Colors if present
            if (attrVal & 0x8000) {
                hasColors = true;
                const r5 = (attrVal >> 10) & 0x1F;
                const g5 = (attrVal >> 5) & 0x1F;
                const b5 = attrVal & 0x1F;
                const r = r5 / 31.0;
                const g = g5 / 31.0;
                const b = b5 / 31.0;

                for (let k = 0; k < 3; k++) {
                    colors[posIdx + k * 3] = r;
                    colors[posIdx + k * 3 + 1] = g;
                    colors[posIdx + k * 3 + 2] = b;
                }
            }

            posIdx += 9;

            // Update bounding box
            minX = Math.min(minX, v1x, v2x, v3x);
            maxX = Math.max(maxX, v1x, v2x, v3x);
            minY = Math.min(minY, v1y, v2y, v3y);
            maxY = Math.max(maxY, v1y, v2y, v3y);
            minZ = Math.min(minZ, v1z, v2z, v3z);
            maxZ = Math.max(maxZ, v1z, v2z, v3z);

            // Calculate Volume
            totalVolume += (-v3x * v2y * v1z + v2x * v3y * v1z + v3x * v1y * v2z - v1x * v3y * v2z - v2x * v1y * v3z + v1x * v2y * v3z) / 6.0;

            // Calculate Surface Area
            const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
            const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
            const cx = ay * bz - az * by;
            const cy = az * bx - ax * bz;
            const cz = ax * by - ay * bx;
            totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
        }

        return {
            positions,
            normals,
            colors: hasColors ? colors : null,
            stats: {
                triangleCount: Math.floor(posIdx / 9),
                vertexCount: posIdx / 3,
                volume: Math.abs(totalVolume),
                surfaceArea: totalArea,
                boundingBox: {
                    min: { x: minX, y: minY, z: minZ },
                    max: { x: maxX, y: maxY, z: maxZ },
                    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
                    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }
                },
                format: 'Binary',
                hasColors
            }
        };
    }

    /**
     * Parses ASCII STL format.
     */
    static parseASCII(buffer) {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(buffer);

        const posList = [];
        const normList = [];

        const vertexRegex = /vertex\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/gi;
        const normalRegex = /facet\s+normal\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)\s+([\d.\-+eE]+)/gi;

        let totalVolume = 0;
        let totalArea = 0;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        const facets = text.split('endfacet');
        let triangleCount = 0;

        for (let i = 0; i < facets.length; i++) {
            const facet = facets[i];
            if (!facet.includes('vertex')) continue;

            normalRegex.lastIndex = 0;
            const normMatch = normalRegex.exec(facet);
            let nx = 0, ny = 0, nz = 0;
            if (normMatch) {
                nx = parseFloat(normMatch[1]);
                ny = parseFloat(normMatch[2]);
                nz = parseFloat(normMatch[3]);
            }

            vertexRegex.lastIndex = 0;
            const v1 = vertexRegex.exec(facet);
            const v2 = vertexRegex.exec(facet);
            const v3 = vertexRegex.exec(facet);

            if (v1 && v2 && v3) {
                const v1x = parseFloat(v1[1]), v1y = parseFloat(v1[2]), v1z = parseFloat(v1[3]);
                const v2x = parseFloat(v2[1]), v2y = parseFloat(v2[2]), v2z = parseFloat(v2[3]);
                const v3x = parseFloat(v3[1]), v3y = parseFloat(v3[2]), v3z = parseFloat(v3[3]);

                posList.push(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
                normList.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);

                triangleCount++;

                minX = Math.min(minX, v1x, v2x, v3x);
                maxX = Math.max(maxX, v1x, v2x, v3x);
                minY = Math.min(minY, v1y, v2y, v3y);
                maxY = Math.max(maxY, v1y, v2y, v3y);
                minZ = Math.min(minZ, v1z, v2z, v3z);
                maxZ = Math.max(maxZ, v1z, v2z, v3z);

                totalVolume += (-v3x * v2y * v1z + v2x * v3y * v1z + v3x * v1y * v2z - v1x * v3y * v2z - v2x * v1y * v3z + v1x * v2y * v3z) / 6.0;

                const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
                const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
                const cx = ay * bz - az * by;
                const cy = az * bx - ax * bz;
                const cz = ax * by - ay * bx;
                totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
            }
        }

        return {
            positions: new Float32Array(posList),
            normals: new Float32Array(normList),
            colors: null,
            stats: {
                triangleCount,
                vertexCount: triangleCount * 3,
                volume: Math.abs(totalVolume),
                surfaceArea: totalArea,
                boundingBox: {
                    min: { x: minX, y: minY, z: minZ },
                    max: { x: maxX, y: maxY, z: maxZ },
                    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
                    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }
                },
                format: 'ASCII',
                hasColors: false
            }
        };
    }
}

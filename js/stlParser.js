/**
 * High-Performance & Memory-Optimized STL Parser.
 * Handles massive (30MB+ / 1,000,000+ triangles) Binary and ASCII STL files
 * without triggering 'Array buffer allocation failed' memory errors.
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
        if (buffer.byteLength < 84) return false;
        const reader = new DataView(buffer);
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
     * Memory-Optimized Binary STL Parser.
     * Allocates colors array lazily only when vertex colors are actually detected.
     */
    static parseBinary(buffer) {
        const reader = new DataView(buffer);
        const declaredFaceCount = reader.getUint32(80, true);

        // Calculate maximum allowable triangles from buffer length to prevent memory corruption
        const maxPossibleFaces = Math.floor((buffer.byteLength - 84) / 50);
        const faceCount = Math.min(declaredFaceCount, maxPossibleFaces);

        const positions = new Float32Array(faceCount * 9);
        const normals = new Float32Array(faceCount * 9);
        let colors = null; // Lazy allocation for colors
        let hasColors = false;

        let posIdx = 0;
        let offset = 84;

        let totalVolume = 0;
        let totalArea = 0;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < faceCount; i++) {
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

            // Lazy allocate and fill 15-bit RGB Colors if present
            if (attrVal & 0x8000) {
                if (!hasColors) {
                    hasColors = true;
                    colors = new Float32Array(faceCount * 9);
                }
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
            colors,
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
     * Memory-Optimized ASCII STL Parser.
     * Uses zero intermediate string split arrays to parse large ASCII STL files cleanly.
     */
    static parseASCII(buffer) {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(buffer);

        // Fast count of 'vertex' keyword to allocate exact TypedArray upfront
        let vertexMatchCount = 0;
        let searchPos = 0;
        while ((searchPos = text.indexOf('vertex', searchPos)) !== -1) {
            vertexMatchCount++;
            searchPos += 6;
        }

        const triangleCount = Math.floor(vertexMatchCount / 3);
        const positions = new Float32Array(triangleCount * 9);
        const normals = new Float32Array(triangleCount * 9);

        // High-speed Regex matching directly into TypedArray
        const vertexPattern = /vertex\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)/gi;
        const normalPattern = /facet\s+normal\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)\s+([-\+]?(?:\d*\.\d+|\d+)(?:[eE][-\+]?\d+)?)/gi;

        let totalVolume = 0;
        let totalArea = 0;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        let posIdx = 0;
        let vCountInTriangle = 0;
        let curV1x = 0, curV1y = 0, curV1z = 0;
        let curV2x = 0, curV2y = 0, curV2z = 0;
        let curNx = 0, curNy = 0, curNz = 0;

        // Reset regex indices
        normalPattern.lastIndex = 0;
        vertexPattern.lastIndex = 0;

        let normMatch = normalPattern.exec(text);
        let vertMatch;

        while ((vertMatch = vertexPattern.exec(text)) !== null) {
            const vx = parseFloat(vertMatch[1]);
            const vy = parseFloat(vertMatch[2]);
            const vz = parseFloat(vertMatch[3]);

            if (posIdx < positions.length) {
                positions[posIdx] = vx;
                positions[posIdx + 1] = vy;
                positions[posIdx + 2] = vz;

                // Update Bounding Box
                minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
                minY = Math.min(minY, vy); maxY = Math.max(maxY, vy);
                minZ = Math.min(minZ, vz); maxZ = Math.max(maxZ, vz);

                if (vCountInTriangle === 0) {
                    curV1x = vx; curV1y = vy; curV1z = vz;
                    if (normMatch) {
                        curNx = parseFloat(normMatch[1]);
                        curNy = parseFloat(normMatch[2]);
                        curNz = parseFloat(normMatch[3]);
                        normMatch = normalPattern.exec(text);
                    }
                } else if (vCountInTriangle === 1) {
                    curV2x = vx; curV2y = vy; curV2z = vz;
                } else if (vCountInTriangle === 2) {
                    const v3x = vx, v3y = vy, v3z = vz;

                    // Fill Normals for 3 vertices
                    const nBase = posIdx - 6;
                    for (let k = 0; k < 3; k++) {
                        normals[nBase + k * 3] = curNx;
                        normals[nBase + k * 3 + 1] = curNy;
                        normals[nBase + k * 3 + 2] = curNz;
                    }

                    // Calculate Volume
                    totalVolume += (-v3x * curV2y * curV1z + curV2x * curV3y * curV1z + v3x * curV1y * curV2z - curV1x * curV3y * curV2z - curV2x * curV1y * v3z + curV1x * curV2y * v3z) / 6.0;

                    // Calculate Surface Area
                    const ax = curV2x - curV1x, ay = curV2y - curV1y, az = curV2z - curV1z;
                    const bx = v3x - curV1x, by = v3y - curV1y, bz = v3z - curV1z;
                    const cx = ay * bz - az * by;
                    const cy = az * bx - ax * bz;
                    const cz = ax * by - ay * bx;
                    totalArea += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
                }

                vCountInTriangle = (vCountInTriangle + 1) % 3;
                posIdx += 3;
            }
        }

        const actualTriangles = Math.floor(posIdx / 9);

        return {
            positions: positions.subarray(0, posIdx),
            normals: normals.subarray(0, posIdx),
            colors: null,
            stats: {
                triangleCount: actualTriangles,
                vertexCount: actualTriangles * 3,
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

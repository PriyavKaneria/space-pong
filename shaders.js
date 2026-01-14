/**
 * SPACE PONG - WebGL Gravitational Lensing Shader
 * Creates realistic black hole light-bending effect with Einstein ring
 */

// Vertex Shader - Simply passes coordinates through
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

// Fragment Shader - Realistic gravitational lensing with caustics simulation
const fragmentShaderSource = `
    precision highp float;
    
    varying vec2 v_texCoord;
    
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform vec2 u_blackHolePos;
    uniform float u_blackHoleRadius;
    uniform float u_time;
    
    #define PI 3.14159265359
    
    // Schwarzschild-inspired lensing - bends space around black hole
    vec2 gravitationalLens(vec2 uv, vec2 center, float mass, float aspect) {
        // Convert to aspect-corrected coordinates for distance calculation
        vec2 uvCorrected = vec2(uv.x * aspect, uv.y);
        vec2 centerCorrected = vec2(center.x * aspect, center.y);
        
        vec2 delta = uvCorrected - centerCorrected;
        float dist = length(delta);
        
        if (dist < 0.001) return uv;
        
        vec2 dir = delta / dist;
        
        // Einstein ring radius
        float einsteinR = mass * 0.8;
        
        // Deflection angle (simplified Schwarzschild)
        float deflection = mass * mass / (dist * dist + mass * 0.5);
        
        // Apply deflection in corrected space, then convert back
        vec2 bentCorrected = uvCorrected - dir * deflection;
        vec2 bentUV = vec2(bentCorrected.x / aspect, bentCorrected.y);
        
        // Multiple image effect near Einstein ring
        if (dist < einsteinR * 2.0 && dist > mass * 0.3) {
            float ringDist = abs(dist - einsteinR);
            float ringStrength = exp(-ringDist * ringDist / (mass * mass * 0.5));
            
            vec2 oppositeCorrected = centerCorrected - delta * (einsteinR / dist) * 0.5;
            vec2 oppositeUV = vec2(oppositeCorrected.x / aspect, oppositeCorrected.y);
            
            return mix(bentUV, oppositeUV, ringStrength * 0.3);
        }
        
        return bentUV;
    }
    
    void main() {
        vec2 uv = v_texCoord;
        vec2 center = u_blackHolePos;
        float mass = u_blackHoleRadius;
        float aspect = u_resolution.x / u_resolution.y;
        
        // Calculate distance in aspect-corrected space
        vec2 uvCorrected = vec2(uv.x * aspect, uv.y);
        vec2 centerCorrected = vec2(center.x * aspect, center.y);
        vec2 delta = uvCorrected - centerCorrected;
        float dist = length(delta);
        
        // Event horizon - complete darkness
        float eventHorizon = mass * 0.4;
        
        if (dist < eventHorizon) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        
        // Apply gravitational lensing
        vec2 lensedUV = gravitationalLens(uv, center, mass, aspect);
        
        // Clamp and sample
        lensedUV = clamp(lensedUV, 0.0, 1.0);
        vec4 color = texture2D(u_texture, lensedUV);
        
        // Photon sphere glow (1.5x event horizon) - subtle white/blue
        float photonSphere = eventHorizon * 1.5;
        float photonDist = abs(dist - photonSphere);
        if (dist > eventHorizon && dist < photonSphere * 1.8) {
            float glowIntensity = exp(-photonDist * photonDist / (mass * mass * 0.02));
            vec3 photonGlow = vec3(0.7, 0.85, 1.0) * glowIntensity * 0.3;
            color.rgb += photonGlow;
        }
        
        // Accretion disk simulation - subtle monochrome with time-based hue shift
        float diskInner = eventHorizon * 1.3;
        float diskOuter = eventHorizon * 3.0;
        
        if (dist > diskInner && dist < diskOuter) {
            float angle = atan(delta.y, delta.x);
            float rotatedAngle = angle + u_time * 0.3;
            
            // Doppler beaming (one side brighter)
            float doppler = 0.5 + 0.5 * cos(rotatedAngle);
            doppler = pow(doppler, 0.4);
            
            // Radial falloff
            float radialFalloff = 1.0 - smoothstep(diskInner, diskOuter, dist);
            radialFalloff = pow(radialFalloff, 0.6);
            
            // Subtle hue shift over time (blue -> cyan -> white -> blue)
            float hueShift = sin(u_time * 0.1) * 0.5 + 0.5;
            vec3 coldColor = vec3(0.6, 0.8, 1.0);   // Cool blue
            vec3 warmColor = vec3(0.9, 0.95, 1.0);  // Near white
            vec3 baseColor = mix(coldColor, warmColor, hueShift);
            
            // Inner is brighter/whiter
            float temp = 1.0 - (dist - diskInner) / (diskOuter - diskInner);
            vec3 diskColor = mix(baseColor * 0.5, vec3(1.0), temp * 0.7);
            
            // Spiral structure (more subtle)
            float spiral = sin(rotatedAngle * 2.0 - dist * 30.0 + u_time * 0.5) * 0.5 + 0.5;
            spiral = 0.8 + spiral * 0.2;
            
            // Combine disk (more subtle alpha)
            float diskAlpha = radialFalloff * doppler * spiral * 0.35;
            color.rgb = mix(color.rgb, diskColor, diskAlpha);
            color.rgb += diskColor * diskAlpha * 0.15;
        }
        
        // Edge darkening near event horizon
        
        gl_FragColor = color;
    }
`;

/**
 * GravitationalLensShader - Manages WebGL context and shader program
 */
class GravitationalLensShader {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: true
        });

        if (!this.gl) {
            console.warn('WebGL not supported, falling back to 2D');
            this.enabled = false;
            return;
        }

        this.enabled = true;
        this.init();
    }

    init() {
        const gl = this.gl;

        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            this.enabled = false;
            return;
        }

        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program link failed:', gl.getProgramInfoLog(this.program));
            this.enabled = false;
            return;
        }

        // Get attribute/uniform locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.blackHolePosLocation = gl.getUniformLocation(this.program, 'u_blackHolePos');
        this.blackHoleRadiusLocation = gl.getUniformLocation(this.program, 'u_blackHoleRadius');
        this.timeLocation = gl.getUniformLocation(this.program, 'u_time');
        this.textureLocation = gl.getUniformLocation(this.program, 'u_texture');

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0, 1, 0, 0, 1,
            0, 1, 1, 0, 1, 1
        ]), gl.STATIC_DRAW);

        // Create texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.gl) {
            this.gl.viewport(0, 0, width, height);
        }
    }

    render(sourceCanvas, blackHoleX, blackHoleY, blackHoleRadius, time) {
        if (!this.enabled) return;

        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Update texture from source canvas
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

        // Use program
        gl.useProgram(this.program);

        // Set uniforms - scale radius for more dramatic effect
        gl.uniform2f(this.resolutionLocation, width, height);
        gl.uniform2f(this.blackHolePosLocation, blackHoleX / width, 1.0 - blackHoleY / height);
        gl.uniform1f(this.blackHoleRadiusLocation, (blackHoleRadius * 1.5) / Math.min(width, height));
        gl.uniform1f(this.timeLocation, time);
        gl.uniform1i(this.textureLocation, 0);

        // Set position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Set texCoord attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Clear and draw
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

// Export for use in game.js
window.GravitationalLensShader = GravitationalLensShader;

import * as THREE from 'three';

let scene, camera, renderer, material, videoTexture;
let isInitialized = false;

export function initWebGL(videoElement, canvasElement, deviceProfile) {
    if (isInitialized) return;

    // 1. Setup Scene and Orthographic Camera (Perfect for 2D video mapping)
    scene = new THREE.Scene();
    
    // We use Orthographic to keep the video exactly 1:1 without perspective distortion
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // 2. Setup Renderer with Device Profile limits
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvasElement, 
        alpha: true,
        powerPreference: "high-performance",
        antialias: false // No need for antialiasing on a flat video texture, saves perf
    });
    
    renderer.setPixelRatio(deviceProfile.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 3. Setup Video Texture
    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.colorSpace = THREE.SRGBColorSpace; // Keeps colors vibrant

    // 4. Setup Geometry & Material
    // Plane covers the entire screen coordinate system of Orthographic Camera
    const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
    material = new THREE.MeshBasicMaterial({ map: videoTexture });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Handle Resize
    window.addEventListener('resize', () => {
        if (!videoElement.videoWidth) return; // Video not ready yet
        const width = window.innerWidth;
        const height = window.innerHeight; // Now matching 100dvh
        const newAspect = width / height;
        
        camera.left = -newAspect;
        camera.right = newAspect;
        camera.updateProjectionMatrix();
        
        mesh.geometry.dispose();
        mesh.geometry = new THREE.PlaneGeometry(2 * newAspect, 2);

        updateTextureCover(newAspect, videoElement.videoWidth / videoElement.videoHeight);
        renderer.setSize(width, height);
    });

    videoElement.addEventListener('loadedmetadata', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
        updateTextureCover(aspect, videoRatio);
    });

    isInitialized = true;
}

function updateTextureCover(canvasRatio, videoRatio) {
    if (isNaN(videoRatio) || videoRatio === 0) return;
    
    let scaleX = 1;
    let scaleY = 1;

    // object-fit: cover logic
    if (canvasRatio > videoRatio) {
        scaleY = videoRatio / canvasRatio;
    } else {
        scaleX = canvasRatio / videoRatio;
    }

    // Use setUvTransform for mathematically perfect centered cropping
    videoTexture.matrixAutoUpdate = false;
    videoTexture.matrix.setUvTransform(0, 0, scaleX, scaleY, 0, 0.5, 0.5);
}

export function renderWebGL() {
    if (!isInitialized || !renderer || !scene || !camera) return;
    renderer.render(scene, camera);
}

export function updatePixelRatio(newRatio) {
    if (renderer) {
        renderer.setPixelRatio(newRatio);
    }
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DeviceProfile, AdaptiveQuality } from './src/performance.js';
import { initScroll } from './src/scroll.js';
import { initWebGL, renderWebGL, updatePixelRatio } from './src/webgl.js';

gsap.registerPlugin(ScrollTrigger);

// Core Elements
const video = document.createElement('video');
// Dual Profile Asset System: High quality for desktop, High quality portrait for mobile
video.src = window.innerWidth < 768 ? '/scrub-mobile-hq.mp4' : '/scrub-optimized.mp4';
video.muted = true;
video.playsInline = true;
video.preload = 'auto';

const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');
const webglCanvas = document.getElementById('webgl-canvas');
const fallbackCanvas = document.getElementById('video-canvas');
const lcpImage = document.getElementById('lcp-image');
const fallbackContext = fallbackCanvas.getContext('2d');

let isVideoLoaded = false;
let useWebGL = true; // Strategy: Try WebGL first

// Adaptive Quality System
const aqMonitor = new AdaptiveQuality(
    (newRatio) => {
        if (useWebGL) {
            updatePixelRatio(newRatio);
        }
    },
    () => {
        // Hard Fallback (<20 FPS)
        if (useWebGL) {
            useWebGL = false;
            webglCanvas.style.display = 'none';
            fallbackCanvas.style.display = 'block';
            resizeFallbackCanvas();
        }
    }
);
// Fallback progress bar animation
let progress = 0;
const fallbackInterval = setInterval(() => {
    if (isVideoLoaded) {
        clearInterval(fallbackInterval);
        return;
    }
    progress += 2;
    if (progress > 90) progress = 90;
    if (loaderBar) loaderBar.style.width = `${progress}%`;
}, 100);

let experienceStarted = false;

function startExperience() {
    if (experienceStarted) return;
    experienceStarted = true;
    
    isVideoLoaded = true;
    clearInterval(fallbackInterval);
    if (loaderBar) loaderBar.style.width = '100%';
    
    // Evaluate if WebGL should be disabled on extremely weak devices
    if (DeviceProfile.isMobile && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        console.warn("Weak device detected. Falling back to 2D Canvas.");
        useWebGL = false;
    }

    if (useWebGL) {
        fallbackCanvas.style.display = 'none';
        try {
            initWebGL(video, webglCanvas, DeviceProfile);
            initScroll(); // Init Lenis smooth scrolling
            
            // Start rendering immediately so the first frame is ready before preloader fades
            requestAnimationFrame(renderLoop);
            
            // Decoder Kickstart for Mobile (Safari fix)
            video.play().then(() => video.pause()).catch(() => {});
        } catch(e) {
            console.error("WebGL Init Failed. Falling back.", e);
            useWebGL = false;
            webglCanvas.style.display = 'none';
            fallbackCanvas.style.display = 'block';
            requestAnimationFrame(renderLoop);
        }
    } else {
        webglCanvas.style.display = 'none';
        requestAnimationFrame(renderLoop);
    }

    gsap.to(preloader, {
        opacity: 0,
        duration: 0.8,
        delay: 0.1,
        onComplete: () => {
            preloader.style.visibility = 'hidden';
            initScrollSequence();
        }
    });
}

video.addEventListener('loadeddata', startExperience);

// Critical Fix: Do not block the user if the network is extremely slow.
// Force start the experience after 1 second so they can see the LCP image.
setTimeout(startExperience, 1000);

video.load();

function resizeFallbackCanvas() {
    fallbackCanvas.width = window.innerWidth;
    fallbackCanvas.height = window.innerHeight;
}

if (!useWebGL) {
    window.addEventListener('resize', resizeFallbackCanvas);
}

const scrollState = { progress: 0 };
let currentLerpedTime = 0.001; // Start slightly off-zero to wake up the decoder

function initScrollSequence() {
    if (!useWebGL) resizeFallbackCanvas();

    gsap.to(scrollState, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
            trigger: ".scroll-spacer",
            start: "top top",
            end: "bottom bottom",
            scrub: 0 // Scrub is immediate because Lerp handles the smoothness
        }
    });
}

let firstFrameRendered = false;
let videoUpdateFrameCount = 0;

function renderLoop() {
    aqMonitor.tick(); // Monitor FPS

    if (isVideoLoaded && video.readyState >= 2) {
        
        // Decoupled Lerp Logic for Smooth Video Scrubbing
        const targetTime = scrollState.progress * (video.duration || 15.43);
        
        // Slightly faster lerp (0.15) for better responsiveness on mobile
        currentLerpedTime += (targetTime - currentLerpedTime) * 0.15; 
        
        // Mobile Decoder Optimization: Throttle currentTime updates to 30fps (every 2nd frame)
        // Updating currentTime 60 times a second is too heavy for most mobile decoders.
        videoUpdateFrameCount++;
        const throttleFactor = DeviceProfile.isMobile ? 2 : 1;

        if (videoUpdateFrameCount % throttleFactor === 0) {
            if (Math.abs(targetTime - currentLerpedTime) > 0.001) {
                video.currentTime = currentLerpedTime;
            }
        }

        if (useWebGL) {
            renderWebGL();
        } else {
            // 2D Fallback Pipeline
            const canvasRatio = fallbackCanvas.width / fallbackCanvas.height;
            const videoRatio = video.videoWidth / video.videoHeight;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasRatio > videoRatio) {
                drawWidth = fallbackCanvas.width;
                drawHeight = fallbackCanvas.width / videoRatio;
                offsetX = 0;
                offsetY = (fallbackCanvas.height - drawHeight) / 2;
            } else {
                drawWidth = fallbackCanvas.height * videoRatio;
                drawHeight = fallbackCanvas.height;
                offsetX = (fallbackCanvas.width - drawWidth) / 2;
                offsetY = 0;
            }

            fallbackContext.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Only hide LCP image once the first frame is actually rendered and video has progressed
        if (!firstFrameRendered && isVideoLoaded && video.readyState >= 2) {
            firstFrameRendered = true;
            if (lcpImage) {
                lcpImage.style.opacity = '0';
                setTimeout(() => lcpImage.style.display = 'none', 500);
            }
        }
    }
    requestAnimationFrame(renderLoop);
}



// --- Rest of the logic ---

// Hero Text Reveal
gsap.from(".hero-text .reveal-text", {
  y: 50,
  opacity: 0,
  duration: 1,
  stagger: 0.2,
  scrollTrigger: {
    trigger: "#main-content",
    start: "top 80%",
  }
});

// Form Submission Logic
const contactForm = document.getElementById('main-contact-form');
const formStatus = document.getElementById('form-status');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('form-name').value;
    const email = document.getElementById('form-email').value;
    const message = document.getElementById('form-message').value;
    const date = new Date().toLocaleString('tr-TR');
    const submission = { name, email, message, date };
    const existingSubmissions = JSON.parse(localStorage.getItem('mittel_submissions') || '[]');
    existingSubmissions.push(submission);
    localStorage.setItem('mittel_submissions', JSON.stringify(existingSubmissions));
    formStatus.innerText = 'Mesajınız başarıyla gönderildi!';
    formStatus.style.color = '#B48E69';
    contactForm.reset();
    setTimeout(() => { formStatus.innerText = ''; }, 5000);
  });
}

// Parallax Animations
gsap.utils.toArray('.parallax-item').forEach(section => {
  const bg = section.querySelector('.parallax-bg');
  const content = section.querySelector('.parallax-overlay');
  
  if (bg) {
    gsap.fromTo(bg, {
      y: "-15%"
    }, {
      y: "15%",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        scrub: 1
      }
    });
  }

  if (content) {
    gsap.from(content, {
      y: 100,
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        toggleActions: "play none none reverse"
      }
    });
  }
});

gsap.from(".contact-section", {
  y: 100,
  opacity: 0,
  duration: 1,
  scrollTrigger: {
    trigger: ".contact-section",
    start: "top 90%",
  }
});

// Hidden Admin Access (Ctrl + Shift + A)
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
    window.location.href = '/admin.html';
  }
});

// Disable Right Click
window.addEventListener('contextmenu', (e) => e.preventDefault());

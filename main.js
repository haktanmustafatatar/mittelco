import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DeviceProfile, AdaptiveQuality } from './src/performance.js';
import { initScroll } from './src/scroll.js';
import { initWebGL, renderWebGL, updatePixelRatio, switchVideoSource } from './src/webgl.js';

gsap.registerPlugin(ScrollTrigger);

// Core Elements
// 1. Hero Loop Video (Fast Start)
const heroVideo = document.createElement('video');
heroVideo.src = window.innerWidth < 768 ? '/hero-mobile.mp4' : '/hero-desktop.mp4';
heroVideo.muted = true;
heroVideo.playsInline = true;
heroVideo.loop = true;
heroVideo.preload = 'auto';

// 2. Cinematic Scrub Video (Heavy Asset)
const scrubVideo = document.createElement('video');
scrubVideo.src = window.innerWidth < 768 ? '/scrub-mobile-hq.mp4' : '/scrub-optimized.mp4';
scrubVideo.muted = true;
scrubVideo.playsInline = true;
scrubVideo.preload = 'auto';

let activeVideo = heroVideo; // Start with the hero loop
let isScrubVideoReady = false;

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

heroVideo.load();
scrubVideo.load();

heroVideo.addEventListener('loadeddata', startExperience);
scrubVideo.addEventListener('loadeddata', () => { isScrubVideoReady = true; });

// Critical Fix: Force start experience after 1s if hero takes too long
setTimeout(startExperience, 1000);

function startExperience() {
    if (experienceStarted) return;
    experienceStarted = true;
    
    isVideoLoaded = true;
    clearInterval(fallbackInterval);
    if (loaderBar) loaderBar.style.width = '100%';
    
    // Kickstart videos for Safari
    heroVideo.play().catch(() => {});
    scrubVideo.play().then(() => scrubVideo.pause()).catch(() => {});

    if (useWebGL) {
        fallbackCanvas.style.display = 'none';
        try {
            initWebGL(activeVideo, webglCanvas, DeviceProfile);
            initScroll();
            requestAnimationFrame(renderLoop);
        } catch(e) {
            console.error("WebGL Init Failed", e);
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
        onComplete: () => {
            preloader.style.visibility = 'hidden';
            initScrollSequence();
        }
    });
}

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
    aqMonitor.tick();

    // 1. Switch Strategy: Hero -> Scrub
    if (scrollState.progress > 0.005 && isScrubVideoReady && activeVideo !== scrubVideo) {
        activeVideo = scrubVideo;
        if (useWebGL) {
            switchVideoSource(activeVideo);
        }
    }

    if (isVideoLoaded) {
        if (activeVideo === scrubVideo && scrubVideo.readyState >= 2) {
            const targetTime = scrollState.progress * (scrubVideo.duration || 15.43);
            currentLerpedTime += (targetTime - currentLerpedTime) * 0.15;

            videoUpdateFrameCount++;
            const throttleFactor = DeviceProfile.isMobile ? 2 : 1;

            if (videoUpdateFrameCount % throttleFactor === 0) {
                if (Math.abs(targetTime - currentLerpedTime) > 0.001) {
                    scrubVideo.currentTime = currentLerpedTime;
                }
            }
        }

        if (useWebGL) {
            renderWebGL(activeVideo);
        } else {
            const canvasRatio = fallbackCanvas.width / fallbackCanvas.height;
            const videoRatio = activeVideo.videoWidth / activeVideo.videoHeight;
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
            fallbackContext.drawImage(activeVideo, offsetX, offsetY, drawWidth, drawHeight);
        }

        if (!firstFrameRendered && activeVideo.readyState >= 2) {
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

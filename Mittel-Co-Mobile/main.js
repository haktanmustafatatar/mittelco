import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('video-canvas');
const context = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');

// Sequence Settings
const frameCount = 370; // Total frames extracted
const currentFrame = index => `/frames/frame_${(index + 1).toString().padStart(4, '0')}.jpg`;

const images = [];
const sequence = { frame: 0 };

// Resize Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
}

window.addEventListener('resize', resizeCanvas);

// Loading Logic
let loadedImages = 0;

function preloadImages() {
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        img.onload = () => {
            loadedImages++;
            const progress = (loadedImages / frameCount) * 100;
            if (loaderBar) loaderBar.style.width = `${progress}%`;
            
            if (loadedImages === frameCount) {
                // All loaded
                gsap.to(preloader, {
                    opacity: 0,
                    duration: 1,
                    onComplete: () => {
                        preloader.style.visibility = 'hidden';
                        initScrollSequence();
                    }
                });
            }
        };
        images.push(img);
    }
}

function initScrollSequence() {
    // Initial Render
    resizeCanvas();

    // Sequence Animation
    gsap.to(sequence, {
        frame: frameCount - 1,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
            trigger: ".scroll-spacer",
            start: "top top",
            end: "bottom bottom",
            scrub: 1 // Keep some smoothing
        },
        onUpdate: render
    });
}

function render() {
    const img = images[sequence.frame];
    if (!img) return;

    // Center and Scale image to cover canvas
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
    } else {
        drawWidth = canvas.height * imgRatio;
        drawHeight = canvas.height;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Start Loading
preloadImages();

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

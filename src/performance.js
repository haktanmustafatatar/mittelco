export const DeviceProfile = {
    isMobile: window.innerWidth < 768,
    pixelRatio: window.innerWidth < 768 ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2),
    isWeakDevice: false // Will be updated by performance monitor
};

export class AdaptiveQuality {
    constructor(onDowngrade, onFallback) {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsHistory = [];
        this.onDowngrade = onDowngrade;
        this.onFallback = onFallback;
        this.isMonitoring = true;
        this.checkInterval = 1000; // Check every second
        this.lowFpsStrikes = 0;
        this.criticalFpsStrikes = 0;
    }

    tick() {
        if (!this.isMonitoring) return;

        this.frameCount++;
        const now = performance.now();
        
        if (now - this.lastTime >= this.checkInterval) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.fpsHistory.push(fps);
            
            if (this.fpsHistory.length > 5) {
                this.fpsHistory.shift();
            }

            const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
            
            // If average FPS drops below 20 (Critical)
            if (avgFps < 20 && this.fpsHistory.length >= 2) {
                this.criticalFpsStrikes++;
                if (this.criticalFpsStrikes >= 2) {
                    this.triggerFallback();
                    return;
                }
            } else {
                this.criticalFpsStrikes = 0;
            }

            // If average FPS drops below 30 consistently (Warning)
            if (avgFps < 30 && this.fpsHistory.length >= 3) {
                this.lowFpsStrikes++;
                if (this.lowFpsStrikes > 2) {
                    this.triggerDowngrade();
                }
            } else {
                this.lowFpsStrikes = 0;
            }

            this.frameCount = 0;
            this.lastTime = now;
        }
    }

    triggerDowngrade() {
        console.warn("Performance drop detected. Downgrading WebGL quality...");
        DeviceProfile.pixelRatio = Math.max(0.5, DeviceProfile.pixelRatio * 0.75);
        if (this.onDowngrade) this.onDowngrade(DeviceProfile.pixelRatio);
        this.lowFpsStrikes = 0; // Reset to allow further downgrades if needed
    }

    triggerFallback() {
        console.warn("Critical FPS drop (< 20). Switching to 2D Fallback completely.");
        this.isMonitoring = false;
        DeviceProfile.isWeakDevice = true;
        if (this.onFallback) this.onFallback();
    }
}

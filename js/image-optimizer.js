/**
 * TIDDIS TAPIS — Image Optimizer Module
 * Professional browser-side image optimization & compression.
 */

const TiddisImageOptimizer = (function() {
    const DEFAULTS = {
        maxWidth: 1800,
        maxHeight: 1800,
        quality: 0.82,
        format: 'image/webp',
        generateThumbnail: true,
        thumbWidth: 300,
        preserveTransparency: true
    };

    /**
     * Optimize a single image file.
     * @param {File} file - The original image file.
     * @param {Object} options - Optimization settings.
     * @returns {Promise<Object>} - Optimization result.
     */
    async function optimize(file, options = {}) {
        const settings = { ...DEFAULTS, ...options };
        
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('INVALID_IMAGE_FILE');
        }

        // Skip optimization for small SVGs or tiny icons if needed, 
        // but generally we want to process everything to ensure correct format.
        if (file.type === 'image/svg+xml') {
            return {
                optimizedFile: file,
                originalSize: file.size,
                optimizedSize: file.size,
                format: file.type,
                width: 0, height: 0,
                savedBytes: 0,
                savedPercent: 0
            };
        }

        const img = await loadImage(file);
        const { width, height } = calculateDimensions(img.width, img.height, settings.maxWidth, settings.maxHeight);
        
        // Determine output format
        let outputFormat = settings.format;
        if (settings.preserveTransparency && hasTransparency(file)) {
            // Keep PNG or use WebP (WebP supports transparency)
            outputFormat = 'image/webp';
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Draw image to canvas with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, outputFormat, settings.quality));
        
        // Create new File object
        const optimizedFile = new File([blob], renameExtension(file.name, outputFormat), {
            type: outputFormat,
            lastModified: Date.now()
        });

        const result = {
            optimizedFile,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            width,
            height,
            format: outputFormat,
            savedBytes: Math.max(0, file.size - optimizedFile.size),
            savedPercent: Math.round(Math.max(0, (file.size - optimizedFile.size) / file.size) * 100)
        };

        // Optional: Generate thumbnail
        if (settings.generateThumbnail) {
            result.thumbnail = await createThumbnail(img, settings.thumbWidth);
        }

        return result;
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function calculateDimensions(srcW, srcH, maxW, maxH) {
        let w = srcW;
        let h = srcH;
        if (w > maxW) {
            h = (maxW / w) * h;
            w = maxW;
        }
        if (h > maxH) {
            w = (maxH / h) * w;
            h = maxH;
        }
        return { width: Math.round(w), height: Math.round(h) };
    }

    async function createThumbnail(img, thumbWidth) {
        const ratio = thumbWidth / img.width;
        const thumbHeight = img.height * ratio;
        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.6));
    }

    function hasTransparency(file) {
        return file.type === 'image/png' || file.type === 'image/webp';
    }

    function renameExtension(filename, format) {
        const name = filename.replace(/\.[^/.]+$/, "");
        const ext = format.split('/')[1];
        return `${name}.${ext === 'jpeg' ? 'jpg' : ext}`;
    }

    return {
        optimize,
        DEFAULTS
    };
})();

// Export for use in admin.js
window.TiddisImageOptimizer = TiddisImageOptimizer;

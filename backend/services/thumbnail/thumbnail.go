package thumbnail

import (
	"fmt"
	"path"
	"runtime"
	"strings"
	"sync"

	"github.com/davidbyttow/govips/v2/vips"
)

var (
	vipsOnce sync.Once
	vipsErr  error
)

// ensureVips initializes the libvips runtime exactly once per process.
// vips is a C library with its own thread pool, so CPU-bound thumbnail
// work scales across cores without GOMAXPROCS limits.
func ensureVips() error {
	vipsOnce.Do(func() {
		// Suppress the noisy per-operation [VIPS.info] chatter; keep errors.
		vips.LoggingSettings(nil, vips.LogLevelWarning)
		vipsErr = vips.Startup(&vips.Config{
			ConcurrencyLevel: runtime.NumCPU(),
			MaxCacheSize:     100,
			MaxCacheMem:      128 * 1024 * 1024,
			MaxCacheFiles:    1024,
		})
	})
	return vipsErr
}

// Shutdown releases the libvips runtime; call it during graceful server
// shutdown so the C memory pools are freed deterministically.
func Shutdown() {
	vipsOnce.Do(func() {}) // ensure Startup ran before Shutdown if ever used
	vips.Shutdown()
}

// ThumbKey derives the storage key of the thumbnail for an original key.
// uploads/2026/08/abc.jpg -> uploads/thumbs/2026/08/abc_thumb.jpg
func ThumbKey(storageKey string) string {
	clean := path.Clean(strings.TrimPrefix(storageKey, "/"))
	dir := path.Dir(clean)
	base := path.Base(clean)
	ext := path.Ext(base)
	name := strings.TrimSuffix(base, ext) + "_thumb" + ext

	if strings.HasPrefix(clean, "uploads/") {
		return path.Join("uploads", "thumbs", strings.TrimPrefix(path.Join(dir, name), "uploads/"))
	}
	if dir == "." || dir == "/" {
		return path.Join("thumbs", name)
	}
	return path.Join("thumbs", dir, name)
}

// Dimensions returns the intrinsic width/height of an image buffer using the
// libvips loader registry. Covers every format vips can decode: JPEG, PNG,
// WebP, GIF, AVIF/HEIF, SVG (via librsvg), BMP/ICO (via the ImageMagick
// fallback loader) and more.
func Dimensions(src []byte) (int, int, error) {
	if err := ensureVips(); err != nil {
		return 0, 0, err
	}
	img, err := vips.NewImageFromBuffer(src)
	if err != nil {
		return 0, 0, fmt.Errorf("thumbnail: decode failed: %w", err)
	}
	defer img.Close()
	return img.Width(), img.Height(), nil
}

// Generate creates a downscaled thumbnail of the source image using libvips:
// it decodes JPEG/WebP/AVIF at reduced size, rasterizes SVG at target
// resolution, and re-encodes the result as JPEG (opaque images) or PNG
// (images with an alpha channel). The thumbnail is at most maxDim pixels on
// its longer side; images already smaller than the limit are returned
// untouched so no CPU or bandwidth is wasted re-encoding them.
//
// Returns the encoded bytes together with the mime type of the output.
// Decode/encode failures return an error so the caller can skip the thumbnail
// without failing the upload itself.
func Generate(src []byte, mimeType string, maxDim, quality int) ([]byte, string, error) {
	if err := ensureVips(); err != nil {
		return nil, "", err
	}
	if maxDim <= 0 {
		maxDim = 600
	}
	if quality <= 0 || quality > 100 {
		quality = 80
	}

	img, err := vips.NewImageFromBuffer(src)
	if err != nil {
		return nil, "", fmt.Errorf("thumbnail: decode failed: %w", err)
	}
	defer img.Close()

	w, h := img.Width(), img.Height()
	if w <= 0 || h <= 0 {
		return nil, "", fmt.Errorf("thumbnail: invalid image bounds %dx%d", w, h)
	}

	// Small images already fit inside the thumbnail box - serve the original
	// bytes unchanged (the gallery bandwidth win only matters for large files).
	if w <= maxDim && h <= maxDim {
		return src, mimeType, nil
	}

	// vips_thumbnail shrinks in stages and decodes JPEG/WebP/AVIF at reduced
	// resolution, which is dramatically faster and cheaper than a full decode
	// followed by a resize for large photographs.
	if err := img.ThumbnailWithSize(maxDim, maxDim, vips.InterestingNone, vips.SizeDown); err != nil {
		return nil, "", fmt.Errorf("thumbnail: resize failed: %w", err)
	}

	// Preserve transparency (png/webp/gif/avif/svg sources) with a PNG
	// thumbnail; everything else is lossy JPEG which is far smaller.
	if img.HasAlpha() {
		params := vips.NewPngExportParams()
		params.StripMetadata = true
		params.Compression = 6
		buf, _, err := img.ExportPng(params)
		if err != nil {
			return nil, "", fmt.Errorf("thumbnail: png encode failed: %w", err)
		}
		return buf, "image/png", nil
	}

	params := vips.NewJpegExportParams()
	params.Quality = quality
	params.StripMetadata = true
	buf, _, err := img.ExportJpeg(params)
	if err != nil {
		return nil, "", fmt.Errorf("thumbnail: jpeg encode failed: %w", err)
	}
	return buf, "image/jpeg", nil
}
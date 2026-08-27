package thumbnail

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"testing"

	"github.com/davidbyttow/govips/v2/vips"
)

func TestGenerateDownscalesLargeImage(t *testing.T) {
	// 1200x800 solid image -> should come back as a <=600px JPEG
	src := makeTestJPEG(t, 1200, 800, color.RGBA{R: 200, G: 30, B: 30, A: 255})

	out, mime, err := Generate(src, "image/jpeg", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "jpeg" {
		t.Fatalf("expected jpeg output, got %s", format)
	}
	if cfg.Width != 600 || cfg.Height != 400 {
		t.Fatalf("expected 600x400 thumbnail, got %dx%d", cfg.Width, cfg.Height)
	}
}

func TestGenerateKeepsSmallImageUntouched(t *testing.T) {
	src := makeTestJPEG(t, 300, 200, color.RGBA{R: 10, G: 120, B: 10, A: 255})

	out, mime, err := Generate(src, "image/jpeg", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg passthrough, got %s", mime)
	}
	if !bytes.Equal(out, src) {
		t.Fatal("expected small images to be returned untouched")
	}
}

func TestGeneratePreservesAlphaAsPNG(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 1000, 500))
	for x := 0; x < 1000; x++ {
		for y := 0; y < 500; y++ {
			img.Set(x, y, color.RGBA{R: 0, G: 0, B: 255, A: uint8(x % 256)})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encoding source png failed: %v", err)
	}

	out, mime, err := Generate(buf.Bytes(), "image/png", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/png" {
		t.Fatalf("expected image/png (alpha) output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "png" || cfg.Width != 600 || cfg.Height != 300 {
		t.Fatalf("expected 600x300 png thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestGenerateWebP(t *testing.T) {
	src, err := os.ReadFile("testdata/large.webp")
	if err != nil {
		t.Fatalf("reading webp fixture: %v", err)
	}

	out, mime, err := Generate(src, "image/webp", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "jpeg" || cfg.Width != 600 || cfg.Height != 441 {
		t.Fatalf("expected 600x441 jpeg thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestGenerateWebPSmallPassthrough(t *testing.T) {
	src, err := os.ReadFile("testdata/sample.webp")
	if err != nil {
		t.Fatalf("reading webp fixture: %v", err)
	}

	out, mime, err := Generate(src, "image/webp", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/webp" || !bytes.Equal(out, src) {
		t.Fatal("expected small webp images to be returned untouched")
	}
}

func TestGenerateSVG(t *testing.T) {
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#F59E0B"/></svg>`)

	out, mime, err := Generate(svg, "image/svg+xml", 600, 80)
	if err != nil {
		t.Skipf("SVG rasterization unavailable (librsvg missing): %v", err)
	}
	// librsvg always renders through an alpha-capable pipeline, so SVG
	// thumbnails come back as PNG to keep transparency safe.
	if mime != "image/png" {
		t.Fatalf("expected image/png output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "png" || cfg.Width != 600 || cfg.Height != 400 {
		t.Fatalf("expected 600x400 png thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestGenerateAVIF(t *testing.T) {
	pngBytes := makeTestPNG(t, 800, 600, color.RGBA{R: 200, G: 30, B: 30, A: 255})
	ref, err := vips.NewImageFromBuffer(pngBytes)
	if err != nil {
		t.Fatalf("loading fixture: %v", err)
	}
	defer ref.Close()

	var avifBytes []byte
	avifBytes, _, err = ref.ExportAvif(&vips.AvifExportParams{Quality: 70, Speed: 8})
	if err != nil {
		t.Skipf("AVIF encoder unavailable in this libvips build: %v", err)
	}

	out, mime, err := Generate(avifBytes, "image/avif", 600, 80)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "jpeg" || cfg.Width != 600 || cfg.Height != 450 {
		t.Fatalf("expected 600x450 jpeg thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestGenerateBMP(t *testing.T) {
	// libvips 8.15+ dropped the native BMP loader; BMP goes through the
	// ImageMagick fallback loader when compiled in.
	src := makeTestBMP(t, 1200, 800)

	out, mime, err := Generate(src, "image/bmp", 600, 80)
	if err != nil {
		t.Skipf("BMP decode unavailable (ImageMagick loader missing): %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "jpeg" || cfg.Width != 600 || cfg.Height != 400 {
		t.Fatalf("expected 600x400 jpeg thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestGenerateICO(t *testing.T) {
	// ICO has no native libvips loader either; goes through ImageMagick.
	src := makeTestICO(t, 700, 500)

	out, mime, err := Generate(src, "image/x-icon", 600, 80)
	if err != nil {
		t.Skipf("ICO decode unavailable (ImageMagick loader missing): %v", err)
	}
	if mime != "image/jpeg" {
		t.Fatalf("expected image/jpeg output, got %s", mime)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(out))
	if err != nil {
		t.Fatalf("decoding generated thumbnail failed: %v", err)
	}
	if format != "jpeg" || cfg.Width != 600 || cfg.Height != 429 {
		t.Fatalf("expected 600x429 jpeg thumbnail, got %s %dx%d", format, cfg.Width, cfg.Height)
	}
}

func TestDimensions(t *testing.T) {
	cases := []struct {
		name string
		src  []byte
		mime string
		w, h int
	}{
		{"jpeg", makeTestJPEG(t, 1200, 800, color.RGBA{1, 2, 3, 255}), "image/jpeg", 1200, 800},
		{"webp", readFixture(t, "testdata/large.webp"), "image/webp", 1024, 752},
		{"svg", []byte(`<svg width="640" height="360"></svg>`), "image/svg+xml", 640, 360},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w, h, err := Dimensions(tc.src)
			if err != nil {
				t.Fatalf("Dimensions failed: %v", err)
			}
			if w != tc.w || h != tc.h {
				t.Fatalf("got %dx%d, want %dx%d", w, h, tc.w, tc.h)
			}
		})
	}
}

func TestThumbKey(t *testing.T) {
	cases := map[string]string{
		"uploads/2026/08/abc.jpg":   "uploads/thumbs/2026/08/abc_thumb.jpg",
		"uploads/2026/08/12/x.webp": "uploads/thumbs/2026/08/12/x_thumb.webp",
		"custom/dir/photo.png":      "thumbs/custom/dir/photo_thumb.png",
		"photo.png":                 "thumbs/photo_thumb.png",
		"/leading/slash.jpg":        "thumbs/leading/slash_thumb.jpg",
		"uploads/plain.jpg":         "uploads/thumbs/plain_thumb.jpg",
	}
	for key, want := range cases {
		if got := ThumbKey(key); got != want {
			t.Errorf("ThumbKey(%q) = %q, want %q", key, got, want)
		}
	}
}

func readFixture(t *testing.T, path string) []byte {
	t.Helper()
	src, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading fixture %s: %v", path, err)
	}
	return src
}

func makeTestJPEG(t *testing.T, w, h int, c color.Color) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for x := 0; x < w; x++ {
		for y := 0; y < h; y++ {
			img.Set(x, y, c)
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encoding source jpeg failed: %v", err)
	}
	return buf.Bytes()
}

func makeTestPNG(t *testing.T, w, h int, c color.Color) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for x := 0; x < w; x++ {
		for y := 0; y < h; y++ {
			img.Set(x, y, c)
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encoding source png failed: %v", err)
	}
	return buf.Bytes()
}

// makeTestBMP hand-rolls a 24-bit uncompressed BMP (bottom-up rows, BGR).
func makeTestBMP(t *testing.T, w, h int) []byte {
	t.Helper()
	rowSize := (w*3 + 3) &^ 3
	rowPad := rowSize - w*3
	dataSize := rowSize * h
	fileSize := 54 + dataSize

	buf := new(bytes.Buffer)
	write := func(bs ...interface{}) {
		for _, b := range bs {
			if err := binary.Write(buf, binary.LittleEndian, b); err != nil {
				t.Fatalf("writing bmp: %v", err)
			}
		}
	}
	write(uint16(0x4D42), uint32(fileSize), uint32(0), uint32(54))
	write(uint32(40), int32(w), int32(h), uint16(1), uint16(24), uint32(0), uint32(dataSize), int32(2835), int32(2835), uint32(0), uint32(0))

	for y := h - 1; y >= 0; y-- {
		for x := 0; x < w; x++ {
			r := uint8(x % 256)
			g := uint8(y % 256)
			write(uint8(g), uint8(160), r) // B, G, R
		}
		write(bytes.Repeat([]byte{0}, rowPad))
	}
	return buf.Bytes()
}

// makeTestICO hand-rolls an ICO container holding a single PNG-compressed
// image entry (the modern Vista+ ICO layout).
func makeTestICO(t *testing.T, w, h int) []byte {
	t.Helper()
	pngData := makeTestPNG(t, w, h, color.RGBA{R: 220, G: 40, B: 40, A: 255})

	buf := new(bytes.Buffer)
	write := func(bs ...interface{}) {
		for _, b := range bs {
			if err := binary.Write(buf, binary.LittleEndian, b); err != nil {
				t.Fatalf("writing ico: %v", err)
			}
		}
	}
	// ICONDIR: reserved, type=1, count=1
	write(uint16(0), uint16(1), uint16(1))
	// ICONDIRENTRY (16 bytes): 256 encodes as 0
	write(uint8(0), uint8(0), uint8(0), uint8(0), uint16(1), uint16(32), uint32(len(pngData)), uint32(6+16))
	buf.Write(pngData)
	return buf.Bytes()
}
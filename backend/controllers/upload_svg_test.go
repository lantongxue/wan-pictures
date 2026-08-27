package controllers

import "testing"

func TestParseSVGDimensions(t *testing.T) {
	cases := []struct {
		name string
		svg  string
		w, h int
	}{
		{
			name: "explicit width and height",
			svg:  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect/></svg>`,
			w:    800, h: 600,
		},
		{
			name: "single quotes",
			svg:  `<svg width='1200' height='400' viewBox="0 0 1200 400"></svg>`,
			w:    1200, h: 400,
		},
		{
			name: "viewBox only",
			svg:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"></svg>`,
			w:    1920, h: 1080,
		},
		{
			name: "width plus viewBox aspect",
			svg:  `<svg width="640" viewBox="0 0 4 3"></svg>`,
			w:    640, h: 480,
		},
		{
			name: "height plus viewBox aspect",
			svg:  `<svg height="480" viewBox="0 0 4 3"></svg>`,
			w:    640, h: 480,
		},
		{
			name: "px suffix",
			svg:  `<svg width="100px" height="50px"></svg>`,
			w:    100, h: 50,
		},
		{
			name: "no dimensions at all",
			svg:  `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>`,
			w:    0, h: 0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w, h, err := parseSVGDimensions([]byte(tc.svg))
			if tc.w == 0 && tc.h == 0 {
				if err == nil {
					t.Fatalf("expected error for %q", tc.svg)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseSVGDimensions failed: %v", err)
			}
			if w != tc.w || h != tc.h {
				t.Fatalf("got %dx%d, want %dx%d", w, h, tc.w, tc.h)
			}
		})
	}
}
package controllers

import (
	"reflect"
	"testing"
)

func TestParseUploadTags(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    []string
		wantErr bool
	}{
		{name: "empty string", raw: "", want: nil},
		{name: "whitespace only", raw: "   ", want: nil},
		{name: "single tag", raw: "WALLPAPER", want: []string{"WALLPAPER"}},
		{name: "comma separated", raw: "WALLPAPER,4K", want: []string{"WALLPAPER", "4K"}},
		{name: "chinese comma separated", raw: "壁纸，风景", want: []string{"壁纸", "风景"}},
		{name: "semicolon separated", raw: "a;b；c", want: []string{"a", "b", "c"}},
		{name: "chinese dash separated", raw: "a、b", want: []string{"a", "b"}},
		{name: "mixed separators and spaces", raw: "  Photo , 4K ， 壁纸 ", want: []string{"Photo", "4K", "壁纸"}},
		{name: "empty items dropped", raw: "a,,,b", want: []string{"a", "b"}},
		{name: "case-insensitive dedupe", raw: "WALLPAPER,wallpaper,WallPaper", want: []string{"WALLPAPER"}},
		{name: "dedupe after trim", raw: " 4K ,4K", want: []string{"4K"}},
		{name: "ten tags allowed", raw: "a,b,c,d,e,f,g,h,i,j", want: []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}},
		{name: "eleven tags rejected", raw: "a,b,c,d,e,f,g,h,i,j,k", wantErr: true},
		{name: "duplicates do not count toward limit", raw: "a,a,b,b,c,c,d,d,e,e,f,f,g,g,h,h,i,i,j,j", want: []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}},
		{name: "overlong tag rejected", raw: "this_tag_is_way_too_long_to_be_valid_1234567890", wantErr: true},
		{name: "chinese overlong tag rejected", raw: "这是一个非常非常非常非常非常非常非常非常非常非常非常非常长的标签文字", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseUploadTags(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil (tags=%v)", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseUploadTags(%q) = %v, want %v", tt.raw, got, tt.want)
			}
		})
	}
}

func TestFinalizeUploadTags(t *testing.T) {
	tests := []struct {
		name     string
		userTags []string
		ext      string
		want     []string
	}{
		{name: "no user tags -> format tag only", userTags: nil, ext: "png", want: []string{"PNG"}},
		{name: "user tags merged with format tag", userTags: []string{"WALLPAPER", "4K"}, ext: "png", want: []string{"WALLPAPER", "4K", "PNG"}},
		{name: "format tag already present deduped", userTags: []string{"png", "4K"}, ext: "png", want: []string{"png", "4K"}},
		{name: "user tags deduped case-insensitively", userTags: []string{"A", "a", "B"}, ext: "jpg", want: []string{"A", "B", "JPG"}},
		{name: "ten user tags cap out format tag", userTags: []string{"t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"}, ext: "png", want: []string{"t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := finalizeUploadTags(tt.userTags, tt.ext)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("finalizeUploadTags(%v, %q) = %v, want %v", tt.userTags, tt.ext, got, tt.want)
			}
		})
	}
}
package auth

import (
	"encoding/json"
	"testing"
)

func TestHasAudience(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		expected string
		want     bool
	}{
		{name: "single audience", raw: `"core-api"`, expected: "core-api", want: true},
		{name: "multiple audiences", raw: `["account","core-api"]`, expected: "core-api", want: true},
		{name: "wrong audience", raw: `["learn"]`, expected: "core-api", want: false},
		{name: "missing audience", raw: ``, expected: "core-api", want: false},
		{name: "malformed audience", raw: `{}`, expected: "core-api", want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := hasAudience(json.RawMessage(tt.raw), tt.expected); got != tt.want {
				t.Fatalf("hasAudience(%q, %q) = %v, want %v", tt.raw, tt.expected, got, tt.want)
			}
		})
	}
}

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

func TestValidateClient(t *testing.T) {
	for _, tt := range []struct {
		name, setting, azp, client string
		allow                      bool
	}{
		{"authorized party", "101, 202", "202", "", true},
		{"client claim", "101,202", "", "101", true},
		{"matching claims", "101,202", "101", "101", true},
		{"conflicting claims", "101,202", "101", "202", false},
		{"unknown client", "101,202", "201", "", false},
		{"unconfigured", "", "learn", "", false},
		{"missing client", "101,202", "", "", false},
		{"empty entry", "101,", "101", "", false},
		{"wildcard", "101,*", "101", "", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := validateClient(tt.setting, tt.azp, tt.client) == nil; got != tt.allow {
				t.Fatalf("accepted = %v, want %v", got, tt.allow)
			}
		})
	}
}

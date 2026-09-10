package auth

import (
	"encoding/base64"
)

// decodeSegment — يفك base64url بدون padding (JWS compact serialization).
func decodeSegment(seg string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(seg)
}

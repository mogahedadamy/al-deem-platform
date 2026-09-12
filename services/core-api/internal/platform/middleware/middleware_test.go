package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestStatusResponseWriterDefaultsToOK(t *testing.T) {
	recorder := httptest.NewRecorder()
	writer := &statusResponseWriter{ResponseWriter: recorder}
	if _, err := writer.Write([]byte("ok")); err != nil {
		t.Fatal(err)
	}
	if writer.Status() != http.StatusOK || recorder.Code != http.StatusOK {
		t.Fatalf("status=%d recorder=%d", writer.Status(), recorder.Code)
	}
}

func TestStatusResponseWriterPreservesFirstStatus(t *testing.T) {
	recorder := httptest.NewRecorder()
	writer := &statusResponseWriter{ResponseWriter: recorder}
	writer.WriteHeader(http.StatusUnauthorized)
	writer.WriteHeader(http.StatusOK)
	if writer.Status() != http.StatusUnauthorized || recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d recorder=%d", writer.Status(), recorder.Code)
	}
}

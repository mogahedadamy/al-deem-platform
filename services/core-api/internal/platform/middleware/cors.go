// CORS محدد — النطاقات المسموحة فقط (Blueprint 16: CORS محدد).
// المتصفحات تستعمل proxies في التطبيقات، هذا للوصول المباشر المصرّح به.
package middleware

import (
	"net/http"
	"strings"
)

// CORS — يسمح فقط لنطاقات المنصة. النطاقات الأخرى: بلا قرون CORS.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowedOrigin(origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			h.Set("Access-Control-Max-Age", "600")
		}
		// preflight
		if r.Method == http.MethodOptions {
			if origin == "" || !allowedOrigin(origin) {
				w.WriteHeader(http.StatusNoContent) // بلا قرون = المتصفح يرفض
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// allowedOrigin — نطاق المنصة (apex + subdomains) فقط.
func allowedOrigin(origin string) bool {
	for _, d := range []string{
		"https://alameedtraining.com",
		"https://www.alameedtraining.com",
		"https://learn.alameedtraining.com",
		"https://erp.alameedtraining.com",
		// محلي للتطوير
		"http://localhost:3011", "http://localhost:3012", "http://localhost:3013",
	} {
		if strings.EqualFold(origin, d) {
			return true
		}
	}
	return false
}

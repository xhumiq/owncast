package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

// SetHeaders will set our global headers for web resources.
func SetHeaders(w http.ResponseWriter) {
	// Tell Google to not use this response in their FLoC tracking.
	w.Header().Set("Permissions-Policy", "interest-cohort=()")

	// When running automated browser tests we must allow `unsafe-eval` in our CSP
	// so we can explicitly add it only when needed.
	inTest := os.Getenv("BROWSER_TEST") == "true"
	unsafeEval := "'unsafe-inline' 'unsafe-eval'"
	if inTest {
		unsafeEval = `'unsafe-eval'`
	}
	// Content security policy
	// 'sha256-2HPCfJIJHnY0NrRDPTOdC7AOSJIcQyNxzUuut3TsYRY=' 'sha256-qYEKg5UMg/KbbMBkyPIGsxtkfn/safeLBT08DK3592g=' 'sha256-2erOadwY1DsoNdxVjGlxldMJrFEUzr5sLDdB8lmm9m8=' 'sha256-DgrU+KwEGMFcB8B2ZdQyuxWWvTm7LeGpc+8SkxbSxGA='
	csp := []string{
		//fmt.Sprintf("script-src 'self' %s ajax.googleapis.com sha256-2HPCfJIJHnY0NrRDPTOdC7AOSJIcQyNxzUuut3TsYRY=' 'sha256-qYEKg5UMg/KbbMBkyPIGsxtkfn/safeLBT08DK3592g=' 'sha256-2erOadwY1DsoNdxVjGlxldMJrFEUzr5sLDdB8lmm9m8=' 'sha256-DgrU+KwEGMFcB8B2ZdQyuxWWvTm7LeGpc+8SkxbSxGA='", unsafeEval),
		fmt.Sprintf("script-src 'self' %s ajax.googleapis.com ", unsafeEval),
		"worker-src 'self' blob:", // No single quotes around blob:
		"frame-ancestors https://auth-jp1.kefacp.com",
	}
	w.Header().Set("Content-Security-Policy", strings.Join(csp, "; "))
}

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
	var csp []string
	if inTest {
    csp = []string{
      "default-src * 'unsafe-inline' 'unsafe-eval'",
      "font-src * 'unsafe-inline' 'unsafe-eval' 'self' data:",
      "script-src * 'unsafe-inline' 'unsafe-eval'",
      "worker-src * 'unsafe-inline' 'unsafe-eval' 'self' data: blob:",
      "media-src * 'unsafe-inline' 'unsafe-eval' 'self' data: blob:",
      "connect-src * 'unsafe-inline'",
      "img-src * data: blob: 'unsafe-inline'",
      "frame-src *; style-src * 'unsafe-inline'",
    }
	}else{
	  csp = []string{
      fmt.Sprintf("script-src 'self' %s 'sha256-2HPCfJIJHnY0NrRDPTOdC7AOSJIcQyNxzUuut3TsYRY=' 'sha256-qYEKg5UMg/KbbMBkyPIGsxtkfn/safeLBT08DK3592g=' 'sha256-2erOadwY1DsoNdxVjGlxldMJrFEUzr5sLDdB8lmm9m8=' 'sha256-DgrU+KwEGMFcB8B2ZdQyuxWWvTm7LeGpc+8SkxbSxGA='", ""),
      "worker-src 'self' blob:", // No single quotes around blob:
    }
	}
	// Content security policy
	w.Header().Set("Content-Security-Policy", strings.Join(csp, "; "))
}

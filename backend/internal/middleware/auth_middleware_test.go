package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"si-bvet/internal/middleware"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

// MockTokenValidator untuk mock token validation
type MockTokenValidator struct {
	validateTokenCalled bool
	validateTokenError  error
	validateTokenClaims *utils.JWTClaims
}

func TestAuthMiddleware(t *testing.T) {
	gomega.RegisterFailHandler(ginkgo.Fail)
	ginkgo.RunSpecs(t, "AuthMiddleware Suite")
}

var _ = ginkgo.Describe("AuthMiddleware", func() {
	var (
		router *gin.Engine
		w      *httptest.ResponseRecorder
	)

	ginkgo.BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		router = gin.New()

		previousSecret, hadSecret := os.LookupEnv("JWT_SECRET")
		_ = os.Setenv("JWT_SECRET", "test-secret-key")

		ginkgo.DeferCleanup(func() {
			if hadSecret {
				_ = os.Setenv("JWT_SECRET", previousSecret)
				return
			}

			_ = os.Unsetenv("JWT_SECRET")
		})
	})

	ginkgo.Context("when Authorization header is missing", func() {
		ginkgo.It("should return 401 with Authorization header missing error", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			// Tidak set Authorization header
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Authorization header missing"))
		})
	})

	ginkgo.Context("when Authorization format is invalid (no Bearer)", func() {
		ginkgo.It("should return 401 with Invalid authorization format error", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "token_only_without_bearer")
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Invalid authorization format"))
		})
	})

	ginkgo.Context("when Authorization has wrong number of parts", func() {
		ginkgo.It("should return 401 with Invalid authorization format error", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "Bearer token extra_part")
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Invalid authorization format"))
		})
	})

	ginkgo.Context("when token is invalid", func() {
		ginkgo.It("should return 401 with Invalid or expired token error", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "Bearer invalid_token_xyz")
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Invalid or expired token"))
		})
	})

	ginkgo.Context("when token format has extra spaces", func() {
		ginkgo.It("should return 401 with Invalid authorization format error", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "  Bearer   ")
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
		})
	})

	ginkgo.Context("when token is valid", func() {
		ginkgo.It("should set user_id and role in context and continue", func() {
			// Arrange
			token, _ := utils.GenerateToken(5, "admin")

			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				userID, _ := c.Get("user_id")
				role, _ := c.Get("role")

				c.JSON(http.StatusOK, gin.H{
					"message": "success",
					"user_id": userID,
					"role":    role,
				})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("success"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("admin"))
		})
	})

	ginkgo.Context("when valid token is used", func() {
		ginkgo.It("should make context values accessible to handler", func() {
			// Arrange
			token, _ := utils.GenerateToken(10, "customer")
			contextUserID := uint(0)
			contextRole := ""

			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				userIDInterface, exists := c.Get("user_id")
				if exists {
					contextUserID = userIDInterface.(uint)
				}

				roleInterface, exists := c.Get("role")
				if exists {
					contextRole = roleInterface.(string)
				}

				c.JSON(http.StatusOK, gin.H{"message": "ok"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(contextUserID).To(gomega.Equal(uint(10)))
			gomega.Expect(contextRole).To(gomega.Equal("customer"))
		})
	})

	ginkgo.Context("when multiple middleware layers are used", func() {
		ginkgo.It("should abort request when auth fails", func() {
			// Arrange
			handlerCalled := false

			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				handlerCalled = true
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			// Tidak set header
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(handlerCalled).To(gomega.BeFalse())
		})
	})

	ginkgo.Context("when Bearer keyword is lowercase", func() {
		ginkgo.It("should accept only uppercase Bearer", func() {
			// Arrange
			router.GET("/protected", middleware.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "bearer sometoken")
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Invalid authorization format"))
		})
	})
})

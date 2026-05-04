package middleware_test

import (
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)
var _ = ginkgo.Describe("RequireRole Middleware", func() {
	var (
		router *gin.Engine
		w      *httptest.ResponseRecorder
	)

	ginkgo.BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		router = gin.New()
	})

	ginkgo.Context("when user role matches single required role", func() {
		ginkgo.It("should allow request to continue", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "customer")
				c.Next()
			}, middleware.RequireRole("customer"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("success"))
		})
	})

	ginkgo.Context("when user role matches one of multiple allowed roles", func() {
		ginkgo.It("should allow request to continue", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "admin")
				c.Next()
			}, middleware.RequireRole("superadmin", "admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("success"))
		})
	})

	ginkgo.Context("when user role is not in context", func() {
		ginkgo.It("should return 403 with role not found error", func() {
			// Arrange
			router.GET("/admin", middleware.RequireRole("customer"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("role not found"))
		})
	})

	ginkgo.Context("when user role does not match allowed roles", func() {
		ginkgo.It("should return 403 with access denied error", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "customer")
				c.Next()
			}, middleware.RequireRole("superadmin", "admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("access denied"))
		})
	})

	ginkgo.Context("when superadmin role is required", func() {
		ginkgo.It("should allow superadmin access", func() {
			// Arrange
			router.GET("/superadmin", func(c *gin.Context) {
				c.Set("role", "superadmin")
				c.Next()
			}, middleware.RequireRole("superadmin", "admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/superadmin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
		})
	})

	ginkgo.Context("when admin role is required", func() {
		ginkgo.It("should allow admin access", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "admin")
				c.Next()
			}, middleware.RequireRole("superadmin", "admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
		})
	})

	ginkgo.Context("when request is aborted due to insufficient role", func() {
		ginkgo.It("should prevent handler execution", func() {
			// Arrange
			handlerExecuted := false

			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "customer")
				c.Next()
			}, middleware.RequireRole("admin"), func(c *gin.Context) {
				handlerExecuted = true
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(handlerExecuted).To(gomega.BeFalse())
		})
	})

	ginkgo.Context("when role context value is empty string", func() {
		ginkgo.It("should not match any allowed role and return 403", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "")
				c.Next()
			}, middleware.RequireRole("admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
		})
	})

	ginkgo.Context("when role is checked case-sensitively", func() {
		ginkgo.It("should not match ADMIN with admin", func() {
			// Arrange
			router.GET("/admin", func(c *gin.Context) {
				c.Set("role", "ADMIN") // Uppercase
				c.Next()
			}, middleware.RequireRole("admin"), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/admin", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			// Case-sensitive check - should fail
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
		})
	})

	ginkgo.Context("when no required roles are specified", func() {
		ginkgo.It("should allow any role to pass", func() {
			// Arrange
			router.GET("/public", func(c *gin.Context) {
				c.Set("role", "customer")
				c.Next()
			}, middleware.RequireRole(), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req := httptest.NewRequest("GET", "/public", nil)
			w = httptest.NewRecorder()

			// Act
			router.ServeHTTP(w, req)

			// Assert
			// If no roles are required, should allow
			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
		})
	})
})

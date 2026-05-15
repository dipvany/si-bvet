package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

// MockAuthService untuk mock AuthService
type MockAuthService struct {
	registerUserCalled bool
	registerUserUser   *models.User
	registerUserError  error

	loginUserCalled   bool
	loginUserEmail    string
	loginUserPassword string
	loginUserResult   *models.User
	loginUserError    error
}

func (m *MockAuthService) RegisterUser(user *models.User) error {
	m.registerUserCalled = true
	m.registerUserUser = user
	return m.registerUserError
}

func (m *MockAuthService) LoginUser(email, password string) (*models.User, error) {
	m.loginUserCalled = true
	m.loginUserEmail = email
	m.loginUserPassword = password
	return m.loginUserResult, m.loginUserError
}

// MockUserRepository untuk dummy implementation
type MockUserRepository struct{}

func (m *MockUserRepository) CreateUser(user *models.User) error {
	return nil
}

func (m *MockUserRepository) GetUserByEmail(email string) (*models.User, error) {
	return nil, nil
}

var _ = ginkgo.Describe("AuthHandler", func() {

	// ============================================================================
	// REGISTER CUSTOMER HANDLER TESTS
	// ============================================================================

	ginkgo.Describe("RegisterCustomer", func() {
		var (
			router        *gin.Engine
			mockService   *MockAuthService
			authHandler   *handlers.AuthHandler
			w             *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockAuthService{}
			authHandler = handlers.NewAuthHandler(mockService)

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

		ginkgo.Context("when input is valid with file", func() {
			ginkgo.It("should register customer successfully", func() {
				// Arrange
				mockService.registerUserError = nil

				router.POST("/register", authHandler.RegisterCustomer)

				// Create multipart form
				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)

				// Add form fields
				writer.WriteField("fullName", "John Doe")
				writer.WriteField("email", "john@example.com")
				writer.WriteField("phone", "081234567890")
				writer.WriteField("password", "password123")
				writer.WriteField("institution", "Test Institution")

				// Add file
				part, _ := writer.CreateFormFile("registration_doc", "document.pdf")
				io.WriteString(part, "dummy pdf content")
				writer.Close()

				req := httptest.NewRequest("POST", "/register", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusCreated))
				gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Registration successful"))
				gomega.Expect(mockService.registerUserCalled).To(gomega.BeTrue())
			})
		})

		ginkgo.Context("when JSON payload is invalid", func() {
			ginkgo.It("should return 400 error", func() {
				// Arrange
				router.POST("/register", authHandler.RegisterCustomer)

				req := httptest.NewRequest("POST", "/register", bytes.NewBufferString("invalid json"))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			})
		})

		ginkgo.Context("when registration document is missing", func() {
			ginkgo.It("should return 400 with document required error", func() {
				// Arrange
				router.POST("/register", authHandler.RegisterCustomer)

				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				writer.WriteField("fullName", "John Doe")
				writer.WriteField("email", "john@example.com")
				writer.WriteField("phone", "081234567890")
				writer.WriteField("password", "password123")
				writer.WriteField("institution", "Test Institution")
				// Tidak add file
				writer.Close()

				req := httptest.NewRequest("POST", "/register", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
				gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("document registration is required"))
			})
		})

		ginkgo.Context("when service registration fails", func() {
			ginkgo.It("should return 500 with service error message", func() {
				// Arrange
				mockService.registerUserError = io.ErrUnexpectedEOF

				router.POST("/register", authHandler.RegisterCustomer)

				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				writer.WriteField("fullName", "Jane Doe")
				writer.WriteField("email", "jane@example.com")
				writer.WriteField("phone", "081234567890")
				writer.WriteField("password", "password123")
				writer.WriteField("institution", "Test Institution")

				part, _ := writer.CreateFormFile("registration_doc", "doc.pdf")
				io.WriteString(part, "content")
				writer.Close()

				req := httptest.NewRequest("POST", "/register", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			})
		})

		ginkgo.Context("when registered user has correct role", func() {
			ginkgo.It("should set role to customer", func() {
				// Arrange
				mockService.registerUserError = nil

				router.POST("/register", authHandler.RegisterCustomer)

				body := &bytes.Buffer{}
				writer := multipart.NewWriter(body)
				writer.WriteField("fullName", "Alice")
				writer.WriteField("email", "alice@example.com")
				writer.WriteField("phone", "089999999")
				writer.WriteField("password", "pass123")
				writer.WriteField("institution", "Test Institution")

				part, _ := writer.CreateFormFile("registration_doc", "doc.pdf")
				io.WriteString(part, "content")
				writer.Close()

				req := httptest.NewRequest("POST", "/register", body)
				req.Header.Set("Content-Type", writer.FormDataContentType())
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(mockService.registerUserCalled).To(gomega.BeTrue())
				// Check bahwa user yang di-pass ke service punya role customer
				gomega.Expect(mockService.registerUserUser.Role).To(gomega.Equal("customer"))
			})
		})
	})

	// ============================================================================
	// LOGIN HANDLER TESTS
	// ============================================================================

	ginkgo.Describe("Login", func() {
		var (
			router        *gin.Engine
			mockService   *MockAuthService
			authHandler   *handlers.AuthHandler
			w             *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockAuthService{}
			authHandler = handlers.NewAuthHandler(mockService)

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

		ginkgo.Context("when credentials are valid", func() {
			ginkgo.It("should return 200 with token and user data", func() {
				// Arrange
				mockService.loginUserResult = &models.User{
					ID:       1,
					FullName: "John Doe",
					Email:    "john@example.com",
					Role:     "customer",
				}
				mockService.loginUserError = nil

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "john@example.com",
					Password: "password123",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
				gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Login successful"))
				gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("token"))
				gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("john@example.com"))
				gomega.Expect(mockService.loginUserCalled).To(gomega.BeTrue())
				gomega.Expect(mockService.loginUserEmail).To(gomega.Equal("john@example.com"))
				gomega.Expect(mockService.loginUserPassword).To(gomega.Equal("password123"))
			})
		})

		ginkgo.Context("when JSON payload is invalid", func() {
			ginkgo.It("should return 400 error", func() {
				// Arrange
				router.POST("/login", authHandler.Login)

				req := httptest.NewRequest("POST", "/login", bytes.NewBufferString("invalid"))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			})
		})

		ginkgo.Context("when email is not found", func() {
			ginkgo.It("should return 401 with email not found error", func() {
				// Arrange
				mockService.loginUserError = io.ErrUnexpectedEOF

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "notfound@example.com",
					Password: "password123",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			})
		})

		ginkgo.Context("when password is incorrect", func() {
			ginkgo.It("should return 401 with password incorrect error", func() {
				// Arrange
				mockService.loginUserError = io.ErrUnexpectedEOF

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "user@example.com",
					Password: "wrongpassword",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			})
		})

		ginkgo.Context("when response contains user data", func() {
			ginkgo.It("should include id, fullname, email, and role in response", func() {
				// Arrange
				mockService.loginUserResult = &models.User{
					ID:       42,
					FullName: "Alice Smith",
					Email:    "alice@example.com",
					Role:     "admin",
				}
				mockService.loginUserError = nil

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "alice@example.com",
					Password: "password123",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))

				var response map[string]interface{}
				json.Unmarshal(w.Body.Bytes(), &response)

				userObj := response["user"].(map[string]interface{})
				gomega.Expect(int(userObj["id"].(float64))).To(gomega.Equal(42))
				gomega.Expect(userObj["fullname"].(string)).To(gomega.Equal("Alice Smith"))
				gomega.Expect(userObj["email"].(string)).To(gomega.Equal("alice@example.com"))
				gomega.Expect(userObj["role"].(string)).To(gomega.Equal("admin"))
			})
		})

		ginkgo.Context("when login calls service with correct parameters", func() {
			ginkgo.It("should pass email and password to service", func() {
				// Arrange
				mockService.loginUserResult = &models.User{
					ID:       1,
					Email:    "test@example.com",
					Role:     "customer",
					FullName: "Test User",
				}
				mockService.loginUserError = nil

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "test@example.com",
					Password: "secretpass",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(mockService.loginUserCalled).To(gomega.BeTrue())
				gomega.Expect(mockService.loginUserEmail).To(gomega.Equal("test@example.com"))
				gomega.Expect(mockService.loginUserPassword).To(gomega.Equal("secretpass"))
			})
		})

		ginkgo.Context("when login response always contains token", func() {
			ginkgo.It("should have token field in response", func() {
				// Arrange
				mockService.loginUserResult = &models.User{
					ID:       1,
					Email:    "user@example.com",
					Role:     "customer",
					FullName: "User",
				}
				mockService.loginUserError = nil

				router.POST("/login", authHandler.Login)

				loginReq := dto.LoginRequest{
					Email:    "user@example.com",
					Password: "pass123",
				}
				body, _ := json.Marshal(loginReq)

				req := httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
				req.Header.Set("Content-Type", "application/json")
				w = httptest.NewRecorder()

				// Act
				router.ServeHTTP(w, req)

				// Assert
				gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))

				var response map[string]interface{}
				json.Unmarshal(w.Body.Bytes(), &response)

				gomega.Expect(response).To(gomega.HaveKey("token"))
				gomega.Expect(response["token"]).NotTo(gomega.BeEmpty())
			})
		})
	})
})

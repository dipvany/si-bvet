package services_test

import (
	"errors"
	"testing"

	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"golang.org/x/crypto/bcrypt"
)

// MockUserRepository untuk mock repository dalam testing
type MockUserRepository struct {
	createUserCalled bool
	createUserError  error
	createUserUser   *models.User

	getUserByEmailCalled bool
	getUserByEmailError  error
	getUserByEmailUser   *models.User
	getUserByEmailEmail  string
}

func (m *MockUserRepository) CreateUser(user *models.User) error {
	m.createUserCalled = true
	m.createUserUser = user
	return m.createUserError
}

func (m *MockUserRepository) GetUserByEmail(email string) (*models.User, error) {
	m.getUserByEmailCalled = true
	m.getUserByEmailEmail = email
	return m.getUserByEmailUser, m.getUserByEmailError
}

func TestAuthService(t *testing.T) {
	gomega.RegisterFailHandler(ginkgo.Fail)
	ginkgo.RunSpecs(t, "AuthService Suite")
}

var _ = ginkgo.Describe("AuthService", func() {

	// ============================================================================
	// REGISTER USER TESTS
	// ============================================================================

	ginkgo.Describe("RegisterUser", func() {
		var (
			mockRepo *MockUserRepository
			service  *services.AuthService
			user     *models.User
		)

		ginkgo.BeforeEach(func() {
			mockRepo = &MockUserRepository{}
			service = services.NewAuthService(mockRepo)
			user = &models.User{
				FullName:     "John Doe",
				Email:        "john@example.com",
				Phone:        "081234567890",
				PasswordHash: "plainpassword123",
				Role:         "customer",
				IsVerified:   false,
			}
		})

		ginkgo.Context("when input is valid", func() {
			ginkgo.It("should hash password and save user to repository", func() {
				// Arrange
				plainPassword := user.PasswordHash

				// Act
				err := service.RegisterUser(user)

				// Assert
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				gomega.Expect(mockRepo.createUserCalled).To(gomega.BeTrue())
				gomega.Expect(user.PasswordHash).NotTo(gomega.Equal(plainPassword))
				gomega.Expect(user.PasswordHash).NotTo(gomega.BeEmpty())

				// Verify password hash is valid with bcrypt
				err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(plainPassword))
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
			})
		})

		ginkgo.Context("when password is too long", func() {
			ginkgo.It("should return hash error", func() {
				// Arrange
				user.PasswordHash = string(make([]byte, 200)) // Terlalu panjang untuk bcrypt

				// Act
				err := service.RegisterUser(user)

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(mockRepo.createUserCalled).To(gomega.BeFalse())
			})
		})

		ginkgo.Context("when repository returns error", func() {
			ginkgo.It("should return repository error", func() {
				// Arrange
				mockRepo.createUserError = errors.New("database error")

				// Act
				err := service.RegisterUser(user)

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(err.Error()).To(gomega.Equal("database error"))
				gomega.Expect(mockRepo.createUserCalled).To(gomega.BeTrue())
			})
		})

		ginkgo.Context("when password is empty", func() {
			ginkgo.It("should hash empty string and save", func() {
				// Arrange
				user.PasswordHash = ""

				// Act
				err := service.RegisterUser(user)

				// Assert
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				gomega.Expect(mockRepo.createUserCalled).To(gomega.BeTrue())
				gomega.Expect(user.PasswordHash).NotTo(gomega.BeEmpty())
			})
		})

		ginkgo.Context("when user struct is preserved during registration", func() {
			ginkgo.It("should keep other user fields intact", func() {
				// Arrange
				user.FullName = "Jane Smith"
				user.Email = "jane@example.com"
				user.Role = "admin"

				// Act
				service.RegisterUser(user)

				// Assert
				gomega.Expect(mockRepo.createUserUser.FullName).To(gomega.Equal("Jane Smith"))
				gomega.Expect(mockRepo.createUserUser.Email).To(gomega.Equal("jane@example.com"))
				gomega.Expect(mockRepo.createUserUser.Role).To(gomega.Equal("admin"))
			})
		})
	})

	// ============================================================================
	// LOGIN USER TESTS
	// ============================================================================

	ginkgo.Describe("LoginUser", func() {
		var (
			mockRepo      *MockUserRepository
			service       *services.AuthService
			plainPassword string
			hashedPassword string
			user          *models.User
		)

		ginkgo.BeforeEach(func() {
			mockRepo = &MockUserRepository{}
			service = services.NewAuthService(mockRepo)
			plainPassword = "password123"
			hash, _ := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
			hashedPassword = string(hash)
			user = &models.User{
				ID:           1,
				FullName:     "John Doe",
				Email:        "john@example.com",
				PasswordHash: hashedPassword,
				Role:         "customer",
				IsVerified:   true,
			}
		})

		ginkgo.Context("when credentials are valid", func() {
			ginkgo.It("should return user successfully", func() {
				// Arrange
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act
				loggedInUser, err := service.LoginUser("john@example.com", plainPassword)

				// Assert
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				gomega.Expect(loggedInUser).NotTo(gomega.BeNil())
				gomega.Expect(loggedInUser.ID).To(gomega.Equal(uint(1)))
				gomega.Expect(loggedInUser.Email).To(gomega.Equal("john@example.com"))
				gomega.Expect(loggedInUser.Role).To(gomega.Equal("customer"))
				gomega.Expect(mockRepo.getUserByEmailCalled).To(gomega.BeTrue())
				gomega.Expect(mockRepo.getUserByEmailEmail).To(gomega.Equal("john@example.com"))
			})
		})

		ginkgo.Context("when email is not found", func() {
			ginkgo.It("should return email not found error", func() {
				// Arrange
				mockRepo.getUserByEmailUser = nil
				mockRepo.getUserByEmailError = errors.New("user not found")

				// Act
				loggedInUser, err := service.LoginUser("notfound@example.com", plainPassword)

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(err.Error()).To(gomega.Equal("email not found"))
				gomega.Expect(loggedInUser).To(gomega.BeNil())
			})
		})

		ginkgo.Context("when account is not verified", func() {
			ginkgo.It("should return account not verified error", func() {
				// Arrange
				user.IsVerified = false
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act
				loggedInUser, err := service.LoginUser("john@example.com", plainPassword)

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(err.Error()).To(gomega.Equal("account not verified by admin"))
				gomega.Expect(loggedInUser).To(gomega.BeNil())
			})
		})

		ginkgo.Context("when password is incorrect", func() {
			ginkgo.It("should return password incorrect error", func() {
				// Arrange
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act
				loggedInUser, err := service.LoginUser("john@example.com", "wrongpassword")

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(err.Error()).To(gomega.Equal("password incorrect"))
				gomega.Expect(loggedInUser).To(gomega.BeNil())
			})
		})

		ginkgo.Context("when password hash is empty", func() {
			ginkgo.It("should return error", func() {
				// Arrange
				user.PasswordHash = ""
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act
				loggedInUser, err := service.LoginUser("john@example.com", plainPassword)

				// Assert
				gomega.Expect(err).To(gomega.HaveOccurred())
				gomega.Expect(loggedInUser).To(gomega.BeNil())
			})
		})

		ginkgo.Context("when multiple login attempts are made", func() {
			ginkgo.It("should handle sequential login calls correctly", func() {
				// Arrange
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act - First login
				loggedInUser1, err1 := service.LoginUser("john@example.com", plainPassword)

				// Assert - First login
				gomega.Expect(err1).NotTo(gomega.HaveOccurred())
				gomega.Expect(loggedInUser1).NotTo(gomega.BeNil())

				// Act - Second login with wrong password
				loggedInUser2, err2 := service.LoginUser("john@example.com", "wrongpassword")

				// Assert - Second login
				gomega.Expect(err2).To(gomega.HaveOccurred())
				gomega.Expect(loggedInUser2).To(gomega.BeNil())
			})
		})

		ginkgo.Context("when login with different roles", func() {
			ginkgo.It("should preserve user role from repository", func() {
				// Arrange
				user.Role = "admin"
				mockRepo.getUserByEmailUser = user
				mockRepo.getUserByEmailError = nil

				// Act
				loggedInUser, err := service.LoginUser("john@example.com", plainPassword)

				// Assert
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				gomega.Expect(loggedInUser.Role).To(gomega.Equal("admin"))
			})
		})
	})
})

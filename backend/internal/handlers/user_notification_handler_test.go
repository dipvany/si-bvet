package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

type MockUserService struct {
	getCalled bool
	getUserID uint
	getRole    string
	getResult models.User
	getErr    error

	updateCalled bool
	updateUserID uint
	updateRole   string
	updateReq    dto.ProfileRequest
	updateErr    error
}

var _ handlers.UserServiceInterface = (*MockUserService)(nil)

func (m *MockUserService) GetUserProfile(userID uint) (models.User, error) {
	m.getCalled = true
	m.getUserID = userID
	return m.getResult, m.getErr
}

func (m *MockUserService) GetProfileByRole(userID uint, role string) (interface{}, error) {
	m.getCalled = true
	m.getUserID = userID
	m.getRole = role
	return m.getResult, m.getErr
}

func (m *MockUserService) UpdateProfile(userID uint, role string, req dto.ProfileRequest) error {
	m.updateCalled = true
	m.updateUserID = userID
	m.updateRole = role
	m.updateReq = req
	return m.updateErr
}

type MockNotificationService struct {
	getCalled bool
	getUserID uint
	getResult []models.Notification
	getErr    error

	markCalled     bool
	markUserID     uint
	markNotificationID uint
	markErr        error

	markAllCalled bool
	markAllUserID uint
	markAllErr    error
}

var _ handlers.NotificationServiceInterface = (*MockNotificationService)(nil)

func (m *MockNotificationService) GetMyNotifications(userID uint) ([]models.Notification, error) {
	m.getCalled = true
	m.getUserID = userID
	return m.getResult, m.getErr
}

func (m *MockNotificationService) MarkMyNotificationAsRead(userID, notificationID uint) error {
	m.markCalled = true
	m.markUserID = userID
	m.markNotificationID = notificationID
	return m.markErr
}

func (m *MockNotificationService) MarkAllMyNotificationsAsRead(userID uint) error {
	m.markAllCalled = true
	m.markAllUserID = userID
	return m.markAllErr
}

func stringPtr(value string) *string {
	return &value
}

var _ = Describe("User and Notification Handlers", func() {
	var router *gin.Engine
	var w *httptest.ResponseRecorder

	BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		router = gin.New()
		w = httptest.NewRecorder()
	})

	Describe("UserHandler", func() {
		var mockService *MockUserService
		var handler *handlers.UserHandler

		BeforeEach(func() {
			mockService = &MockUserService{}
			handler = handlers.NewUserHandler(mockService)
		})

		Context("when authenticated", func() {
			BeforeEach(func() {
				router.Use(func(c *gin.Context) {
					c.Set("user_id", uint(55))
					c.Set("role", "customer")
					c.Next()
				})
				router.GET("/profile", handler.Profile)
				router.PATCH("/profile", handler.UpdateProfile)
			})

			It("should get user profile", func() {
				mockService.getResult = models.User{ID: 55, FullName: "Jane Doe", Email: "jane@example.com", Role: "customer"}
				req := httptest.NewRequest(http.MethodGet, "/profile", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("Jane Doe"))
				Expect(mockService.getCalled).To(BeTrue())
				Expect(mockService.getUserID).To(Equal(uint(55)))
			})

			It("should update user profile", func() {
				updateBody, err := json.Marshal(dto.ProfileRequest{
					FullName: stringPtr("Jane Doe Updated"),
					Phone:    stringPtr("08123456789"),
				})
				Expect(err).NotTo(HaveOccurred())
				req := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewReader(updateBody))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("Profile updated successfully"))
				Expect(mockService.updateCalled).To(BeTrue())
				Expect(mockService.updateUserID).To(Equal(uint(55)))
				Expect(mockService.updateRole).To(Equal("customer"))
				Expect(mockService.updateReq.FullName).To(Equal(stringPtr("Jane Doe Updated")))
			})

			It("should return bad request for invalid update JSON", func() {
				req := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewBufferString("invalid json"))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusBadRequest))
				Expect(mockService.updateCalled).To(BeFalse())
			})
		})

		Context("when not authenticated", func() {
			BeforeEach(func() {
				router.GET("/profile", handler.Profile)
				router.PATCH("/profile", handler.UpdateProfile)
			})

			It("should return unauthorized for profile", func() {
				req := httptest.NewRequest(http.MethodGet, "/profile", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusUnauthorized))
				Expect(mockService.getCalled).To(BeFalse())
			})

			It("should return unauthorized for update", func() {
				req := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewBufferString("{}"))
				req.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusUnauthorized))
				Expect(mockService.updateCalled).To(BeFalse())
			})
		})
	})

	Describe("NotificationHandler", func() {
		var mockService *MockNotificationService
		var handler *handlers.NotificationHandler

		BeforeEach(func() {
			mockService = &MockNotificationService{}
			handler = handlers.NewNotificationHandler(mockService)
		})

		Context("when authenticated", func() {
			BeforeEach(func() {
				router.Use(func(c *gin.Context) {
					c.Set("user_id", uint(11))
					c.Next()
				})
				router.GET("/notifications", handler.GetMyNotifications)
				router.PATCH("/notifications/:id/read", handler.MarkNotificationAsRead)
				router.PATCH("/notifications/read-all", handler.MarkAllNotificationsAsRead)
			})

			It("should get notifications", func() {
				mockService.getResult = []models.Notification{{ID: 1, Title: "Reminder", Message: "Please review", Type: "info"}}
				req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("Reminder"))
				Expect(mockService.getCalled).To(BeTrue())
				Expect(mockService.getUserID).To(Equal(uint(11)))
			})

			It("should mark notification as read", func() {
				req := httptest.NewRequest(http.MethodPatch, "/notifications/9/read", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("Notification marked as read"))
				Expect(mockService.markCalled).To(BeTrue())
				Expect(mockService.markUserID).To(Equal(uint(11)))
				Expect(mockService.markNotificationID).To(Equal(uint(9)))
			})

			It("should mark all notifications as read", func() {
				req := httptest.NewRequest(http.MethodPatch, "/notifications/read-all", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("All notifications marked as read"))
				Expect(mockService.markAllCalled).To(BeTrue())
				Expect(mockService.markAllUserID).To(Equal(uint(11)))
			})

			It("should return bad request for invalid notification ID", func() {
				req := httptest.NewRequest(http.MethodPatch, "/notifications/abc/read", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusBadRequest))
			})
		})

		Context("when not authenticated", func() {
			It("should return unauthorized", func() {
				router.GET("/notifications", handler.GetMyNotifications)
				req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusUnauthorized))
				Expect(mockService.getCalled).To(BeFalse())
			})
		})
	})
})
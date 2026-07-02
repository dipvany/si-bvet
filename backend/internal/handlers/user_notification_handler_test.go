package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
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

func TestUserAndNotificationHandlers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("UserHandler Profile and UpdateProfile", func(t *testing.T) {
		mockService := &MockUserService{
			getResult: models.User{ID: 55, FullName: "Jane Doe", Email: "jane@example.com", Role: "customer"},
		}
		handler := handlers.NewUserHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(55))
			c.Set("role", "customer")
			c.Next()
		})
		router.GET("/profile", handler.Profile)
		router.PATCH("/profile", handler.UpdateProfile)

		profileReq := httptest.NewRequest(http.MethodGet, "/profile", nil)
		profileRes := httptest.NewRecorder()
		router.ServeHTTP(profileRes, profileReq)

		if profileRes.Code != http.StatusOK {
			t.Fatalf("expected profile status 200, got %d", profileRes.Code)
		}
		if !strings.Contains(profileRes.Body.String(), "Jane Doe") {
			t.Fatalf("unexpected profile body: %s", profileRes.Body.String())
		}
		if !mockService.getCalled || mockService.getUserID != 55 {
			t.Fatalf("unexpected profile service call: %+v", mockService)
		}

		updateBody, err := json.Marshal(dto.ProfileRequest{
			FullName: stringPtr("Jane Doe Updated"),
			Phone:    stringPtr("08123456789"),
		})
		if err != nil {
			t.Fatalf("marshal update request: %v", err)
		}
		updateReq := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewReader(updateBody))
		updateReq.Header.Set("Content-Type", "application/json")
		updateRes := httptest.NewRecorder()
		router.ServeHTTP(updateRes, updateReq)

		if updateRes.Code != http.StatusOK {
			t.Fatalf("expected update status 200, got %d", updateRes.Code)
		}
		if !strings.Contains(updateRes.Body.String(), "Profile updated successfully") {
			t.Fatalf("unexpected update body: %s", updateRes.Body.String())
		}
		if !mockService.updateCalled || mockService.updateUserID != 55 || mockService.updateRole != "customer" {
			t.Fatalf("unexpected update service call: %+v", mockService)
		}
		if mockService.updateReq.FullName == nil || *mockService.updateReq.FullName != "Jane Doe Updated" {
			t.Fatalf("unexpected full name in update request: %+v", mockService.updateReq.FullName)
		}
	
	})

	t.Run("UserHandler error paths", func(t *testing.T) {
		mockService := &MockUserService{}
		handler := handlers.NewUserHandler(mockService)
		router := gin.New()
		router.GET("/profile", handler.Profile)
		router.PATCH("/profile", handler.UpdateProfile)

		profileReq := httptest.NewRequest(http.MethodGet, "/profile", nil)
		profileRes := httptest.NewRecorder()
		router.ServeHTTP(profileRes, profileReq)

		if profileRes.Code != http.StatusUnauthorized {
			t.Fatalf("expected profile unauthorized status 401, got %d", profileRes.Code)
		}
		if mockService.getCalled {
			t.Fatal("profile service should not be called without user id")
		}

		updateReq := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewBufferString("invalid json"))
		updateReq.Header.Set("Content-Type", "application/json")
		updateRes := httptest.NewRecorder()
		router.ServeHTTP(updateRes, updateReq)

		if updateRes.Code != http.StatusUnauthorized {
			t.Fatalf("expected update unauthorized status 401, got %d", updateRes.Code)
		}
	})

	t.Run("UpdateProfile rejects invalid JSON when context is present", func(t *testing.T) {
		mockService := &MockUserService{}
		handler := handlers.NewUserHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(55))
			c.Set("role", "customer")
			c.Next()
		})
		router.PATCH("/profile", handler.UpdateProfile)

		req := httptest.NewRequest(http.MethodPatch, "/profile", bytes.NewBufferString("invalid json"))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()

		router.ServeHTTP(res, req)

		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected bad request status 400, got %d", res.Code)
		}
		if mockService.updateCalled {
			t.Fatal("update service should not be called for invalid json")
		}
	})

	t.Run("NotificationHandler Get and Mark actions", func(t *testing.T) {
		mockService := &MockNotificationService{
			getResult: []models.Notification{{ID: 1, Title: "Reminder", Message: "Please review", Type: "info"}},
		}
		handler := handlers.NewNotificationHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(11))
			c.Next()
		})
		router.GET("/notifications", handler.GetMyNotifications)
		router.PATCH("/notifications/:id/read", handler.MarkNotificationAsRead)
		router.PATCH("/notifications/read-all", handler.MarkAllNotificationsAsRead)

		getReq := httptest.NewRequest(http.MethodGet, "/notifications", nil)
		getRes := httptest.NewRecorder()
		router.ServeHTTP(getRes, getReq)

		if getRes.Code != http.StatusOK {
			t.Fatalf("expected notifications status 200, got %d", getRes.Code)
		}
		if !strings.Contains(getRes.Body.String(), "Reminder") {
			t.Fatalf("unexpected notifications body: %s", getRes.Body.String())
		}
		if !mockService.getCalled || mockService.getUserID != 11 {
			t.Fatalf("unexpected get notifications service call: %+v", mockService)
		}

		invalidReq := httptest.NewRequest(http.MethodPatch, "/notifications/abc/read", nil)
		invalidRes := httptest.NewRecorder()
		router.ServeHTTP(invalidRes, invalidReq)

		if invalidRes.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid id status 400, got %d", invalidRes.Code)
		}

		markReq := httptest.NewRequest(http.MethodPatch, "/notifications/9/read", nil)
		markRes := httptest.NewRecorder()
		router.ServeHTTP(markRes, markReq)

		if markRes.Code != http.StatusOK {
			t.Fatalf("expected mark status 200, got %d", markRes.Code)
		}
		if !strings.Contains(markRes.Body.String(), "Notification marked as read") {
			t.Fatalf("unexpected mark body: %s", markRes.Body.String())
		}
		if !mockService.markCalled || mockService.markUserID != 11 || mockService.markNotificationID != 9 {
			t.Fatalf("unexpected mark service call: %+v", mockService)
		}

		markAllReq := httptest.NewRequest(http.MethodPatch, "/notifications/read-all", nil)
		markAllRes := httptest.NewRecorder()
		router.ServeHTTP(markAllRes, markAllReq)

		if markAllRes.Code != http.StatusOK {
			t.Fatalf("expected mark-all status 200, got %d", markAllRes.Code)
		}
		if !strings.Contains(markAllRes.Body.String(), "All notifications marked as read") {
			t.Fatalf("unexpected mark-all body: %s", markAllRes.Body.String())
		}
		if !mockService.markAllCalled || mockService.markAllUserID != 11 {
			t.Fatalf("unexpected mark-all service call: %+v", mockService)
		}
	})

	t.Run("NotificationHandler requires user id", func(t *testing.T) {
		mockService := &MockNotificationService{}
		handler := handlers.NewNotificationHandler(mockService)
		router := gin.New()
		router.GET("/notifications", handler.GetMyNotifications)

		req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
		res := httptest.NewRecorder()

		router.ServeHTTP(res, req)

		if res.Code != http.StatusUnauthorized {
			t.Fatalf("expected unauthorized status 401, got %d", res.Code)
		}
		if mockService.getCalled {
			t.Fatal("get notifications should not be called without user id")
		}
	})
}
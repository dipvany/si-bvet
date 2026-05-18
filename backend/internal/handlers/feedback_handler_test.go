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

type MockFeedbackService struct {
	createCalled bool
	createUserID uint
	createReq    dto.FeedbackRequest
	createErr    error

	getAllCalled bool
	getAllResult []models.Feedback
	getAllErr    error

	getMyCalled bool
	getMyUserID uint
	getMyResult []models.Feedback
	getMyErr    error
}

var _ handlers.FeedbackServiceInterface = (*MockFeedbackService)(nil)

func (m *MockFeedbackService) CreateFeedback(userID uint, req dto.FeedbackRequest) error {
	m.createCalled = true
	m.createUserID = userID
	m.createReq = req
	return m.createErr
}

func (m *MockFeedbackService) GetAllFeedbacks() ([]models.Feedback, error) {
	m.getAllCalled = true
	return m.getAllResult, m.getAllErr
}

func (m *MockFeedbackService) GetFeedbackByUserID(userID uint) ([]models.Feedback, error) {
	m.getMyCalled = true
	m.getMyUserID = userID
	return m.getMyResult, m.getMyErr
}

func TestFeedbackHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("CreateFeedback", func(t *testing.T) {
		mockService := &MockFeedbackService{}
		handler := handlers.NewFeedbackHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(77))
			c.Next()
		})
		router.POST("/feedbacks", handler.CreateFeedback)

		body, err := json.Marshal(dto.FeedbackRequest{Rating: 5, Comments: "Excellent service"})
		if err != nil {
			t.Fatalf("marshal create request: %v", err)
		}
		req := httptest.NewRequest(http.MethodPost, "/feedbacks", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "Feedback submitted successfully") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}
		if !mockService.createCalled || mockService.createUserID != 77 || mockService.createReq.Rating != 5 {
			t.Fatalf("unexpected service call: %+v", mockService)
		}
	})

	t.Run("CreateFeedback requires user id", func(t *testing.T) {
		mockService := &MockFeedbackService{}
		handler := handlers.NewFeedbackHandler(mockService)
		router := gin.New()
		router.POST("/feedbacks", handler.CreateFeedback)

		body, err := json.Marshal(dto.FeedbackRequest{Rating: 5, Comments: "Excellent service"})
		if err != nil {
			t.Fatalf("marshal create request: %v", err)
		}
		req := httptest.NewRequest(http.MethodPost, "/feedbacks", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
		if mockService.createCalled {
			t.Fatal("service should not be called without user id")
		}
	})

	t.Run("GetAllFeedbacks and GetMyFeedbacks", func(t *testing.T) {
		mockService := &MockFeedbackService{
			getAllResult: []models.Feedback{{ID: 1, Rating: 5, Comments: "Great"}},
			getMyResult:  []models.Feedback{{ID: 2, Rating: 4, Comments: "Good"}},
		}
		handler := handlers.NewFeedbackHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(77))
			c.Next()
		})
		router.GET("/feedbacks", handler.GetAllFeedbacks)
		router.GET("/feedbacks/me", handler.GetMyFeedbacks)

		listReq := httptest.NewRequest(http.MethodGet, "/feedbacks", nil)
		listRes := httptest.NewRecorder()
		router.ServeHTTP(listRes, listReq)

		if listRes.Code != http.StatusOK {
			t.Fatalf("expected list status 200, got %d", listRes.Code)
		}
		if !strings.Contains(listRes.Body.String(), "Great") {
			t.Fatalf("unexpected list body: %s", listRes.Body.String())
		}
		if !mockService.getAllCalled {
			t.Fatal("expected GetAllFeedbacks to be called")
		}

		myReq := httptest.NewRequest(http.MethodGet, "/feedbacks/me", nil)
		myRes := httptest.NewRecorder()
		router.ServeHTTP(myRes, myReq)

		if myRes.Code != http.StatusOK {
			t.Fatalf("expected my status 200, got %d", myRes.Code)
		}
		if !strings.Contains(myRes.Body.String(), "Good") {
			t.Fatalf("unexpected my body: %s", myRes.Body.String())
		}
		if !mockService.getMyCalled || mockService.getMyUserID != 77 {
			t.Fatalf("unexpected get my service call: %+v", mockService)
		}
	})
}
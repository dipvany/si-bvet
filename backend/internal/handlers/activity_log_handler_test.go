package handlers_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"si-bvet/internal/handlers"
	"si-bvet/internal/repositories"

	"github.com/gin-gonic/gin"
)

type MockActivityLogService struct {
	GetActivityLogsCalled bool
	GetActivityLogsParams repositories.GetActivityLogsParams
	GetActivityLogsResult map[string]interface{}
	GetActivityLogsError  error
}

func (m *MockActivityLogService) GetActivityLogs(params repositories.GetActivityLogsParams) (map[string]interface{}, error) {
	m.GetActivityLogsCalled = true
	m.GetActivityLogsParams = params
	return m.GetActivityLogsResult, m.GetActivityLogsError
}

func TestActivityLogHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("GetActivityLogs success", func(t *testing.T) {
		mockService := &MockActivityLogService{
			GetActivityLogsResult: map[string]interface{}{
				"data": "some_data",
				"meta": "some_meta",
			},
		}
		handler := handlers.NewActivityLogHandler(mockService)
		router := gin.New()
		router.GET("/activity-logs", handler.GetActivityLogs)

		req := httptest.NewRequest(http.MethodGet, "/activity-logs?page=2&actor=system", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", w.Code)
		}

		if !strings.Contains(w.Body.String(), "Activity logs retrieved successfully") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}

		if !mockService.GetActivityLogsCalled {
			t.Fatal("expected GetActivityLogs to be called")
		}

		if mockService.GetActivityLogsParams.Page != 2 {
			t.Errorf("expected page 2, got %d", mockService.GetActivityLogsParams.Page)
		}

		if mockService.GetActivityLogsParams.Actor != "system" {
			t.Errorf("expected actor 'system', got %s", mockService.GetActivityLogsParams.Actor)
		}
	})

	t.Run("GetActivityLogs service error", func(t *testing.T) {
		mockService := &MockActivityLogService{
			GetActivityLogsError: errors.New("database error"),
		}
		handler := handlers.NewActivityLogHandler(mockService)
		router := gin.New()
		router.GET("/activity-logs", handler.GetActivityLogs)

		req := httptest.NewRequest(http.MethodGet, "/activity-logs", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", w.Code)
		}
	})
}
package handlers_test

import (
	"errors"
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/handlers"
	"si-bvet/internal/repositories"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
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

var _ = Describe("ActivityLogHandler", func() {
	var router *gin.Engine
	var w *httptest.ResponseRecorder
	var handler *handlers.ActivityLogHandler
	var mockService *MockActivityLogService

	BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		mockService = &MockActivityLogService{}
		handler = handlers.NewActivityLogHandler(mockService)
		router = gin.New()
		router.GET("/activity-logs", handler.GetActivityLogs)
		w = httptest.NewRecorder()
	})

	Describe("GetActivityLogs", func() {
		Context("when request is successful", func() {
			It("should return activity logs with correct parameters", func() {
				mockService.GetActivityLogsResult = map[string]interface{}{
					"data": "some_data",
					"meta": "some_meta",
				}

				req := httptest.NewRequest(http.MethodGet, "/activity-logs?page=2&actor=system", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusOK))
				Expect(w.Body.String()).To(ContainSubstring("Activity logs retrieved successfully"))
				Expect(mockService.GetActivityLogsCalled).To(BeTrue())
				Expect(mockService.GetActivityLogsParams.Page).To(Equal(2))
				Expect(mockService.GetActivityLogsParams.Actor).To(Equal("system"))
			})
		})

		Context("when the service returns an error", func() {
			It("should return a 500 internal server error", func() {
				mockService.GetActivityLogsError = errors.New("database error")

				req := httptest.NewRequest(http.MethodGet, "/activity-logs", nil)
				router.ServeHTTP(w, req)

				Expect(w.Code).To(Equal(http.StatusInternalServerError))
			})
		})

		Context("with default pagination", func() {
			It("should use default page and per_page values", func() {
				req := httptest.NewRequest(http.MethodGet, "/activity-logs", nil)
				router.ServeHTTP(w, req)

				Expect(mockService.GetActivityLogsParams.Page).To(Equal(1))
				Expect(mockService.GetActivityLogsParams.PerPage).To(Equal(20))
			})
		})
	})
})
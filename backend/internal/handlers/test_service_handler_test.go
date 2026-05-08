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
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

var _ = ginkgo.Describe("TestServiceHandler", func() {
	var handler *handlers.TestServiceHandler
	var mockService *MockTestServiceService

	ginkgo.BeforeEach(func() {
		mockService = &MockTestServiceService{}
		handler = handlers.NewTestServiceHandler(mockService)
	})

	ginkgo.Describe("CreateTestService", func() {
		ginkgo.It("should create test service with valid data", func() {
			body, _ := json.Marshal(dto.TestServiceRequest{
				TestName:    "Blood Test",
				UnitLab:     "Lab 1",
				Price:       50000.00,
				Description: "Complete blood count",
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test-services", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.CreateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.CreateTestServiceCalled).To(gomega.BeTrue())
		})

		ginkgo.It("should return 400 for invalid JSON", func() {
			body := bytes.NewBuffer([]byte(`{invalid json}`))

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test-services", body)
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.CreateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
		})

		ginkgo.It("should return 500 on service error", func() {
			mockService.ShouldReturnError = true
			mockService.ErrorMessage = "database error"

			body, _ := json.Marshal(dto.TestServiceRequest{
				TestName: "Test",
				Price:    50000.00,
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/test-services", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.CreateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("database error"))
		})
	})

	ginkgo.Describe("GetAllTestServices", func() {
		ginkgo.It("should return all test services", func() {
			mockService.AllServices = []any{
				models.TestService{ID: 1, TestName: "Test 1", Price: 50000},
				models.TestService{ID: 2, TestName: "Test 2", Price: 75000},
			}

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test-services", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.GetAllTestServices(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.GetAllTestServicesCalled).To(gomega.BeTrue())
		})

		ginkgo.It("should return 500 on service error", func() {
			mockService.ShouldReturnError = true
			mockService.ErrorMessage = "database error"

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test-services", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.GetAllTestServices(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
		})
	})

	ginkgo.Describe("GetTestServiceByID", func() {
		ginkgo.It("should return 400 for invalid ID", func() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test-services/invalid", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "invalid"}}

			handler.GetTestServiceByID(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid ID"))
		})

		ginkgo.It("should return 404 when service not found", func() {
			mockService.ShouldReturnError = true
			mockService.ErrorMessage = "not found"

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test-services/999", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "999"}}

			handler.GetTestServiceByID(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusNotFound))
		})

		ginkgo.It("should return test service by ID", func() {
			mockService.SingleService = models.TestService{
				ID:       1,
				TestName: "Blood Test",
				Price:    50000,
			}

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test-services/1", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.GetTestServiceByID(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
		})
	})

	ginkgo.Describe("UpdateTestService", func() {
		ginkgo.It("should return 400 for invalid ID", func() {
			body, _ := json.Marshal(dto.TestServiceRequest{
				TestName: "Updated",
				Price:    60000.00,
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/test-services/invalid", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "invalid"}}

			handler.UpdateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
		})

		ginkgo.It("should return 400 for invalid JSON", func() {
			body := bytes.NewBuffer([]byte(`{invalid}`))

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/test-services/1", body)
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.UpdateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
		})

		ginkgo.It("should update test service successfully", func() {
			body, _ := json.Marshal(dto.TestServiceRequest{
				TestName:    "Updated Test",
				Price:       60000.00,
				Description: "Updated desc",
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/test-services/1", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.UpdateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.UpdateTestServiceCalled).To(gomega.BeTrue())
		})

		ginkgo.It("should return 500 on service error", func() {
			mockService.ShouldReturnError = true
			mockService.ErrorMessage = "service error"

			body, _ := json.Marshal(dto.TestServiceRequest{
				TestName: "Test",
				Price:    50000.00,
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/test-services/1", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.UpdateTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
		})
	})

	ginkgo.Describe("DeleteTestService", func() {
		ginkgo.It("should return 400 for invalid ID", func() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("DELETE", "/test-services/invalid", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "invalid"}}

			handler.DeleteTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
		})

		ginkgo.It("should delete test service successfully", func() {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("DELETE", "/test-services/1", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.DeleteTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.DeleteTestServiceCalled).To(gomega.BeTrue())
		})

		ginkgo.It("should return 500 on service error", func() {
			mockService.ShouldReturnError = true
			mockService.ErrorMessage = "cannot delete: referenced in test requests"

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("DELETE", "/test-services/1", nil)

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: "1"}}

			handler.DeleteTestService(c)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("cannot delete"))
		})
	})
})

// Mock service for testing
type MockTestServiceService struct {
	CreateTestServiceCalled    bool
	GetAllTestServicesCalled   bool
	GetTestServiceByIDCalled   bool
	UpdateTestServiceCalled    bool
	DeleteTestServiceCalled    bool
	ShouldReturnError          bool
	ErrorMessage               string
	AllServices                []any
	SingleService              any
}

func (m *MockTestServiceService) CreateTestService(req dto.TestServiceRequest) error {
	m.CreateTestServiceCalled = true
	if m.ShouldReturnError {
		return &mockError{msg: m.ErrorMessage}
	}
	return nil
}

func (m *MockTestServiceService) GetAllTestServices() ([]any, error) {
	m.GetAllTestServicesCalled = true
	if m.ShouldReturnError {
		return nil, &mockError{msg: m.ErrorMessage}
	}
	if m.AllServices == nil {
		return []any{}, nil
	}
	return m.AllServices, nil
}

func (m *MockTestServiceService) GetTestServiceByID(id uint) (any, error) {
	m.GetTestServiceByIDCalled = true
	if m.ShouldReturnError {
		return nil, &mockError{msg: m.ErrorMessage}
	}
	return m.SingleService, nil
}

func (m *MockTestServiceService) UpdateTestService(id uint, req dto.TestServiceRequest) error {
	m.UpdateTestServiceCalled = true
	if m.ShouldReturnError {
		return &mockError{msg: m.ErrorMessage}
	}
	return nil
}

func (m *MockTestServiceService) DeleteTestService(id uint) error {
	m.DeleteTestServiceCalled = true
	if m.ShouldReturnError {
		return &mockError{msg: m.ErrorMessage}
	}
	return nil
}

type mockError struct {
	msg string
}

func (e *mockError) Error() string {
	return e.msg
}

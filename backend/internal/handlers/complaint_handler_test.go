package handlers_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
)

type MockComplaintService struct {
	createCalled   bool
	createUserID   uint
	createReq      dto.ComplaintRequest
	createFilePath string
	createErr      error

	getAllCalled bool
	getAllResult []models.Complaint
	getAllErr    error

	updateCalled  bool
	updateID      uint
	updateMessage string
	updateErr     error

	getMyCalled bool
	getMyUserID uint
	getMyResult []models.Complaint
	getMyErr    error
}

var _ handlers.ComplaintServiceInterface = (*MockComplaintService)(nil)

func (m *MockComplaintService) CreateComplaint(userID uint, req dto.ComplaintRequest, filePath string) error {
	m.createCalled = true
	m.createUserID = userID
	m.createReq = req
	m.createFilePath = filePath
	return m.createErr
}

func (m *MockComplaintService) GetAllComplaints() ([]models.Complaint, error) {
	m.getAllCalled = true
	return m.getAllResult, m.getAllErr
}

func (m *MockComplaintService) UpdateComplaintResponse(id uint, response string) error {
	m.updateCalled = true
	m.updateID = id
	m.updateMessage = response
	return m.updateErr
}

func (m *MockComplaintService) GetComplaintsByUserID(userID uint) ([]models.Complaint, error) {
	m.getMyCalled = true
	m.getMyUserID = userID
	return m.getMyResult, m.getMyErr
}

func complaintMultipartRequest(path string, fields map[string]string, fileField, fileName string) (*http.Request, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, err
		}
	}
	part, err := writer.CreateFormFile(fileField, fileName)
	if err != nil {
		return nil, err
	}
	_, _ = part.Write([]byte("attachment-content"))
	if err := writer.Close(); err != nil {
		return nil, err
	}

	req := httptest.NewRequest(http.MethodPost, path, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req, nil
}

func TestComplaintHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("CreateComplaint", func(t *testing.T) {
		mockService := &MockComplaintService{}
		handler := handlers.NewComplaintHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(42))
			c.Next()
		})
		router.POST("/complaints", handler.CreateComplaint)

		uploadDir := filepath.Join("internal", "uploads", "complaints")
		if err := os.MkdirAll(uploadDir, 0o755); err != nil {
			t.Fatalf("create upload dir: %v", err)
		}
		defer func() {
			_ = os.Remove(filepath.Join(uploadDir, "proof.pdf"))
		}()

		req, err := complaintMultipartRequest("/complaints", map[string]string{
			"subjects":    "Billing issue",
			"description": "Payment is delayed",
		}, "attachment", "proof.pdf")
		if err != nil {
			t.Fatalf("build request: %v", err)
		}
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "Complaint submitted successfully") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}
		if !mockService.createCalled {
			t.Fatal("expected service CreateComplaint to be called")
		}
		if mockService.createUserID != 42 {
			t.Fatalf("unexpected user id: %d", mockService.createUserID)
		}
		if mockService.createReq.Subjects != "Billing issue" || mockService.createReq.Description != "Payment is delayed" {
			t.Fatalf("unexpected complaint request: %+v", mockService.createReq)
		}
		if !strings.HasSuffix(mockService.createFilePath, "proof.pdf") {
			t.Fatalf("unexpected file path: %s", mockService.createFilePath)
		}
	})

	t.Run("CreateComplaint requires user id", func(t *testing.T) {
		mockService := &MockComplaintService{}
		handler := handlers.NewComplaintHandler(mockService)
		router := gin.New()
		router.POST("/complaints", handler.CreateComplaint)

		req, err := complaintMultipartRequest("/complaints", map[string]string{
			"subjects":    "Billing issue",
			"description": "Payment is delayed",
		}, "attachment", "proof.pdf")
		if err != nil {
			t.Fatalf("build request: %v", err)
		}
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
		if mockService.createCalled {
			t.Fatal("service should not be called without user id")
		}
	})

	t.Run("GetAllComplaints", func(t *testing.T) {
		mockService := &MockComplaintService{
			getAllResult: []models.Complaint{{ID: 1, Subjects: "Billing issue", Description: "Payment is delayed"}},
		}
		handler := handlers.NewComplaintHandler(mockService)
		router := gin.New()
		router.GET("/complaints", handler.GetAllComplaints)

		req := httptest.NewRequest(http.MethodGet, "/complaints", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "Billing issue") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}
		if !mockService.getAllCalled {
			t.Fatal("expected GetAllComplaints to be called")
		}
	})

	t.Run("UpdateComplaintResponse", func(t *testing.T) {
		mockService := &MockComplaintService{}
		handler := handlers.NewComplaintHandler(mockService)
		router := gin.New()
		router.PATCH("/complaints/:id/response", handler.UpdateComplaintResponse)

		body, err := json.Marshal(dto.ComplaintResponseRequest{AdminResponse: "We have reviewed it"})
		if err != nil {
			t.Fatalf("marshal request: %v", err)
		}
		req := httptest.NewRequest(http.MethodPatch, "/complaints/7/response", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "Complaint response updated successfully") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}
		if !mockService.updateCalled || mockService.updateID != 7 || mockService.updateMessage != "We have reviewed it" {
			t.Fatalf("unexpected service call: %+v", mockService)
		}
	})

	t.Run("GetMyComplaints", func(t *testing.T) {
		mockService := &MockComplaintService{
			getMyResult: []models.Complaint{{ID: 2, Subjects: "Delay", Description: "Shipment delayed"}},
		}
		handler := handlers.NewComplaintHandler(mockService)
		router := gin.New()
		router.Use(func(c *gin.Context) {
			c.Set("user_id", uint(99))
			c.Next()
		})
		router.GET("/complaints/mine", handler.GetMyComplaints)

		req := httptest.NewRequest(http.MethodGet, "/complaints/mine", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "Shipment delayed") {
			t.Fatalf("unexpected body: %s", w.Body.String())
		}
		if !mockService.getMyCalled || mockService.getMyUserID != 99 {
			t.Fatalf("unexpected service call: %+v", mockService)
		}
	})
}
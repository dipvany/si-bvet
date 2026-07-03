package handlers_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

type MockComplaintService struct {
	createCalled   bool
	createReq      dto.ComplaintRequest
	createFilePath string
	createErr      error

	getAllCalled bool
	getAllResult []models.Complaint
	getAllErr    error

	updateCalled bool
	updateID     uint
	updateMessage string
	updateErr    error
}

var _ handlers.ComplaintServiceInterface = (*MockComplaintService)(nil)

func (m *MockComplaintService) CreateComplaint(req dto.ComplaintRequest, filePath string) error {
	m.createCalled = true
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

var _ = Describe("ComplaintHandler", func() {
	var mockService *MockComplaintService
	var handler *handlers.ComplaintHandler
	var router *gin.Engine
	var w *httptest.ResponseRecorder

	BeforeEach(func() {
		gin.SetMode(gin.TestMode)
		mockService = &MockComplaintService{}
		handler = handlers.NewComplaintHandler(mockService)
		router = gin.New()
		w = httptest.NewRecorder()
	})

	Describe("CreateComplaint", func() {
		It("should create a complaint with an attachment", func() {
			router.POST("/complaints", handler.CreateComplaint)
			uploadDir := filepath.Join("..", "uploads", "complaints")
			Expect(os.MkdirAll(uploadDir, 0o755)).To(Succeed())

			req, err := complaintMultipartRequest("/complaints", map[string]string{
				"fullname":    "John Doe",
				"id_number":   "1234567890123456",
				"email":       "john.doe@example.com",
				"description": "Service is slow",
				"phone":       "081234567890",
			}, "attachment", "proof.pdf")
			Expect(err).NotTo(HaveOccurred())

			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Complaint submitted successfully"))
			Expect(mockService.createCalled).To(BeTrue())
			Expect(mockService.createReq.Fullname).To(Equal("John Doe"))
			Expect(mockService.createReq.Description).To(Equal("Service is slow"))
			Expect(mockService.createFilePath).To(HaveSuffix("proof.pdf"))

			if mockService.createFilePath != "" {
				_ = os.Remove(mockService.createFilePath)
			}
		})
	})

	Describe("GetAllComplaints", func() {
		It("should retrieve all complaints", func() {
			mockService.getAllResult = []models.Complaint{{ID: 1, Fullname: "Jane Doe", Description: "Payment is delayed"}}
			router.GET("/complaints", handler.GetAllComplaints)

			req := httptest.NewRequest(http.MethodGet, "/complaints", nil)
			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Jane Doe"))
			Expect(mockService.getAllCalled).To(BeTrue())
		})
	})

	Describe("UpdateComplaintResponse", func() {
		It("should update a complaint's response", func() {
			router.PATCH("/complaints/:id/response", handler.UpdateComplaintResponse)

			body, err := json.Marshal(dto.ComplaintResponseRequest{AdminResponse: "We have reviewed it"})
			Expect(err).NotTo(HaveOccurred())
			req := httptest.NewRequest(http.MethodPatch, "/complaints/7/response", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			router.ServeHTTP(w, req)

			Expect(w.Code).To(Equal(http.StatusOK))
			Expect(w.Body.String()).To(ContainSubstring("Complaint response updated successfully"))
			Expect(mockService.updateCalled).To(BeTrue())
			Expect(mockService.updateID).To(Equal(uint(7)))
			Expect(mockService.updateMessage).To(Equal("We have reviewed it"))
		})
	})
})
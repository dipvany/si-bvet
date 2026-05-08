package handlers_test

import (
	"bytes"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"time"

	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

type MockLHUService struct {
	uploadCalled bool
	uploadID     uint
	uploadNoLHU  string
	uploadPath   string
	uploadErr    error

	getCalled bool
	getID     uint
	getResult models.LhuDocument
	getErr    error
}

var _ handlers.LHUServiceInterface = (*MockLHUService)(nil)

func (m *MockLHUService) UploadLHU(submissionID uint, noLHU string, filePath string) error {
	m.uploadCalled = true
	m.uploadID = submissionID
	m.uploadNoLHU = noLHU
	m.uploadPath = filePath
	return m.uploadErr
}

func (m *MockLHUService) GetLHU(submissionID uint) (models.LhuDocument, error) {
	m.getCalled = true
	m.getID = submissionID
	return m.getResult, m.getErr
}

func lhuMultipartRequest(path string, fields map[string]string, fileField, fileName string) (*http.Request, error) {
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
	_, _ = part.Write([]byte("lhu-content"))
	if err := writer.Close(); err != nil {
		return nil, err
	}

	req := httptest.NewRequest(http.MethodPost, path, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req, nil
}

var _ = ginkgo.Describe("LHUHandler", func() {
	ginkgo.Describe("UploadLHU", func() {
		var (
			router      *gin.Engine
			mockService *MockLHUService
			handler     *handlers.LHUHandler
			w           *httptest.ResponseRecorder
			uploadDir   string
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockLHUService{}
			handler = handlers.NewLHUHandler(mockService)
			uploadDir = filepath.Join("internal", "uploads", "lhu")
			gomega.Expect(os.MkdirAll(uploadDir, 0o755)).ToNot(gomega.HaveOccurred())
			ginkgo.DeferCleanup(func() {
				_ = os.Remove(filepath.Join(uploadDir, "lhu-test.pdf"))
			})
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.POST("/submissions/:id/lhu", handler.UploadLHU)
			req, err := lhuMultipartRequest("/submissions/abc/lhu", map[string]string{"no_lhu": "LHU-001"}, "file", "lhu-test.pdf")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission ID"))
			gomega.Expect(mockService.uploadCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request when file is missing", func() {
			router.POST("/submissions/:id/lhu", handler.UploadLHU)
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			gomega.Expect(writer.WriteField("no_lhu", "LHU-001")).To(gomega.Succeed())
			gomega.Expect(writer.Close()).To(gomega.Succeed())
			req := httptest.NewRequest(http.MethodPost, "/submissions/123/lhu", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("file LHU is required"))
		})

		ginkgo.It("uploads LHU successfully", func() {
			router.POST("/submissions/:id/lhu", handler.UploadLHU)
			req, err := lhuMultipartRequest("/submissions/123/lhu", map[string]string{"no_lhu": "LHU-001"}, "file", "lhu-test.pdf")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("LHU file uploaded successfully"))
			gomega.Expect(mockService.uploadCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.uploadID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.uploadNoLHU).To(gomega.Equal("LHU-001"))
			gomega.Expect(strings.Contains(mockService.uploadPath, "lhu-test.pdf")).To(gomega.BeTrue())
		})
	})

	ginkgo.Describe("GetLHU", func() {
		var (
			router      *gin.Engine
			mockService *MockLHUService
			handler     *handlers.LHUHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockLHUService{}
			handler = handlers.NewLHUHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.GET("/submissions/:id/lhu", handler.GetLHU)
			req := httptest.NewRequest(http.MethodGet, "/submissions/abc/lhu", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.getCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns not found when service has no LHU", func() {
			mockService.getErr = errors.New("not found")
			router.GET("/submissions/:id/lhu", handler.GetLHU)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/lhu", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusNotFound))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("LHU not available yet"))
			gomega.Expect(mockService.getCalled).To(gomega.BeTrue())
		})

		ginkgo.It("returns LHU document when available", func() {
			now := time.Date(2026, 5, 5, 11, 0, 0, 0, time.UTC)
			mockService.getResult = models.LhuDocument{ID: 9, SubmissionID: 123, NoLhu: "LHU-001", FilePath: "internal/uploads/lhu/lhu-test.pdf", DateOfPub: &now}
			router.GET("/submissions/:id/lhu", handler.GetLHU)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/lhu", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("LHU-001"))
		})
	})
})
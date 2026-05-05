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

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

type MockBillingService struct {
	createCalled bool
	createID     uint
	createReq    dto.BillingRequest
	createErr    error

	getCalled bool
	getID     uint
	getResult *models.Billing
	getErr    error

	updateCalled bool
	updateID     uint
	updateReq    dto.BillingRequest
	updateErr    error

	uploadCalled bool
	uploadID     uint
	uploadPath   string
	uploadErr    error

	statusCalled bool
	statusID     uint
	statusValue  string
	statusErr    error

	verifyCalled bool
	verifyID     uint
	verifyErr    error

	rejectCalled bool
	rejectID     uint
	rejectErr    error
}

var _ handlers.BillingServiceInterface = (*MockBillingService)(nil)

func (m *MockBillingService) CreateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string, now time.Time) error {
	m.createCalled = true
	m.createID = submissionID
	m.createReq = dto.BillingRequest{EBillingCode: code, TotalAmount: amount, NoRegistration: noRegistration, NoEpi: noEpi}
	return m.createErr
}

func (m *MockBillingService) GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	m.getCalled = true
	m.getID = submissionID
	return m.getResult, m.getErr
}

func (m *MockBillingService) UpdateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string) error {
	m.updateCalled = true
	m.updateID = submissionID
	m.updateReq = dto.BillingRequest{EBillingCode: code, TotalAmount: amount, NoRegistration: noRegistration, NoEpi: noEpi}
	return m.updateErr
}

func (m *MockBillingService) UploadBillingProof(submissionID uint, proofPath string) error {
	m.uploadCalled = true
	m.uploadID = submissionID
	m.uploadPath = proofPath
	return m.uploadErr
}

func (m *MockBillingService) VerifyPayment(submissionID uint) error {
	m.verifyCalled = true
	m.verifyID = submissionID
	return m.verifyErr
}

func (m *MockBillingService) RejectPayment(submissionID uint) error {
	m.rejectCalled = true
	m.rejectID = submissionID
	return m.rejectErr
}

func (m *MockBillingService) UpdateSubmissionStatusWithNotification(submissionID uint, status string) error {
	m.statusCalled = true
	m.statusID = submissionID
	m.statusValue = status
	return m.statusErr
}

func billingMultipartRequest(path, fieldName, fileName string) (*http.Request, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		return nil, err
	}
	_, _ = part.Write([]byte("proof-content"))
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, path, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req, nil
}

var _ = ginkgo.Describe("BillingHandler", func() {
	ginkgo.Describe("CreateBilling", func() {
		var (
			router      *gin.Engine
			mockService *MockBillingService
			handler     *handlers.BillingHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockBillingService{}
			handler = handlers.NewBillingHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.POST("/billings/:submission_id", handler.CreateBilling)
			req := httptest.NewRequest(http.MethodPost, "/billings/abc", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request for invalid json", func() {
			router.POST("/billings/:submission_id", handler.CreateBilling)
			req := httptest.NewRequest(http.MethodPost, "/billings/123", bytes.NewBufferString("invalid json"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns success on valid payload", func() {
			router.POST("/billings/:submission_id", handler.CreateBilling)
			req := httptest.NewRequest(http.MethodPost, "/billings/123", bytes.NewBufferString(`{"ebilling_code":"EB-1","total_amount":125000,"no_registration":"REG-1","no_epi":"EPI-1"}`))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Billing created successfully"))
		})
	})

	ginkgo.Describe("GetBillingBySubmissionID", func() {
		var (
			router      *gin.Engine
			mockService *MockBillingService
			handler     *handlers.BillingHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockBillingService{}
			handler = handlers.NewBillingHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.GET("/billings/:submission_id", handler.GetBillingBySubmissionID)
			req := httptest.NewRequest(http.MethodGet, "/billings/abc", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.getCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns internal server error when service fails", func() {
			mockService.getErr = errors.New("billing not found")
			router.GET("/billings/:submission_id", handler.GetBillingBySubmissionID)
			req := httptest.NewRequest(http.MethodGet, "/billings/123", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("billing not found"))
			gomega.Expect(mockService.getCalled).To(gomega.BeTrue())
		})

		ginkgo.It("returns billing record on success", func() {
			mockService.getResult = &models.Billing{ID: 7, SubmissionID: 123, PaymentStatus: "unpaid"}
			router.GET("/billings/:submission_id", handler.GetBillingBySubmissionID)
			req := httptest.NewRequest(http.MethodGet, "/billings/123", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring(`"submission_id":123`))
		})
	})

	ginkgo.Describe("UploadBillingProof", func() {
		var (
			router      *gin.Engine
			mockService *MockBillingService
			handler     *handlers.BillingHandler
			w           *httptest.ResponseRecorder
			proofPath    string
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockBillingService{}
			handler = handlers.NewBillingHandler(mockService)
			proofPath = filepath.Join("internal", "uploads", "proof-test.pdf")
			ginkgo.DeferCleanup(func() {
				_ = os.Remove(proofPath)
			})
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.POST("/billings/:submission_id/proof", handler.UploadBillingProof)
			req, err := billingMultipartRequest("/billings/abc/proof", "proof", "proof-test.pdf")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.uploadCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request when proof file is missing", func() {
			router.POST("/billings/:submission_id/proof", handler.UploadBillingProof)
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			_ = writer.Close()
			req := httptest.NewRequest(http.MethodPost, "/billings/123/proof", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Proof file is required"))
		})

		ginkgo.It("uploads proof and updates status on success", func() {
			router.POST("/billings/:submission_id/proof", handler.UploadBillingProof)
			req, err := billingMultipartRequest("/billings/123/proof", "proof", "proof-test.pdf")
			gomega.Expect(err).ToNot(gomega.HaveOccurred())
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Proof of payment updated successfully"))
			gomega.Expect(mockService.uploadCalled).To(gomega.BeTrue())
			gomega.Expect(strings.HasSuffix(mockService.uploadPath, "proof-test.pdf")).To(gomega.BeTrue())
			gomega.Expect(mockService.statusCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.statusValue).To(gomega.Equal("awaiting_verification"))
		})
	})

	ginkgo.Describe("VerifyPayment and RejectPayment", func() {
		var (
			router      *gin.Engine
			mockService *MockBillingService
			handler     *handlers.BillingHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockBillingService{}
			handler = handlers.NewBillingHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid verify id", func() {
			router.PATCH("/billings/:submission_id/verify", handler.VerifyPayment)
			req := httptest.NewRequest(http.MethodPatch, "/billings/abc/verify", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.verifyCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns internal server error when verify fails", func() {
			mockService.verifyErr = errors.New("verify failed")
			router.PATCH("/billings/:submission_id/verify", handler.VerifyPayment)
			req := httptest.NewRequest(http.MethodPatch, "/billings/123/verify", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("verify failed"))
			gomega.Expect(mockService.verifyCalled).To(gomega.BeTrue())
		})

		ginkgo.It("rejects payment successfully", func() {
			router.PATCH("/billings/:submission_id/reject", handler.RejectPayment)
			req := httptest.NewRequest(http.MethodPatch, "/billings/123/reject", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Payment rejected successfully"))
			gomega.Expect(mockService.rejectCalled).To(gomega.BeTrue())
		})
	})
})
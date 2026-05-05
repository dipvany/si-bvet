package handlers_test

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

type MockSubmissionService struct {
	createCalled bool
	createUserID uint
	createReq    dto.SubmissionRequest
	createErr    error

	updateCalled bool
	updateID     uint
	updateUserID uint
	updateReq    dto.UpdateSubmissionRequest
	updateErr    error

	trackingCalled bool
	trackingID     uint
	trackingUserID uint
	trackingResp   dto.SubmissionTrackingTimelineResponse
	trackingErr    error
}

var _ services.SubmissionServiceInterface = (*MockSubmissionService)(nil)

func (m *MockSubmissionService) Create(userID uint, req dto.SubmissionRequest) error {
	m.createCalled = true
	m.createUserID = userID
	m.createReq = req
	return m.createErr
}

func (m *MockSubmissionService) GetByUser(userID uint) ([]models.Submission, error) {
	return nil, nil
}

func (m *MockSubmissionService) GetAll() ([]models.Submission, error) {
	return nil, nil
}

func (m *MockSubmissionService) Approve(id uint) error {
	return nil
}

func (m *MockSubmissionService) Reject(id uint) error {
	return nil
}

func (m *MockSubmissionService) Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error {
	m.updateCalled = true
	m.updateID = submissionID
	m.updateUserID = userID
	m.updateReq = req
	return m.updateErr
}

func (m *MockSubmissionService) GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error) {
	m.trackingCalled = true
	m.trackingID = submissionID
	m.trackingUserID = userID
	return m.trackingResp, m.trackingErr
}

func withUserID(userID uint) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", userID)
		c.Next()
	}
}

var _ = ginkgo.Describe("SubmissionHandler", func() {
	ginkgo.Describe("CreateSubmission", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns unauthorized when user_id is missing", func() {
			router.POST("/submissions", handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusUnauthorized))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("user_id not found"))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request for invalid json", func() {
			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("invalid json"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns internal server error when service fails", func() {
			mockService.createErr = errors.New("create failed")
			router.POST("/submissions", withUserID(42), handler.CreateSubmission)
			req := httptest.NewRequest(http.MethodPost, "/submissions", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusInternalServerError))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("create failed"))
			gomega.Expect(mockService.createCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createUserID).To(gomega.Equal(uint(42)))
		})
	})

	ginkgo.Describe("UpdateSubmission", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.PATCH("/submissions/:id", withUserID(42), handler.UpdateSubmission)
			req := httptest.NewRequest(http.MethodPatch, "/submissions/abc", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.updateCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns bad request when service rejects update", func() {
			mockService.updateErr = errors.New("submission cannot be edited")
			router.PATCH("/submissions/:id", withUserID(42), handler.UpdateSubmission)
			req := httptest.NewRequest(http.MethodPatch, "/submissions/123", bytes.NewBufferString("{}"))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("submission cannot be edited"))
			gomega.Expect(mockService.updateCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.updateID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.updateUserID).To(gomega.Equal(uint(42)))
		})
	})

	ginkgo.Describe("GetSubmissionTrackingTimeline", func() {
		var (
			router      *gin.Engine
			mockService *MockSubmissionService
			handler     *handlers.SubmissionHandler
			w           *httptest.ResponseRecorder
		)

		ginkgo.BeforeEach(func() {
			gin.SetMode(gin.TestMode)
			router = gin.New()
			mockService = &MockSubmissionService{}
			handler = handlers.NewSubmissionHandler(mockService)
		})

		ginkgo.It("returns bad request for invalid submission id", func() {
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/abc/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("invalid submission id"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeFalse())
		})

		ginkgo.It("returns forbidden when service denies access", func() {
			mockService.trackingErr = errors.New("unauthorized")
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusForbidden))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("unauthorized"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.trackingID).To(gomega.Equal(uint(123)))
			gomega.Expect(mockService.trackingUserID).To(gomega.Equal(uint(42)))
		})

		ginkgo.It("returns tracking timeline successfully", func() {
			mockService.trackingResp = dto.SubmissionTrackingTimelineResponse{
				SubmissionID:  123,
				CurrentStep:   3,
				CurrentStatus: "awaiting_payment",
			}
			router.GET("/submissions/:id/tracking", withUserID(42), handler.GetSubmissionTrackingTimeline)
			req := httptest.NewRequest(http.MethodGet, "/submissions/123/tracking", nil)
			w = httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Tracking timeline retrieved successfully"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("awaiting_payment"))
			gomega.Expect(mockService.trackingCalled).To(gomega.BeTrue())
		})
	})
})
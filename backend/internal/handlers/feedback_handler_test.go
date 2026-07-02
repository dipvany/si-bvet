package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
)

type MockFeedbackService struct {
    createCalled bool
    createReq    dto.FeedbackRequest
    createErr    error

    getAllCalled bool
    getAllResult []models.Feedback
    getAllErr    error

    getByIDCalled bool
    getByID       uint
    getByIDResult *models.Feedback
    getByIDErr    error
}

var _ handlers.FeedbackServiceInterface = (*MockFeedbackService)(nil)

func (m *MockFeedbackService) CreateFeedback(req dto.FeedbackRequest) error {
    m.createCalled = true
    m.createReq = req
    return m.createErr
}

func (m *MockFeedbackService) GetAllFeedbacks() ([]models.Feedback, error) {
    m.getAllCalled = true
    return m.getAllResult, m.getAllErr
}

func (m *MockFeedbackService) GetFeedbackByID(id uint) (*models.Feedback, error) {
    m.getByIDCalled = true
    m.getByID = id
    return m.getByIDResult, m.getByIDErr
}

func validFeedbackRequest() dto.FeedbackRequest {
    return dto.FeedbackRequest{
        Fullname:      "Budi Santoso",
        Email:         "budi@example.com",
        Gender:        "Laki-laki",
        LastEducation: "S1",
        Occupation:    "ASN",
        TypeService:   "Konsultasi",
        Rating1:       5,
        Rating2:       4,
        Rating3:       5,
        Rating4:       4,
        Rating5:       5,
        Rating6:       4,
        Rating7:       5,
        Rating8:       4,
        Rating9:       5,
    }
}

var _ = ginkgo.Describe("FeedbackHandler", func() {
	ginkgo.BeforeEach(func() {
		gin.SetMode(gin.TestMode)
	})

	ginkgo.Describe("CreateFeedback", func() {
		ginkgo.It("returns 200 and calls service with valid payload", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)

			router := gin.New()
			router.POST("/feedbacks", handler.CreateFeedback)

			body, err := json.Marshal(validFeedbackRequest())
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			req := httptest.NewRequest(http.MethodPost, "/feedbacks", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Feedback submitted successfully"))
			gomega.Expect(mockService.createCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createReq.Email).To(gomega.Equal("budi@example.com"))
			gomega.Expect(mockService.createReq.Fullname).To(gomega.Equal("Budi Santoso"))
		})

		ginkgo.It("returns 400 for invalid payload", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)

			router := gin.New()
			router.POST("/feedbacks", handler.CreateFeedback)

			req := httptest.NewRequest(http.MethodPost, "/feedbacks", strings.NewReader(`{"email":"invalid"}`))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.createCalled).To(gomega.BeFalse())
		})
})

	ginkgo.Describe("GetAllFeedbacks", func() {
		ginkgo.It("returns all feedbacks", func() {
			mockService := &MockFeedbackService{
				getAllResult: []models.Feedback{
					{
						Fullname:      "Budi Santoso",
						Email:         "budi@example.com",
						Gender:        "Laki-laki",
						LastEducation: "S1",
						Occupation:    "ASN",
						TypeService:   "Konsultasi",
						Rating1:       5,
						Rating2:       4,
						Rating3:       5,
						Rating4:       4,
						Rating5:       5,
						Rating6:       4,
						Rating7:       5,
						Rating8:       4,
						Rating9:       5,
					},
				},
			}
			handler := handlers.NewFeedbackHandler(mockService)

			router := gin.New()
			router.GET("/feedbacks", handler.GetAllFeedbacks)

			req := httptest.NewRequest(http.MethodGet, "/feedbacks", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("feedbacks"))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Budi Santoso"))
			gomega.Expect(mockService.getAllCalled).To(gomega.BeTrue())
		})
	})

	ginkgo.Describe("GetFeedbackByID", func() {
		ginkgo.It("returns feedback by id", func() {
			mockService := &MockFeedbackService{
				getByIDResult: &models.Feedback{
					Fullname:      "Budi Santoso",
					Email:         "budi@example.com",
					Gender:        "Laki-laki",
					LastEducation: "S1",
					Occupation:    "ASN",
					TypeService:   "Konsultasi",
					Rating1:       5,
					Rating2:       4,
					Rating3:       5,
					Rating4:       4,
					Rating5:       5,
					Rating6:       4,
					Rating7:       5,
					Rating8:       4,
					Rating9:       5,
				},
			}
			handler := handlers.NewFeedbackHandler(mockService)

			router := gin.New()
			router.GET("/feedbacks/:id", handler.GetFeedbackByID)

			req := httptest.NewRequest(http.MethodGet, "/feedbacks/1", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(mockService.getByIDCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.getByID).To(gomega.Equal(uint(1)))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("budi@example.com"))
		})

		ginkgo.It("returns 400 for invalid id", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)

			router := gin.New()
			router.GET("/feedbacks/:id", handler.GetFeedbackByID)

			req := httptest.NewRequest(http.MethodGet, "/feedbacks/abc", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.getByIDCalled).To(gomega.BeFalse())
		})
	})
})
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

	createQuestionCalled bool
	createQuestionReq    dto.FeedbackQuestionRequest
	createQuestionResult *models.FeedbackQuestion
	createQuestionErr    error

	updateQuestionCalled bool
	updateQuestionID     uint
	updateQuestionReq    dto.FeedbackQuestionRequest
	updateQuestionResult *models.FeedbackQuestion
	updateQuestionErr    error

	deleteQuestionCalled bool
	deleteQuestionID     uint
	deleteQuestionErr    error
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

func (m *MockFeedbackService) CreateFeedbackQuestion(req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	m.createQuestionCalled = true
	m.createQuestionReq = req
	return m.createQuestionResult, m.createQuestionErr
}

func (m *MockFeedbackService) UpdateFeedbackQuestion(id uint, req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	m.updateQuestionCalled = true
	m.updateQuestionID = id
	m.updateQuestionReq = req
	return m.updateQuestionResult, m.updateQuestionErr
}

func (m *MockFeedbackService) DeleteFeedbackQuestion(id uint) error {
	m.deleteQuestionCalled = true
	m.deleteQuestionID = id
	return m.deleteQuestionErr
}

func validFeedbackRequest() dto.FeedbackRequest {
    return dto.FeedbackRequest{
        Fullname:      "Budi Santoso",
        Email:         "budi@example.com",
        Gender:        "Laki-laki",
        LastEducation: "S1",
        Occupation:    "ASN",
        TypeService:   "Konsultasi",
        Answers: []dto.FeedbackAnswerRequest{
            {QuestionID: 1, Rating: 5},
            {QuestionID: 2, Rating: 4},
            {QuestionID: 3, Rating: 5},
        },
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
						Answers: []models.FeedbackAnswer{
							{QuestionID: 1, Rating: 5},
							{QuestionID: 2, Rating: 4},
						},
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
					Answers: []models.FeedbackAnswer{
						{QuestionID: 1, Rating: 5},
						{QuestionID: 2, Rating: 4},
					},
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

	ginkgo.Describe("CreateFeedbackQuestion", func() {
		ginkgo.It("returns 201 and calls service with valid payload", func() {
			mockService := &MockFeedbackService{
				createQuestionResult: &models.FeedbackQuestion{ID: 1, QuestionText: "Bagaimana pelayanannya?"},
			}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.POST("/feedback-questions", handler.CreateFeedbackQuestion)

			isActive := true
			body, _ := json.Marshal(dto.FeedbackQuestionRequest{QuestionText: "Bagaimana pelayanannya?", IsActive: &isActive})
			req := httptest.NewRequest(http.MethodPost, "/feedback-questions", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusCreated))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Feedback question created successfully"))
			gomega.Expect(mockService.createQuestionCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.createQuestionReq.QuestionText).To(gomega.Equal("Bagaimana pelayanannya?"))
		})

		ginkgo.It("returns 400 for invalid payload", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.POST("/feedback-questions", handler.CreateFeedbackQuestion)

			req := httptest.NewRequest(http.MethodPost, "/feedback-questions", strings.NewReader(`{"is_active":true}`))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.createQuestionCalled).To(gomega.BeFalse())
		})
	})

	ginkgo.Describe("UpdateFeedbackQuestion", func() {
		ginkgo.It("returns 200 and calls service with valid payload", func() {
			mockService := &MockFeedbackService{
				updateQuestionResult: &models.FeedbackQuestion{ID: 1, QuestionText: "Updated question"},
			}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.PATCH("/feedback-questions/:id", handler.UpdateFeedbackQuestion)

			body, _ := json.Marshal(dto.FeedbackQuestionRequest{QuestionText: "Updated question"})
			req := httptest.NewRequest(http.MethodPatch, "/feedback-questions/1", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Feedback question updated successfully"))
			gomega.Expect(mockService.updateQuestionCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.updateQuestionID).To(gomega.Equal(uint(1)))
			gomega.Expect(mockService.updateQuestionReq.QuestionText).To(gomega.Equal("Updated question"))
		})

		ginkgo.It("returns 400 for invalid id", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.PATCH("/feedback-questions/:id", handler.UpdateFeedbackQuestion)

			req := httptest.NewRequest(http.MethodPatch, "/feedback-questions/abc", strings.NewReader(`{}`))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.updateQuestionCalled).To(gomega.BeFalse())
		})
	})

	ginkgo.Describe("DeleteFeedbackQuestion", func() {
		ginkgo.It("returns 200 on successful deletion", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.DELETE("/feedback-questions/:id", handler.DeleteFeedbackQuestion)

			req := httptest.NewRequest(http.MethodDelete, "/feedback-questions/1", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusOK))
			gomega.Expect(w.Body.String()).To(gomega.ContainSubstring("Feedback question deleted successfully"))
			gomega.Expect(mockService.deleteQuestionCalled).To(gomega.BeTrue())
			gomega.Expect(mockService.deleteQuestionID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("returns 400 for invalid id", func() {
			mockService := &MockFeedbackService{}
			handler := handlers.NewFeedbackHandler(mockService)
			router := gin.New()
			router.DELETE("/feedback-questions/:id", handler.DeleteFeedbackQuestion)

			req := httptest.NewRequest(http.MethodDelete, "/feedback-questions/abc", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			gomega.Expect(w.Code).To(gomega.Equal(http.StatusBadRequest))
			gomega.Expect(mockService.deleteQuestionCalled).To(gomega.BeFalse())
		})
	})
})
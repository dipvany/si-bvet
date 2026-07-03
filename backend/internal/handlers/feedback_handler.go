package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

type FeedbackServiceInterface interface {
	CreateFeedback(req dto.FeedbackRequest) error
	GetAllFeedbacks() ([]models.Feedback, error)
	GetFeedbackByID(id uint) (*models.Feedback, error)
	CreateFeedbackQuestion(req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error)
	CreateFeedbackQuestions(reqs []dto.FeedbackQuestionRequest) ([]*models.FeedbackQuestion, error)
	UpdateFeedbackQuestion(id uint, req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error)
	DeleteFeedbackQuestion(id uint) error
}

type defaultFeedbackService struct{}

func (defaultFeedbackService) CreateFeedback(req dto.FeedbackRequest) error {
	return services.CreateFeedback(req)
}

func (defaultFeedbackService) GetAllFeedbacks() ([]models.Feedback, error) {
	return services.GetAllFeedbacks()
}

func (defaultFeedbackService) GetFeedbackByID(id uint) (*models.Feedback, error) {
	return services.GetFeedbackByID(id)
}

func (s defaultFeedbackService) CreateFeedbackQuestion(req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	return services.CreateFeedbackQuestion(req)
}

func (s defaultFeedbackService) CreateFeedbackQuestions(reqs []dto.FeedbackQuestionRequest) ([]*models.FeedbackQuestion, error) {
	return services.CreateFeedbackQuestions(reqs)
}

func (s defaultFeedbackService) UpdateFeedbackQuestion(id uint, req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	return services.UpdateFeedbackQuestion(id, req)
}

func (s defaultFeedbackService) DeleteFeedbackQuestion(id uint) error {
	return services.DeleteFeedbackQuestion(id)
}

type FeedbackHandler struct {
	Service FeedbackServiceInterface
}

func NewFeedbackHandler(service FeedbackServiceInterface) *FeedbackHandler {
	return &FeedbackHandler{Service: service}
}

var defaultFeedbackHandler = NewFeedbackHandler(defaultFeedbackService{})

func NewFeedbackHandlerWithDefault() *FeedbackHandler {
	return defaultFeedbackHandler
}

func CreateFeedback(c *gin.Context) {
	defaultFeedbackHandler.CreateFeedback(c)
}

func (h *FeedbackHandler) CreateFeedback(c *gin.Context) {
	var req dto.FeedbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.Service.CreateFeedback(req); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Feedback submitted successfully")
}

func GetAllFeedbacks(c *gin.Context) {
	defaultFeedbackHandler.GetAllFeedbacks(c)
}

func (h *FeedbackHandler) GetAllFeedbacks(c *gin.Context) {
	feedbacks, err := h.Service.GetAllFeedbacks()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"feedbacks": feedbacks,
	})
}

func GetFeedbackByID(c *gin.Context) {
	defaultFeedbackHandler.GetFeedbackByID(c)
}

func (h *FeedbackHandler) GetFeedbackByID(c *gin.Context) {
	id, err := GetUintParam(c, "id")

	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid feedback ID")
		return
	}

	feedback, err := h.Service.GetFeedbackByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedback": feedback,
	})
}

func CreateFeedbackQuestion(c *gin.Context) {
	defaultFeedbackHandler.CreateFeedbackQuestion(c)
}

func (h *FeedbackHandler) CreateFeedbackQuestion(c *gin.Context) {
	var reqs []*dto.FeedbackQuestionRequest
	if err := c.ShouldBindJSON(&reqs); err != nil { // Menerima array dari JSON
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Konversi []*dto.FeedbackQuestionRequest menjadi []dto.FeedbackQuestionRequest
	var dtos []dto.FeedbackQuestionRequest
	for _, req := range reqs {
		dtos = append(dtos, *req)
	}

	question, err := h.Service.CreateFeedbackQuestions(dtos);
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create feedback questions: "+err.Error())
		return
	}

	utils.DataResponse(c, http.StatusCreated, "Feedback questions created successfully", question)
}

func UpdateFeedbackQuestion(c *gin.Context) {
	defaultFeedbackHandler.UpdateFeedbackQuestion(c)
}

func (h *FeedbackHandler) UpdateFeedbackQuestion(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid question ID")
		return
	}

	var req dto.FeedbackQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	question, err := h.Service.UpdateFeedbackQuestion(id, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Feedback question updated successfully", question)
}

func DeleteFeedbackQuestion(c *gin.Context) {
	defaultFeedbackHandler.DeleteFeedbackQuestion(c)
}

func (h *FeedbackHandler) DeleteFeedbackQuestion(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid question ID")
		return
	}

	if err := h.Service.DeleteFeedbackQuestion(id); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Feedback question deleted successfully")
}

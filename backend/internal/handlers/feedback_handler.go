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

	feedback, err := services.GetFeedbackByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedback": feedback,
	})
}

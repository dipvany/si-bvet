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
	CreateFeedback(userID uint, req dto.FeedbackRequest) error
	GetAllFeedbacks() ([]models.Feedback, error)
	GetFeedbackByUserID(userID uint) ([]models.Feedback, error)
}

type defaultFeedbackService struct{}

func (defaultFeedbackService) CreateFeedback(userID uint, req dto.FeedbackRequest) error {
	return services.CreateFeedback(userID, req)
}

func (defaultFeedbackService) GetAllFeedbacks() ([]models.Feedback, error) {
	return services.GetAllFeedbacks()
}

func (defaultFeedbackService) GetFeedbackByUserID(userID uint) ([]models.Feedback, error) {
	return services.GetFeedbackByUserID(userID)
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
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	var req dto.FeedbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.CreateFeedback(userID, req)
	if err != nil {
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

func GetMyFeedbacks(c *gin.Context) {
	defaultFeedbackHandler.GetMyFeedbacks(c)
}

func (h *FeedbackHandler) GetMyFeedbacks(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	feedbacks, err := h.Service.GetFeedbackByUserID(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedbacks": feedbacks,
	})
}

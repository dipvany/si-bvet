package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateFeedback(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req dto.FeedbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err := services.CreateFeedback(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Feedback submitted successfully",
	})
}

func GetAllFeedbacks(c *gin.Context) {
	feedbacks, err := services.GetAllFeedbacks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"feedbacks": feedbacks,
	})
}

func GetMyFeedbacks(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	feedbacks, err := services.GetFeedbackByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedbacks": feedbacks,
	})
}
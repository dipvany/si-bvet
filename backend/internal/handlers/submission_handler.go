package handlers

import (
	"net/http"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateSubmission(c *gin.Context) {
	
	userIDInterface, _ := c.Get("userID")
	userID := userIDInterface.(uint)
	
	var req models.Submission
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}
		
	req.UserID = userID

	if err := services.CreateSubmission(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Pengajuan berhasil dibuat",
	})
}

func GetMySubmissions(c *gin.Context) {

	userIDInterface, _ := c.Get("userID")
	userID := userIDInterface.(uint)

	data, err := services.GetUserSubmission(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, data)
}


	


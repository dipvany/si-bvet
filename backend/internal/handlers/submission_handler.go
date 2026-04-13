package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateSubmission(c *gin.Context) {
	
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user_id not found",
		})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user_id type",
		})
		return
	}
		
	var req dto.SubmissionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err := services.CreateSubmissionWithSamplesAndTests(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission created successfully",
	})
}

func GetMySubmissions(c *gin.Context) {

	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user_id not found",
		})
		return
	}

	userID := userIDInterface.(uint)

	submissions, err := services.GetSubmissionsByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

func GetAllSubmissions(c *gin.Context) {

	submissions, err := services.GetAllSubmissions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submissions retrieved successfully",
		"data": submissions,
	})
}

func ApproveSubmission(c *gin.Context) {
	
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission ID",
		})
		return
	}

	err = services.ApproveSubmission(uint(idUint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission approved",
	})

}

func RejectSubmission(c *gin.Context) {
	
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission ID",
		})
		return
	}

	err = services.RejectSubmission(uint(idUint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission rejected",
	})
}

func UpdateSubmission(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)

	idParam := c.Param("id")
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission id",
		})
		return
	}

	var req dto.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err = services.UpdateSubmissionWithSamplesAndTests(
		uint(idUint),
		userID,
		req,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission updated successfully",
	})
}

func GetSubmissionTrackingTimeline(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)

	idParam := c.Param("id")
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission id",
		})
		return
	}

	resp, err := services.GetSubmissionTrackingTimeline(
		uint(idUint),
		userID,
	)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Tracking timeline retrieved successfully",
		"data":    resp,
	})
}
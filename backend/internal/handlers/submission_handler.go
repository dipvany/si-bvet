package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

func CreateSubmission(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	var req dto.SubmissionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err := services.CreateSubmissionWithSamplesAndTests(userID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission created successfully")
}

func GetMySubmissions(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	submissions, err := services.GetSubmissionsByUser(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, submissions)
}

func GetAllSubmissions(c *gin.Context) {

	submissions, err := services.GetAllSubmissions()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Submissions retrieved successfully", submissions)
}

func ApproveSubmission(c *gin.Context) {
	id, ok := parseUintParam(c, "id", "invalid submission ID")
	if !ok {
		return
	}

	err := services.ApproveSubmission(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission approved")

}

func RejectSubmission(c *gin.Context) {
	id, ok := parseUintParam(c, "id", "invalid submission ID")
	if !ok {
		return
	}

	err := services.RejectSubmission(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission rejected")
}

func UpdateSubmission(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	id, ok := parseUintParam(c, "id", "invalid submission id")
	if !ok {
		return
	}

	var req dto.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err := services.UpdateSubmissionWithSamplesAndTests(
		id,
		userID,
		req,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission updated successfully")
}

func GetSubmissionTrackingTimeline(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}

	id, ok := parseUintParam(c, "id", "invalid submission id")
	if !ok {
		return
	}

	resp, err := services.GetSubmissionTrackingTimeline(
		id,
		userID,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Tracking timeline retrieved successfully", resp)
}

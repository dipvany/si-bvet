package handlers

import (
	"fmt"
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

type SubmissionHandler struct {
	Service services.SubmissionServiceInterface
}

func NewSubmissionHandler(service services.SubmissionServiceInterface) *SubmissionHandler {
	return &SubmissionHandler{Service: service}
}

func (h *SubmissionHandler) CreateSubmission(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	var req dto.SubmissionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.Create(userID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission created successfully")
}

func (h *SubmissionHandler) GetMySubmissions(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	submissions, err := h.Service.GetByUser(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, submissions)
}

func (h *SubmissionHandler) GetAllSubmissions(c *gin.Context) {

	submissions, err := h.Service.GetAll()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Submissions retrieved successfully", submissions)
}

func (h *SubmissionHandler) ApproveSubmission(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission ID")
		return
	}

	err = h.Service.Approve(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission approved")

}

func (h *SubmissionHandler) RejectSubmission(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission ID")
		return
	}

	err = h.Service.Reject(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission rejected")
}

func (h *SubmissionHandler) UpdateSubmission(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	var req dto.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.Update(
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

func (h *SubmissionHandler) GetSubmissionTrackingTimeline(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	resp, err := h.Service.GetTrackingTimeline(
		id,
		userID,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Tracking timeline retrieved successfully", resp)
}

func (h *SubmissionHandler) ExportSubmissionsExcel(c *gin.Context) {
	var req dto.ExportSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	fullname, _ := c.Get("fullname")
	exportedBy := "Admin"
	if fullname != nil {
		exportedBy = fullname.(string)
	}

	fileBuffer, err := services.ExportSubmissionsExcel(req, exportedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Header(
		"Content-Disposition",
		"attachment; filename=submission_export.xlsx",
	)
	c.Data(
		http.StatusOK,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		fileBuffer.Bytes(),
	)
}

func (h *SubmissionHandler) DownloadSampleTemplate(c *gin.Context) {
	fileBuffer, err := h.Service.GetSampleTemplate()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Header(
		"Content-Disposition",
		"attachment; filename=sample_template.xlsx",
	)
	c.Data(
		http.StatusOK,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		fileBuffer.Bytes(),
	)
}

func (h *SubmissionHandler) ImportSampleTemplate(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "failed to open uploaded file")
		return
	}
	defer func() {
		_ = file.Close()
	}()

	result, err := h.Service.ImportSamplesFromTemplate(file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully parsed %d sample rows", result.TotalSamples),
		"data":    result,
	})
}

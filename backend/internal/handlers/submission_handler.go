package handlers

import (
	"fmt"
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

type SubmissionHandler struct {
	Service     services.SubmissionServiceInterface
	fileStorage storage.DocumentStorage
}

func NewSubmissionHandler(service services.SubmissionServiceInterface, fileStorage ...storage.DocumentStorage) *SubmissionHandler {
	var storageImpl storage.DocumentStorage
	if len(fileStorage) > 0 && fileStorage[0] != nil {
		storageImpl = fileStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &SubmissionHandler{Service: service, fileStorage: storageImpl}
}

func (h *SubmissionHandler) CreateSubmission(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	var req dto.SubmissionRequest
	contentType := strings.ToLower(c.GetHeader("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := c.ShouldBind(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "file is required for bulk submission")
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

		importedSamples, err := h.Service.ImportSamplesFromTemplate(0, file)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}

		req.Samples = importedSamples.Samples
	} else {
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
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
	uploadedTemplate, err := h.Service.GetUploadedSampleTemplate()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if uploadedTemplate != nil {
		resolvedLocation, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, uploadedTemplate.FilePath)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}

		if strings.HasPrefix(strings.ToLower(resolvedLocation), "http") || strings.HasPrefix(resolvedLocation, "/uploads/") {
			c.Redirect(http.StatusFound, resolvedLocation)
			return
		}

		if uploadedTemplate.FileName == "" {
			uploadedTemplate.FileName = "sample_template.xlsx"
		}

		c.FileAttachment(resolvedLocation, uploadedTemplate.FileName)
		return
	}

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

func (h *SubmissionHandler) UploadSampleTemplate(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required")
		return
	}

	filePath, err := h.fileStorage.SaveSampleTemplateFile(c.Request.Context(), fileHeader)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := h.Service.SaveUploadedSampleTemplate(userID, filePath, fileHeader.Filename); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Sample template uploaded successfully")
}

func (h *SubmissionHandler) ImportSampleTemplate(c *gin.Context) {
	submissionID, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

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

	result, err := h.Service.ImportSamplesFromTemplate(submissionID, file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully parsed %d sample rows", result.TotalSamples),
		"data":    result,
	})
}

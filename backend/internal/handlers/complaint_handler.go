package handlers

import (
	"context"
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ComplaintServiceInterface interface {
	CreateComplaint(userID uint, req dto.ComplaintRequest, filePath string) error
	GetAllComplaints() ([]models.Complaint, error)
	UpdateComplaintResponse(id uint, response string) error
	GetComplaintsByUserID(userID uint) ([]models.Complaint, error)
}

type defaultComplaintService struct{}

func (defaultComplaintService) CreateComplaint(userID uint, req dto.ComplaintRequest, filePath string) error {
	return services.CreateComplaint(userID, req, filePath)
}

func (defaultComplaintService) GetAllComplaints() ([]models.Complaint, error) {
	return services.GetAllComplaints()
}

func (defaultComplaintService) UpdateComplaintResponse(id uint, response string) error {
	return services.UpdateComplaintResponse(id, response)
}

func (defaultComplaintService) GetComplaintsByUserID(userID uint) ([]models.Complaint, error) {
	return services.GetComplaintsByUserID(userID)
}

type ComplaintHandler struct {
	Service     ComplaintServiceInterface
	fileStorage storage.DocumentStorage
}

func NewComplaintHandler(service ComplaintServiceInterface, fileStorage ...storage.DocumentStorage) *ComplaintHandler {
	var storageImpl storage.DocumentStorage
	if len(fileStorage) > 0 && fileStorage[0] != nil {
		storageImpl = fileStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &ComplaintHandler{Service: service, fileStorage: storageImpl}
}

var defaultComplaintHandler = NewComplaintHandler(defaultComplaintService{})

func NewComplaintHandlerWithDefault() *ComplaintHandler {
	return defaultComplaintHandler
}

func NewComplaintHandlerWithStorage(fileStorage storage.DocumentStorage) *ComplaintHandler {
	return NewComplaintHandler(defaultComplaintService{}, fileStorage)
}

func CreateComplaint(c *gin.Context) {
	defaultComplaintHandler.CreateComplaint(c)
}

func (h *ComplaintHandler) CreateComplaint(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	subjects := c.PostForm("subjects")
	description := c.PostForm("description")
	dateOfComplaint := c.PostForm("date_of_complaint")

	filePath := ""
	file, err := c.FormFile("attachment")
	if err == nil {
		filePath, err = h.fileStorage.SaveComplaintAttachment(context.Background(), file)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save attachment")
			return
		}
	}

	// validate date_of_complaint when provided (accept RFC3339 or YYYY-MM-DD)
	if dateOfComplaint != "" {
		if _, err := time.Parse(time.RFC3339, dateOfComplaint); err != nil {
			if _, err2 := time.Parse("2006-01-02", dateOfComplaint); err2 != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "invalid date_of_complaint format; expected RFC3339 or YYYY-MM-DD")
				return
			}
		}
	}

	req := dto.ComplaintRequest{
		Subjects:        subjects,
		Description:     description,
		DateOfComplaint: dateOfComplaint,
	}

	err = h.Service.CreateComplaint(userID, req, filePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Complaint submitted successfully")

}

func GetAllComplaints(c *gin.Context) {
	defaultComplaintHandler.GetAllComplaints(c)
}

func (h *ComplaintHandler) GetAllComplaints(c *gin.Context) {
	complaints, err := h.Service.GetAllComplaints()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	for i := range complaints {
		if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, complaints[i].AttachmentPath); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		} else {
			complaints[i].AttachmentPath = resolved
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}

func UpdateComplaintResponse(c *gin.Context) {
	defaultComplaintHandler.UpdateComplaintResponse(c)
}

func (h *ComplaintHandler) UpdateComplaintResponse(c *gin.Context) {
	complaintID := c.Param("id")

	idUint, err := strconv.ParseUint(complaintID, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	var req dto.ComplaintResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.UpdateComplaintResponse(uint(idUint), req.AdminResponse)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Complaint response updated successfully")
}

func GetMyComplaints(c *gin.Context) {
	defaultComplaintHandler.GetMyComplaints(c)
}

func (h *ComplaintHandler) GetMyComplaints(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	complaints, err := h.Service.GetComplaintsByUserID(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	for i := range complaints {
		if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, complaints[i].AttachmentPath); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		} else {
			complaints[i].AttachmentPath = resolved
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}

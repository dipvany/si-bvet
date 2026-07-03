package handlers

import (
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
	CreateComplaint(req dto.ComplaintRequest, filePath string) error
	GetAllComplaints() ([]models.Complaint, error)
	UpdateComplaintResponse(id uint, response string) error
}

type defaultComplaintService struct{}

// UpdateComplaintResponse implements ComplaintServiceInterface.
func (d defaultComplaintService) UpdateComplaintResponse(id uint, response string) error {
	return services.UpdateComplaintResponse(id, response)
}

func (defaultComplaintService) CreateComplaint(req dto.ComplaintRequest, filePath string) error {
	return services.CreateComplaint(req, filePath)
}

func (defaultComplaintService) GetAllComplaints() ([]models.Complaint, error) {
	return services.GetAllComplaints()
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
	var req dto.ComplaintRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	filePath := ""
	file, err := c.FormFile("attachment")
	if err != nil && err != http.ErrMissingFile {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid file upload")
		return
	}

	if file != nil {
        if file.Size > 10*1024*1024 {
            utils.ErrorResponse(c, http.StatusBadRequest, "attachment exceeds the maximum allowed size of 10MB")
            return
        }

        filePath, err = h.fileStorage.SaveComplaintAttachment(c.Request.Context(), file)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, "failed to securely save the attachment")
            return
        }
    }

	// validate date_of_complaint when provided (accept RFC3339 or YYYY-MM-DD)
	if req.DateOfComplaint != "" {
		if _, err := time.Parse(time.RFC3339, req.DateOfComplaint); err != nil {
			if _, err2 := time.Parse("2006-01-02", req.DateOfComplaint); err2 != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "invalid date_of_complaint format; expected RFC3339 or YYYY-MM-DD")
				return
			}
		}
	}

	err = h.Service.CreateComplaint(req, filePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "an error occurred while submitting your complaint")
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
		utils.ErrorResponse(c, http.StatusNotFound, "complaint not found")
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Complaint response updated successfully")
}

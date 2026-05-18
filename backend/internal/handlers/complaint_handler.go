package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"strconv"

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
	Service ComplaintServiceInterface
}

func NewComplaintHandler(service ComplaintServiceInterface) *ComplaintHandler {
	return &ComplaintHandler{Service: service}
}

var defaultComplaintHandler = NewComplaintHandler(defaultComplaintService{})

func NewComplaintHandlerWithDefault() *ComplaintHandler {
	return defaultComplaintHandler
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

	filePath := ""
	file, err := c.FormFile("attachment")
	if err == nil {
		filePath = "internal/uploads/complaints/" + file.Filename
		_ = c.SaveUploadedFile(file, filePath)
	}

	req := dto.ComplaintRequest{
		Subjects:    subjects,
		Description: description,
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

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}

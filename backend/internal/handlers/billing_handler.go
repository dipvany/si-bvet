package handlers

import (
	"context"
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"
	"time"

	"github.com/gin-gonic/gin"
)

type BillingServiceInterface interface {
	CreateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string, now time.Time) error
	GetBillingBySubmissionID(submissionID uint) (*models.Billing, error)
	UpdateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string) error
	UploadBillingProof(submissionID uint, proofPath string) error
	VerifyPayment(submissionID uint) error
	RejectPayment(submissionID uint) error
	UpdateSubmissionStatusWithNotification(submissionID uint, status string) error
}

type defaultBillingService struct{}

func (defaultBillingService) CreateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string, now time.Time) error {
	return services.CreateBilling(submissionID, code, amount, noRegistration, noEpi, now)
}

func (defaultBillingService) GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	return services.GetBillingBySubmissionID(submissionID)
}

func (defaultBillingService) UpdateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string) error {
	return services.UpdateBilling(submissionID, code, amount, noRegistration, noEpi)
}

func (defaultBillingService) UploadBillingProof(submissionID uint, proofPath string) error {
	return services.UploadBillingProof(submissionID, proofPath)
}

func (defaultBillingService) VerifyPayment(submissionID uint) error {
	return services.VerifyPayment(submissionID)
}

func (defaultBillingService) RejectPayment(submissionID uint) error {
	return services.RejectPayment(submissionID)
}

func (defaultBillingService) UpdateSubmissionStatusWithNotification(submissionID uint, status string) error {
	return services.UpdateSubmissionStatusWithNotification(submissionID, status)
}

type BillingHandler struct {
	Service    BillingServiceInterface
	fileStorage storage.DocumentStorage
}

func NewBillingHandler(service BillingServiceInterface, fileStorage ...storage.DocumentStorage) *BillingHandler {
	var storageImpl storage.DocumentStorage
	if len(fileStorage) > 0 && fileStorage[0] != nil {
		storageImpl = fileStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &BillingHandler{Service: service, fileStorage: storageImpl}
}

var defaultBillingHandler = NewBillingHandler(defaultBillingService{})

func NewBillingHandlerWithDefault() *BillingHandler {
	return defaultBillingHandler
}

func NewBillingHandlerWithStorage(fileStorage storage.DocumentStorage) *BillingHandler {
	return NewBillingHandler(defaultBillingService{}, fileStorage)
}

func CreateBilling(c *gin.Context) {
	defaultBillingHandler.CreateBilling(c)
}

func (h *BillingHandler) CreateBilling(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	var req dto.BillingRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.CreateBilling(
		id,
		req.EBillingCode,
		req.TotalAmount,
		req.NoRegistration,
		req.NoEpi,
		time.Now(),
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Billing created successfully")
}

// handler untuk mendapatkan billing berdasarkan submission ID
func GetBillingBySubmissionID(c *gin.Context) {
	defaultBillingHandler.GetBillingBySubmissionID(c)
}

func (h *BillingHandler) GetBillingBySubmissionID(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	billing, err := h.Service.GetBillingBySubmissionID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, billing)
}

func UpdateBilling(c *gin.Context) {
	defaultBillingHandler.UpdateBilling(c)
}

func (h *BillingHandler) UpdateBilling(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	var req dto.BillingRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.UpdateBilling(
		id,
		req.EBillingCode,
		req.TotalAmount,
		req.NoRegistration,
		req.NoEpi,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Billing updated successfully")
}

func UploadBillingProof(c *gin.Context) {
	defaultBillingHandler.UploadBillingProof(c)
}

func (h *BillingHandler) UploadBillingProof(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	proofFile, err := c.FormFile("proof")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Proof file is required")
		return
	}

	proofPath, err := h.fileStorage.SaveBillingProof(context.Background(), proofFile)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save proof file")
		return
	}

	err = h.Service.UploadBillingProof(id, proofPath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := h.Service.UpdateSubmissionStatusWithNotification(id, "awaiting_verification"); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Proof of payment updated successfully")
}

func VerifyPayment(c *gin.Context) {
	defaultBillingHandler.VerifyPayment(c)
}

func (h *BillingHandler) VerifyPayment(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	err = h.Service.VerifyPayment(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Payment verified successfully")
}

func RejectPayment(c *gin.Context) {
	defaultBillingHandler.RejectPayment(c)
}

func (h *BillingHandler) RejectPayment(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	err = h.Service.RejectPayment(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return

	}

	utils.MessageResponse(c, http.StatusOK, "Payment rejected successfully")
}

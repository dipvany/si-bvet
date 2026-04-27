package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"time"

	"github.com/gin-gonic/gin"
)

func CreateBilling(c *gin.Context) {

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

	err = services.CreateBilling(
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

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	billing, err := services.GetBillingBySubmissionID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, billing)
}

func UpdateBilling(c *gin.Context) {

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

	err = services.UpdateBilling(
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

	proofPath := "uploads/" + proofFile.Filename

	if err := c.SaveUploadedFile(proofFile, proofPath); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save proof file")
		return
	}

	err = services.UploadBillingProof(id, proofPath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := services.UpdateSubmissionStatusWithNotification(id, "awaiting_verification"); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Proof of payment updated successfully")
}

func VerifyPayment(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	err = services.VerifyPayment(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Payment verified successfully")
}

func RejectPayment(c *gin.Context) {

	id, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	err = services.RejectPayment(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return

	}

	utils.MessageResponse(c, http.StatusOK, "Payment rejected successfully")
}

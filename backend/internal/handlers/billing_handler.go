package handlers

import (
	"net/http"
	"si-bvet/internal/repositories"
	"si-bvet/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateBilling(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)
	
	var req struct {
		Code   string  `json:"code"`
		Amount float64 `json:"amount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := services.CreateBilling(uint(idUint), req.Code, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Billing created successfully",
	})
}

// handler untuk mendapatkan billing berdasarkan submission ID
func GetBillingBySubmissionID(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)

	billing, err := services.GetBillingBySubmissionID(uint(idUint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, billing)
}

func UpdateBilling(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)

	var req struct {
		Code   string  `json:"code"`
		Amount float64 `json:"amount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := services.UpdateBilling(uint(idUint), req.Code, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Billing updated successfully",
	})
}

func UploadBillingProof(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)

	proofFile, err := c.FormFile("proof")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Proof file is required"})
		return
	}

	proofPath := "uploads/" + proofFile.Filename

	if err := c.SaveUploadedFile(proofFile, proofPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save proof file"})
		return
	}

	err = services.UploadBillingProof(uint(idUint), proofPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update submission status to "awaiting_verification"
	repositories.UpdateSubmissionStatus(uint(idUint), "awaiting_verification")
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Proof of payment updated successfully",
	})
}

func VerifyPayment(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)

	err := services.VerifyPayment(uint(idUint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment verified successfully",
	})
}

func RejectPayment(c *gin.Context) {

	idParam := c.Param("submission_id")
	idUint, _ := strconv.ParseUint(idParam, 10, 64)

	err := services.RejectPayment(uint(idUint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return 

	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment rejected successfully",
	})
}

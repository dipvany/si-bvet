package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateComplaint(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	subjects := c.PostForm("subjects")
	description := c.PostForm("description")

	filePath := ""
	file, err := c.FormFile("attachment")
	if err == nil {
		filePath := "uploads/complaints/" + file.Filename
		_ = c.SaveUploadedFile(file, filePath)
	}

	req := dto.ComplaintRequest{
		Subjects:    subjects,
		Description: description,
	}

	err = services.CreateComplaint(userID, req, filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Complaint submitted successfully",
	})
	
}

func GetAllComplaints(c *gin.Context) {
	complaints, err := services.GetAllComplaints()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}

func UpdateComplaintResponse(c *gin.Context) {
	complaintID := c.Param("id")

	idUint, err := strconv.ParseUint(complaintID, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid complaint ID",
		})
		return
	}

	var req dto.ComplaintResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err = services.UpdateComplaintResponse(uint(idUint), req.AdminResponse)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Complaint response updated successfully",
	})
}

func GetMyComplaints(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	complaints, err := services.GetComplaintsByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}


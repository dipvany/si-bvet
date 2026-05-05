package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateComplaint(c *gin.Context) {
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

	err = services.CreateComplaint(userID, req, filePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Complaint submitted successfully")

}

func GetAllComplaints(c *gin.Context) {
	complaints, err := services.GetAllComplaints()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
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
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid complaint ID")
		return
	}

	var req dto.ComplaintResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = services.UpdateComplaintResponse(uint(idUint), req.AdminResponse)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Complaint response updated successfully")
}

func GetMyComplaints(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	complaints, err := services.GetComplaintsByUserID(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"complaints": complaints,
	})
}

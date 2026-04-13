package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func ExportSubmissionsExcel(c *gin.Context) {

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
package handlers

import (
	"net/http"
	"si-bvet/internal/repositories"
	"si-bvet/internal/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetActivityLogsHandler menangani permintaan untuk mengambil log aktivitas.
func GetActivityLogsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	params := repositories.GetActivityLogsParams{
		Page:    page,
		PerPage: perPage,
		Actor:   c.Query("actor"),
		Role:    c.Query("role"),
	}

	// Parsing filter tanggal
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			params.StartDate = &t
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Tambahkan 23:59:59 untuk mencakup seluruh hari
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			params.EndDate = &t
		}
	}

	response, err := services.GetActivityLogs(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve activity logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Activity logs retrieved successfully",
		"data":    response["data"],
		"meta":    response["meta"],
	})
}
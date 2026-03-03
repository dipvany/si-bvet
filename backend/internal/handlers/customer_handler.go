package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CustomerDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the customer dashboard",
	})
}
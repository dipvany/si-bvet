package utils

import "github.com/gin-gonic/gin"

func ErrorResponse(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{"error": message})
}

func MessageResponse(c *gin.Context, code int, message string) {
	c.JSON(code, gin.H{"message": message})
}

func DataResponse(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, gin.H{
		"message": message,
		"data":    data,
	})
}

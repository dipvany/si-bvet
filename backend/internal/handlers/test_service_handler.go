package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateTestService(c *gin.Context) {
	
	var req dto.TestServiceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err := services.CreateTestService(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Test service created successfully",
	})
}

func GetAllTestServices(c *gin.Context) {
	services, err := services.GetAllTestServices()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, services)
}

func GetTestServiceByID(c *gin.Context) {
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid ID")
		return
	}

	service, err := services.GetTestServiceByID(uint(idUint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Test service not found")
		return
	}

	c.JSON(http.StatusOK, service)
}

func UpdateTestService(c *gin.Context) {
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid ID")
		return
	}

	var req dto.TestServiceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = services.UpdateTestService(uint(idUint), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test service updated successfully",
	})
}

func DeleteTestService(c *gin.Context) {
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid ID")
		return
	}

	err = services.DeleteTestService(uint(idUint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test service deleted successfully",
	})
}

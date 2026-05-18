package handlers

import (
	"io"
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TestServiceServiceInterface defines the interface for test service operations
type TestServiceServiceInterface interface {
	CreateTestService(req dto.TestServiceRequest) error
	GetAllTestServices() ([]any, error)
	GetTestServiceByID(id uint) (any, error)
	UpdateTestService(id uint, req dto.TestServiceRequest) error
	ImportTestServicesFromExcel(file io.Reader) (int, error)
	DeleteTestService(id uint) error
}

// TestServiceHandler handles HTTP requests for test service operations
type TestServiceHandler struct {
	Service TestServiceServiceInterface
}

// NewTestServiceHandler creates a new test service handler
func NewTestServiceHandler(service TestServiceServiceInterface) *TestServiceHandler {
	return &TestServiceHandler{Service: service}
}

// CreateTestService handles POST /test-services
func (h *TestServiceHandler) CreateTestService(c *gin.Context) {
	var req dto.TestServiceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err := h.Service.CreateTestService(req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Test service created successfully",
	})
}

// ImportTestServicesExcel handles POST /test-services/import
func (h *TestServiceHandler) ImportTestServicesExcel(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required")
		return
	}

	openedFile, err := file.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "failed to open uploaded file")
		return
	}
	defer func() {
		_ = openedFile.Close()
	}()

	importedCount, err := h.Service.ImportTestServicesFromExcel(openedFile)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Test services imported successfully",
		"imported_count": importedCount,
	})
}

// GetAllTestServices handles GET /test-services
func (h *TestServiceHandler) GetAllTestServices(c *gin.Context) {
	services, err := h.Service.GetAllTestServices()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, services)
}

// GetTestServiceByID handles GET /test-services/:id
func (h *TestServiceHandler) GetTestServiceByID(c *gin.Context) {
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid ID")
		return
	}

	service, err := h.Service.GetTestServiceByID(uint(idUint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Test service not found")
		return
	}

	c.JSON(http.StatusOK, service)
}

// UpdateTestService handles PUT /test-services/:id
func (h *TestServiceHandler) UpdateTestService(c *gin.Context) {
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

	err = h.Service.UpdateTestService(uint(idUint), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test service updated successfully",
	})
}

// DeleteTestService handles DELETE /test-services/:id
func (h *TestServiceHandler) DeleteTestService(c *gin.Context) {
	idParam := c.Param("id")

	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid ID")
		return
	}

	err = h.Service.DeleteTestService(uint(idUint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test service deleted successfully",
	})
}

// Adapter for default service (backward compatibility)
type defaultTestServiceAdapter struct{}

func (d defaultTestServiceAdapter) CreateTestService(req dto.TestServiceRequest) error {
	return services.CreateTestService(req)
}

func (d defaultTestServiceAdapter) GetAllTestServices() ([]any, error) {
	services, err := services.GetAllTestServices()
	if err != nil {
		return nil, err
	}
	result := make([]any, len(services))
	for i, v := range services {
		result[i] = v
	}
	return result, nil
}

func (d defaultTestServiceAdapter) GetTestServiceByID(id uint) (any, error) {
	return services.GetTestServiceByID(id)
}

func (d defaultTestServiceAdapter) UpdateTestService(id uint, req dto.TestServiceRequest) error {
	return services.UpdateTestService(id, req)
}

func (d defaultTestServiceAdapter) ImportTestServicesFromExcel(file io.Reader) (int, error) {
	return services.ImportTestServicesFromExcel(file)
}

func (d defaultTestServiceAdapter) DeleteTestService(id uint) error {
	return services.DeleteTestService(id)
}

var defaultTestServiceHandler = NewTestServiceHandler(defaultTestServiceAdapter{})

func NewTestServiceHandlerWithDefault() *TestServiceHandler {
	return defaultTestServiceHandler
}

// Package-level forwarding functions for backward compatibility
func CreateTestService(c *gin.Context) {
	defaultTestServiceHandler.CreateTestService(c)
}

func GetAllTestServices(c *gin.Context) {
	defaultTestServiceHandler.GetAllTestServices(c)
}

func GetTestServiceByID(c *gin.Context) {
	defaultTestServiceHandler.GetTestServiceByID(c)
}

func UpdateTestService(c *gin.Context) {
	defaultTestServiceHandler.UpdateTestService(c)
}

func ImportTestServicesExcel(c *gin.Context) {
	defaultTestServiceHandler.ImportTestServicesExcel(c)
}

func DeleteTestService(c *gin.Context) {
	defaultTestServiceHandler.DeleteTestService(c)
}

package handlers

import (
	"net/http"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type LHUServiceInterface interface {
	UploadLHU(submissionID uint, noLHU string, filePath string) error
	GetLHU(submissionID uint) (models.LhuDocument, error)
}

type defaultLHUService struct{}

func (defaultLHUService) UploadLHU(submissionID uint, noLHU string, filePath string) error {
	return services.UploadLHU(submissionID, noLHU, filePath)
}

func (defaultLHUService) GetLHU(submissionID uint) (models.LhuDocument, error) {
	return services.GetLHU(submissionID)
}

type LHUHandler struct {
	Service LHUServiceInterface
}

func NewLHUHandler(service LHUServiceInterface) *LHUHandler {
	return &LHUHandler{Service: service}
}

var defaultLHUHandler = NewLHUHandler(defaultLHUService{})

func UploadLHU(c *gin.Context) {
	defaultLHUHandler.UploadLHU(c)
}

func (h *LHUHandler) UploadLHU(c *gin.Context) {

	idParam := c.Param("id")
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission ID",
		})
		return
	}

	noLHU := c.PostForm("no_lhu")

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file LHU is required",
		})
		return
	}

	filePath := "internal/uploads/lhu/" + file.Filename

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save file",
		})
		return
	}

	err = h.Service.UploadLHU(uint(idUint), noLHU, filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "LHU file uploaded successfully",
	})
}

func GetLHU(c *gin.Context) {
	defaultLHUHandler.GetLHU(c)
}

func (h *LHUHandler) GetLHU(c *gin.Context) {

	idParam := c.Param("id")
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission ID",
		})
		return
	}

	lhu, err := h.Service.GetLHU(uint(idUint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "LHU not available yet",
		})
		return
	}

	c.JSON(http.StatusOK, lhu)
}

// download LHU
func DownloadLHU(c *gin.Context) {
	defaultLHUHandler.DownloadLHU(c)
}

func (h *LHUHandler) DownloadLHU(c *gin.Context) {

	idParam := c.Param("id")
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid submission ID",
		})
		return
	}

	lhu, err := h.Service.GetLHU(uint(idUint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "LHU not available yet",
		})
		return
	}

	c.FileAttachment(lhu.FilePath, "LHU_"+strconv.FormatUint(idUint, 10)+".pdf")
	return
}


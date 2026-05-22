package handlers

import (
	"net/http"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"strconv"
	"strings"

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
	Service    LHUServiceInterface
	fileStorage storage.DocumentStorage
}

func NewLHUHandler(service LHUServiceInterface, fileStorage ...storage.DocumentStorage) *LHUHandler {
	var storageImpl storage.DocumentStorage
	if len(fileStorage) > 0 && fileStorage[0] != nil {
		storageImpl = fileStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &LHUHandler{Service: service, fileStorage: storageImpl}
}

var defaultLHUHandler = NewLHUHandler(defaultLHUService{})

func NewLHUHandlerWithDefault() *LHUHandler {
	return defaultLHUHandler
}

func NewLHUHandlerWithStorage(fileStorage storage.DocumentStorage) *LHUHandler {
	return NewLHUHandler(defaultLHUService{}, fileStorage)
}

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

	filePath, err := h.fileStorage.SaveLHUFile(c.Request.Context(), file)
	if err != nil {
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

	if resolved, err := h.fileStorage.ResolveDownloadLocation(c.Request.Context(), lhu.FilePath); err == nil {
		lhu.FilePath = resolved
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

	resolvedLocation, err := h.fileStorage.ResolveDownloadLocation(c.Request.Context(), lhu.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to resolve file location",
		})
		return
	}

	if strings.HasPrefix(strings.ToLower(resolvedLocation), "http") {
		c.Redirect(http.StatusFound, resolvedLocation)
		return
	}

	if strings.HasPrefix(resolvedLocation, "/uploads/") {
		c.Redirect(http.StatusFound, resolvedLocation)
		return
	}

	c.FileAttachment(resolvedLocation, "LHU_"+strconv.FormatUint(idUint, 10)+".pdf")
	return
}


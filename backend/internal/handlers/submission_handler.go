package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type SubmissionHandler struct {
	Service     services.SubmissionServiceInterface
	fileStorage storage.DocumentStorage
}

func NewSubmissionHandler(service services.SubmissionServiceInterface, fileStorage ...storage.DocumentStorage) *SubmissionHandler {
	var storageImpl storage.DocumentStorage
	if len(fileStorage) > 0 && fileStorage[0] != nil {
		storageImpl = fileStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &SubmissionHandler{Service: service, fileStorage: storageImpl}
}

func (h *SubmissionHandler) CreateSubmission(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	var req dto.SubmissionRequest
	contentType := strings.ToLower(c.GetHeader("Content-Type"))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := c.ShouldBind(&req); err != nil {
			if !strings.Contains(err.Error(), "unsupported field type") {
				utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
				return
			}
		}

		// Re-bind form fields without file to ensure all other data is captured
		if err := c.ShouldBind(&req); err != nil && !strings.Contains(err.Error(), "unsupported field type") {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}

		// Parse samples from multipart text field first.
		// If template file is also sent, template import will override this value.
		if samplesRaw := strings.TrimSpace(c.PostForm("samples")); samplesRaw != "" {
			var samples []dto.SampleInput
			if err := json.Unmarshal([]byte(samplesRaw), &samples); err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "invalid samples payload")
				return
			}
			req.Samples = samples
		}

		// Handle bulk sample import file
		sampleFileHeader, err := c.FormFile("file")
		if err == nil && sampleFileHeader != nil {
			file, err := sampleFileHeader.Open()
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, "failed to open uploaded sample template file")
				return
			}
			defer func() {
				_ = file.Close()
			}()

			importedSamples, err := h.Service.ImportSamplesFromTemplate(0, file)
			if err != nil {
				utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
				return
			}
			// File import has the highest priority when both are provided.
			req.Samples = importedSamples.Samples
		} else if err != nil && err != http.ErrMissingFile {
			utils.ErrorResponse(c, http.StatusBadRequest, "invalid sample template file")
			return
		}

		// Handle attachment_doc file
		attachmentFileHeader, err := c.FormFile("attachment_doc")
		if err == nil && attachmentFileHeader != nil {
			filePath, err := h.fileStorage.SaveSubmissionAttachment(c.Request.Context(), attachmentFileHeader)
			if err != nil {
				utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save attachment document")
				return
			}
			req.AttachmentDoc = filePath
		} else if err != nil && err != http.ErrMissingFile {
			utils.ErrorResponse(c, http.StatusBadRequest, "invalid attachment document file")
			return
		}

	} else {
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
	}

	submissionObj, err := h.Service.Create(userID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Submission created successfully", submissionObj)
}

func (h *SubmissionHandler) GetMySubmissions(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	page, perPage, err := parsePaginationParams(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	submissions, total, err := h.Service.GetByUserPaginated(userID, page, perPage)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Resolve attachment doc URL
	if submissions != nil {
		for i := range submissions {
			if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, submissions[i].AttachmentDoc); err == nil {
				submissions[i].AttachmentDoc = resolved
			}
		}
	}

	utils.DataResponse(c, http.StatusOK, "Submissions retrieved successfully", gin.H{
		"data": submissions,
		"meta": buildPaginationMeta(page, perPage, total),
	})
}

func (h *SubmissionHandler) GetAllSubmissions(c *gin.Context) {
	page, perPage, err := parsePaginationParams(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	submissions, total, err := h.Service.GetAllPaginated(page, perPage)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Resolve attachment doc URL
	if submissions != nil {
		for i := range submissions {
			if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, submissions[i].AttachmentDoc); err == nil {
				submissions[i].AttachmentDoc = resolved
			}
		}
	}

	utils.DataResponse(c, http.StatusOK, "Submissions retrieved successfully", gin.H{
		"data": submissions,
		"meta": buildPaginationMeta(page, perPage, total),
	})
}

func (h *SubmissionHandler) ApproveSubmission(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission ID")
		return
	}

	err = h.Service.Approve(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission approved")

}

func (h *SubmissionHandler) GetSubmissionByIDForCustomer(c *gin.Context) {
    userID, err := GetUserID(c)
    if err != nil {
        RespondUserIDError(c, err)
        return
    }

    id, err := GetUintParam(c, "id")
    if err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
        return
    }

    submission, err := h.Service.GetSubmissionByIDForUser(id, userID)
    if err != nil {
        if err.Error() == "unauthorized" {
            utils.ErrorResponse(c, http.StatusForbidden, err.Error())
            return
        }

        if strings.Contains(strings.ToLower(err.Error()), "record not found") {
            utils.ErrorResponse(c, http.StatusNotFound, err.Error())
            return
        }

        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }

	// Resolve attachment doc URL
	if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, submission.AttachmentDoc); err == nil {
		submission.AttachmentDoc = resolved
	}

    utils.DataResponse(c, http.StatusOK, "Submission retrieved successfully", buildCustomerSubmissionDetailResponse(submission))
}

func buildCustomerSubmissionDetailResponse(submission models.Submission) dto.SubmissionCustomerDetailResponse {
    resp := dto.SubmissionCustomerDetailResponse{
        ID:                submission.ID,
        NoRegistration:    submission.NoRegistration,
        NoEpi:             submission.NoEpi,
        NoTicket:          submission.NoTicket,
        TypeService:       submission.TypeService,
        PurposeOfTest:     submission.PurposeOfTest,
        DateOfSend:        submission.DateOfSend,
        DateOfReceive:     submission.DateOfReceive,
        SampleTaker:       submission.SampleTaker,
        IDIsikhnas:        submission.IDIsikhnas,
        DiagnosisRequired: submission.DiagnosisRequired,
        AgendaNo:          submission.AgendaNo,
        CustLetterNo:      submission.CustLetterNo,
        CourierName:       submission.CourierName,
        CourierContact:    submission.CourierContact,
        Notes:             submission.Notes,
        SamplesCount:      submission.SamplesCount,
        ProcessStatus:     submission.ProcessStatus,
        AttachmentDoc:     submission.AttachmentDoc,
        CreatedAt:         submission.CreatedAt,
        UpdatedAt:         submission.UpdatedAt,
    }

    if len(submission.Samples) > 0 {
        resp.Samples = make([]dto.SubmissionCustomerSampleResponse, 0, len(submission.Samples))
        for _, sample := range submission.Samples {
            resp.Samples = append(resp.Samples, buildCustomerSampleResponse(sample))
        }
    }

    if submission.Billing != nil {
        resp.Billing = &dto.SubmissionCustomerBillingResponse{
            ID:            submission.Billing.ID,
            EBillingCode:  submission.Billing.EBillingCode,
            TotalAmount:   submission.Billing.TotalAmount,
            PaymentStatus: submission.Billing.PaymentStatus,
            PaidAt:        submission.Billing.PaidAt,
            IssuedAt:      submission.Billing.IssuedAt,
            InvoiceDoc:    submission.Billing.InvoiceDoc,
            ProofPayment:  submission.Billing.ProofPayment,
        }
    }

    if submission.LHU != nil {
        resp.LHUDocument = &dto.SubmissionCustomerLHUResponse{
            ID:        submission.LHU.ID,
            NoLhu:     submission.LHU.NoLhu,
            FilePath:  submission.LHU.FilePath,
            DateOfPub: submission.LHU.DateOfPub,
        }
    }

    return resp
}

func buildCustomerSampleResponse(sample models.Sample) dto.SubmissionCustomerSampleResponse {
    resp := dto.SubmissionCustomerSampleResponse{
        ID:             sample.ID,
        SampleModel:    sample.SampleModel,
        SampleCodeCust: sample.SampleCodeCust,
        SpecimenGroup:  sample.SpecimenGroup,
        SpecimenType:   sample.SpecimenType,
        Species:        sample.Species,
        Preservative:   sample.Preservative,
        Packaging:      sample.Packaging,
        ProductionDate: sample.ProductionDate,
        ExpiredDate:    sample.ExpiredDate,
        Sex:            sample.Sex,
        Age:            sample.Age,
        UnitAge:        sample.UnitAge,
        Owner:          sample.Owner,
        TestType:       sample.TestType,
        LocationType:   sample.LocationType,
        LocationSmpl:   sample.LocationSmpl,
        IsVaccinated:   sample.IsVaccinated,
        Volume:         sample.Volume,
        Condition:      sample.Condition,
        TotalSample:    sample.TotalSample,
    }

    if len(sample.TestRequests) > 0 {
        resp.TestRequests = make([]dto.SubmissionCustomerTestRequestResponse, 0, len(sample.TestRequests))
        for _, testRequest := range sample.TestRequests {
            resp.TestRequests = append(resp.TestRequests, buildCustomerTestRequestResponse(testRequest))
        }
    }

    return resp
}

func buildCustomerTestRequestResponse(testRequest models.TestRequest) dto.SubmissionCustomerTestRequestResponse {
    resp := dto.SubmissionCustomerTestRequestResponse{
        ID:            testRequest.ID,
        TestServiceID: testRequest.TestServiceID,
        PriceAtMoment: testRequest.PriceAtMoment,
    }

    resp.TestService = &dto.SubmissionCustomerTestServiceResponse{
        ID:            testRequest.TestService.ID,
        TestName:      testRequest.TestService.TestName,
        UnitLab:       testRequest.TestService.UnitLab,
        Target:        testRequest.TestService.Target,
        Method:        testRequest.TestService.Method,
        ResultType:    testRequest.TestService.ResultType,
        TestReference: testRequest.TestService.TestReference,
        Price:         testRequest.TestService.Price,
        Duration:      testRequest.TestService.Duration,
        Description:   testRequest.TestService.Description,
    }

    return resp
}

func (h *SubmissionHandler) RejectSubmission(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission ID")
		return
	}

	err = h.Service.Reject(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission rejected")
}

func (h *SubmissionHandler) UpdateSubmission(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	var req dto.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.Update(
		id,
		userID,
		req,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Submission updated successfully")
}

func (h *SubmissionHandler) GetSubmissionTrackingTimeline(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	resp, err := h.Service.GetTrackingTimeline(
		id,
		userID,
	)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, err.Error())
		return
	}

	utils.DataResponse(c, http.StatusOK, "Tracking timeline retrieved successfully", resp)
}

func (h *SubmissionHandler) ExportSubmissionsExcel(c *gin.Context) {
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

func (h *SubmissionHandler) DownloadSampleTemplate(c *gin.Context) {
	testServiceIDs, err := parseUintListQueryParam(c, "test_service_ids")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	uploadedTemplate, err := h.Service.GetUploadedSampleTemplate()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	 if uploadedTemplate != nil {
        if len(testServiceIDs) > 0 {
            templateBytes, err := h.readUploadedTemplateBytes(c, uploadedTemplate.FilePath)
            if err != nil {
                utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
                return
            }

            fileBuffer, err := h.Service.ApplyTestServicesToUploadedTemplate(templateBytes, testServiceIDs)
            if err != nil {
                utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
                return
            }

            fileName := uploadedTemplate.FileName
            if strings.TrimSpace(fileName) == "" {
                fileName = "sample_template.xlsx"
            }

            c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
            c.Data(
                http.StatusOK,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileBuffer.Bytes(),
            )
            return
        }

        resolvedLocation, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, uploadedTemplate.FilePath)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
            return
        }

        if strings.HasPrefix(strings.ToLower(resolvedLocation), "http") {
            c.Redirect(http.StatusFound, resolvedLocation)
            return
        }

        // Baca file dari disk dan stream isinya, jangan redirect untuk path lokal
        templateBytes, err := h.readUploadedTemplateBytes(c, uploadedTemplate.FilePath)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, fmt.Sprintf("failed to read uploaded template: %v", err))
            return
        }

        fileName := uploadedTemplate.FileName
        if strings.TrimSpace(fileName) == "" {
            fileName = "sample_template.xlsx"
        }
        if uploadedTemplate.FileName == "" { // fallback
            uploadedTemplate.FileName = "sample_template.xlsx"
        }

        c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", uploadedTemplate.FileName))
        c.Data(
            http.StatusOK,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            templateBytes,
        )
        return
    }

    // Jika tidak ada template yang diupload, gunakan template default
    if len(testServiceIDs) > 0 {
        fileBuffer, err := h.Service.GetSampleTemplateWithTestServices(testServiceIDs)
        if err != nil {
            utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
            return
        }

        c.Header("Content-Disposition", "attachment; filename=sample_template.xlsx")
        c.Data(
            http.StatusOK,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileBuffer.Bytes(),
        )
        return
    }

    fileBuffer, err := h.Service.GetSampleTemplate()
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }

	c.Header("Content-Disposition", "attachment; filename=sample_template.xlsx")
    c.Data(
        http.StatusOK,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileBuffer.Bytes(),
    )
	
}

func (h *SubmissionHandler) readUploadedTemplateBytes(c *gin.Context, filePath string) ([]byte, error) {
    resolvedLocation, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, filePath)
    if err != nil {
        return nil, err
    }

    if strings.TrimSpace(resolvedLocation) == "" {
        return nil, fmt.Errorf("resolved template location is empty")
    }

    lower := strings.ToLower(resolvedLocation)

    if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
        req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, resolvedLocation, nil)
        if err != nil {
            return nil, err
        }

        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            return nil, err
        }
        defer func() {
            _ = resp.Body.Close()
        }()

        if resp.StatusCode < 200 || resp.StatusCode > 299 {
            return nil, fmt.Errorf("failed to download uploaded template: http %d", resp.StatusCode)
        }
	
        return io.ReadAll(resp.Body)
	}

	if strings.HasPrefix(resolvedLocation, "/uploads/") {
        relative := strings.TrimPrefix(resolvedLocation, "/") // Menjadi "uploads/..."
        localPath := filepath.Join("/app", filepath.FromSlash(relative))
        return os.ReadFile(localPath)
    }

    return os.ReadFile(resolvedLocation)
}

func parseUintListQueryParam(c *gin.Context, key string) ([]uint, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return nil, nil
	}

	parts := strings.Split(raw, ",")
	ids := make([]uint, 0, len(parts))
	seen := make(map[uint]struct{}, len(parts))

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		value, err := strconv.ParseUint(trimmed, 10, 64)
		if err != nil || value == 0 {
			return nil, fmt.Errorf("invalid %s parameter", key)
		}

		id := uint(value)
		if _, exists := seen[id]; exists {
			continue
		}

		seen[id] = struct{}{}
		ids = append(ids, id)
	}

	return ids, nil
}

func (h *SubmissionHandler) UploadSampleTemplate(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required")
		return
	}

	filePath, err := h.fileStorage.SaveSampleTemplateFile(c.Request.Context(), fileHeader)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := h.Service.SaveUploadedSampleTemplate(userID, filePath, fileHeader.Filename); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Sample template uploaded successfully")
}

func (h *SubmissionHandler) ImportSampleTemplate(c *gin.Context) {
	submissionID, err := GetUintParam(c, "submission_id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "file is required")
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "failed to open uploaded file")
		return
	}
	defer func() {
		_ = file.Close()
	}()

	result, err := h.Service.ImportSamplesFromTemplate(submissionID, file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully parsed %d sample rows", result.TotalSamples),
		"data":    result,
	})
}

func parsePaginationParams(c *gin.Context) (int, int, error) {
	page := 1
	perPage := 25

	if rawPage := c.Query("page"); rawPage != "" {
		parsedPage, err := strconv.Atoi(rawPage)
		if err != nil {
			return 0, 0, fmt.Errorf("invalid page parameter")
		}
		page = parsedPage
	}
	if rawPerPage := c.Query("per_page"); rawPerPage != "" {
		parsedPerPage, err := strconv.Atoi(rawPerPage)
		if err != nil {
			return 0, 0, fmt.Errorf("invalid per_page parameter")
		}
		perPage = parsedPerPage
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 25
	}
	if perPage > 100 {
		perPage = 100
	}

	return page, perPage, nil
}

func buildPaginationMeta(page, perPage int, total int64) gin.H {
	totalPages := int64(0)
	if perPage > 0 {
		totalPages = (total + int64(perPage) - 1) / int64(perPage)
	}

	return gin.H{
		"page":        page,
		"per_page":    perPage,
		"total":       total,
		"total_pages": totalPages,
	}
}

func (h *SubmissionHandler) GetSubmissionByID(c *gin.Context) {
	id, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid submission id")
		return
	}

	submission, err := h.Service.GetSubmissionByID(id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}

	// Resolve attachment doc URL
	if resolved, err := ResolveDocumentLocation(c.Request.Context(), h.fileStorage, submission.AttachmentDoc); err == nil {
		submission.AttachmentDoc = resolved
	}

	utils.DataResponse(c, http.StatusOK, "Submission retrieved successfully", submission)
}

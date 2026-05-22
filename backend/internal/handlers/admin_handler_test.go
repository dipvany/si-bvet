package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"si-bvet/internal/dto"
	"si-bvet/internal/handlers"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

type failingDocumentStorage struct{}

func (f failingDocumentStorage) SaveRegistrationDocument(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveBillingProof(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveComplaintAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) SaveLHUFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	return "", nil
}

func (f failingDocumentStorage) ResolveDownloadLocation(ctx context.Context, location string) (string, error) {
	return "", http.ErrAbortHandler
}

type MockAdminService struct {
	createCalled bool
	createReq    dto.AdminRequest
	createErr    error

	getCalled     bool
	getRoleFilter string
	getResult     []models.Admin
	getErr        error

	verifyCalled bool
	verifyUserID uint
	verifyResult models.User
	verifyErr    error

	rejectCalled bool
	rejectUserID uint
	rejectErr    error

	deleteCalled bool
	deleteTarget uint
	deleteActor  uint
	deleteErr    error

	updateCalled bool
	updateUserID uint
	updateReq    services.UpdateAdminAccountRequest
	updateErr    error

	getUnverifiedCalled bool
	getUnverifiedResult []models.User
	getUnverifiedErr    error
}

var _ handlers.AdminServiceInterface = (*MockAdminService)(nil)

func (m *MockAdminService) CreateAdminAccount(req dto.AdminRequest) error {
	m.createCalled = true
	m.createReq = req
	return m.createErr
}

func (m *MockAdminService) GetManagedAccounts(roleFilter string) ([]models.Admin, error) {
	m.getCalled = true
	m.getRoleFilter = roleFilter
	return m.getResult, m.getErr
}

func (m *MockAdminService) VerifyUserByID(userID uint) (models.User, error) {
	m.verifyCalled = true
	m.verifyUserID = userID
	return m.verifyResult, m.verifyErr
}

func (m *MockAdminService) RejectUserByID(userID uint) error {
	m.rejectCalled = true
	m.rejectUserID = userID
	return m.rejectErr
}

func (m *MockAdminService) DeleteManagedAccount(targetID, actorID uint) error {
	m.deleteCalled = true
	m.deleteTarget = targetID
	m.deleteActor = actorID
	return m.deleteErr
}

func (m *MockAdminService) UpdateManagedAccount(userID uint, req services.UpdateAdminAccountRequest) error {
	m.updateCalled = true
	m.updateUserID = userID
	m.updateReq = req
	return m.updateErr
}

func (m *MockAdminService) GetUnverifiedCustomers() ([]models.User, error) {
	m.getUnverifiedCalled = true
	return m.getUnverifiedResult, m.getUnverifiedErr
}

func TestAdminHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("CreateAdmin", func(t *testing.T) {
		mockService := &MockAdminService{}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.POST("/admins", handler.CreateAdmin)

		invalidBody, err := json.Marshal(dto.AdminRequest{
			FullName: "John Doe",
			Email:    "john@example.com",
			Phone:    "08123456789",
			Password: "password123",
			Role:     "customer",
		})
		if err != nil {
			t.Fatalf("marshal invalid admin request: %v", err)
		}
		invalidReq := httptest.NewRequest(http.MethodPost, "/admins", bytes.NewReader(invalidBody))
		invalidReq.Header.Set("Content-Type", "application/json")
		invalidRes := httptest.NewRecorder()
		router.ServeHTTP(invalidRes, invalidReq)

		if invalidRes.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid role status 400, got %d", invalidRes.Code)
		}
		if mockService.createCalled {
			t.Fatal("service should not be called for invalid role")
		}

		validBody, err := json.Marshal(dto.AdminRequest{
			FullName: "Jane Admin",
			Email:    "jane@example.com",
			Phone:    "08123456780",
			Password: "password123",
			Role:     "admin",
		})
		if err != nil {
			t.Fatalf("marshal valid admin request: %v", err)
		}
		validReq := httptest.NewRequest(http.MethodPost, "/admins", bytes.NewReader(validBody))
		validReq.Header.Set("Content-Type", "application/json")
		validRes := httptest.NewRecorder()
		router.ServeHTTP(validRes, validReq)

		if validRes.Code != http.StatusCreated {
			t.Fatalf("expected create status 201, got %d", validRes.Code)
		}
		if !strings.Contains(validRes.Body.String(), "Account created successfully") {
			t.Fatalf("unexpected body: %s", validRes.Body.String())
		}
		if !mockService.createCalled || mockService.createReq.Role != "admin" {
			t.Fatalf("unexpected create service call: %+v", mockService.createReq)
		}
	})

	t.Run("GetAllAdminAccounts and VerifyUser", func(t *testing.T) {
		mockService := &MockAdminService{
			getResult: []models.Admin{{User: models.User{ID: 1, FullName: "Admin One", Email: "admin@example.com", Phone: "0812", Role: "admin"}, Position: "Lead"}},
		}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.GET("/admins", handler.GetAllAdminAccounts)
		router.GET("/admins/:id/verify", handler.VerifyUser)

		listReq := httptest.NewRequest(http.MethodGet, "/admins?role=admin", nil)
		listRes := httptest.NewRecorder()
		router.ServeHTTP(listRes, listReq)

		if listRes.Code != http.StatusOK {
			t.Fatalf("expected list status 200, got %d", listRes.Code)
		}
		if !strings.Contains(listRes.Body.String(), "Admin One") {
			t.Fatalf("unexpected list body: %s", listRes.Body.String())
		}
		if !mockService.getCalled || mockService.getRoleFilter != "admin" {
			t.Fatalf("unexpected get service call: %+v", mockService)
		}

		invalidVerifyReq := httptest.NewRequest(http.MethodGet, "/admins/abc/verify", nil)
		invalidVerifyRes := httptest.NewRecorder()
		router.ServeHTTP(invalidVerifyRes, invalidVerifyReq)

		if invalidVerifyRes.Code != http.StatusBadRequest {
			t.Fatalf("expected invalid verify status 400, got %d", invalidVerifyRes.Code)
		}

		mockService.verifyResult = models.User{ID: 9, FullName: "Verified User"}
		verifyReq := httptest.NewRequest(http.MethodGet, "/admins/9/verify", nil)
		verifyRes := httptest.NewRecorder()
		router.ServeHTTP(verifyRes, verifyReq)

		if verifyRes.Code != http.StatusOK {
			t.Fatalf("expected verify status 200, got %d", verifyRes.Code)
		}
		if !strings.Contains(verifyRes.Body.String(), "User verification successful") {
			t.Fatalf("unexpected verify body: %s", verifyRes.Body.String())
		}
		if !mockService.verifyCalled || mockService.verifyUserID != 9 {
			t.Fatalf("unexpected verify service call: %+v", mockService)
		}
	})

	t.Run("UpdateAdminAccount and UnverifiedCustomers", func(t *testing.T) {
		mockService := &MockAdminService{
			getUnverifiedResult: []models.User{{ID: 2, FullName: "Customer A", Email: "customer@example.com"}},
		}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.PATCH("/admins/:id", handler.UpdateAdminAccount)
		router.GET("/admins/unverified", handler.GetUnverifiedCustomers)

		body, err := json.Marshal(map[string]any{
			"fullname":    "Admin Updated",
			"email":       "updated@example.com",
			"phone":       "0812999999",
			"position":    "Supervisor",
			"unit_lab":    "Lab A",
			"employee_no": "EMP-99",
			"role":        "superadmin",
		})
		if err != nil {
			t.Fatalf("marshal update request: %v", err)
		}
		updateReq := httptest.NewRequest(http.MethodPatch, "/admins/5", bytes.NewReader(body))
		updateReq.Header.Set("Content-Type", "application/json")
		updateRes := httptest.NewRecorder()
		router.ServeHTTP(updateRes, updateReq)

		if updateRes.Code != http.StatusOK {
			t.Fatalf("expected update status 200, got %d", updateRes.Code)
		}
		if !strings.Contains(updateRes.Body.String(), "Account successfully updated") {
			t.Fatalf("unexpected update body: %s", updateRes.Body.String())
		}
		if !mockService.updateCalled || mockService.updateUserID != 5 {
			t.Fatalf("unexpected update service call: %+v", mockService)
		}
		if mockService.updateReq.FullName == nil || *mockService.updateReq.FullName != "Admin Updated" {
			t.Fatalf("unexpected fullname in update request: %+v", mockService.updateReq.FullName)
		}
		if mockService.updateReq.Role == nil || *mockService.updateReq.Role != "superadmin" {
			t.Fatalf("unexpected role in update request: %+v", mockService.updateReq.Role)
		}

		unverifiedReq := httptest.NewRequest(http.MethodGet, "/admins/unverified", nil)
		unverifiedRes := httptest.NewRecorder()
		router.ServeHTTP(unverifiedRes, unverifiedReq)

		if unverifiedRes.Code != http.StatusOK {
			t.Fatalf("expected unverified status 200, got %d", unverifiedRes.Code)
		}
		if !strings.Contains(unverifiedRes.Body.String(), "Customer A") {
			t.Fatalf("unexpected unverified body: %s", unverifiedRes.Body.String())
		}
		if !strings.Contains(unverifiedRes.Body.String(), "registration_doc") {
			t.Fatalf("expected registration_doc in unverified response: %s", unverifiedRes.Body.String())
		}
		if !mockService.getUnverifiedCalled {
			t.Fatal("expected GetUnverifiedCustomers to be called")
		}
	})

	t.Run("GetUnverifiedCustomers keeps response when storage resolution fails", func(t *testing.T) {
		mockService := &MockAdminService{
			getUnverifiedResult: []models.User{{ID: 2, FullName: "Customer A", Email: "customer@example.com", RegistrationDoc: "/uploads/registration-docs/doc.pdf"}},
		}
		handler := handlers.NewAdminHandler(mockService, failingDocumentStorage{})
		router := gin.New()
		router.GET("/admins/unverified", handler.GetUnverifiedCustomers)

		req := httptest.NewRequest(http.MethodGet, "/admins/unverified", nil)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected unverified status 200, got %d", res.Code)
		}
		if !strings.Contains(res.Body.String(), "/uploads/registration-docs/doc.pdf") {
			t.Fatalf("expected fallback registration_doc in response: %s", res.Body.String())
		}
		if !mockService.getUnverifiedCalled {
			t.Fatal("expected GetUnverifiedCustomers to be called")
		}
	})
}
package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
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

func (f failingDocumentStorage) SaveSubmissionAttachment(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
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

func (f failingDocumentStorage) SaveSampleTemplateFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
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

	getAllCalled bool
	getAllResult []models.User
	getAllErr    error

	createCustomerCalled bool
	createCustomerReq    dto.CustomerCreateRequest
	createCustomerErr    error

	updateCustomerCalled bool
	updateCustomerUserID uint
	updateCustomerReq    dto.CustomerUpdateRequest
	updateCustomerErr    error

	deleteCustomerCalled bool
	deleteCustomerUserID uint
	deleteCustomerErr    error

	importCustomerCalled bool
	importCustomerResult services.ImportResult
	importCustomerErr    error
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

func (m *MockAdminService) GetAllCustomers() ([]models.User, error) {
	m.getAllCalled = true
	return m.getAllResult, m.getAllErr
}

func (m *MockAdminService) CreateCustomerAccount(req dto.CustomerCreateRequest) error {
	m.createCustomerCalled = true
	m.createCustomerReq = req
	return m.createCustomerErr
}

func (m *MockAdminService) UpdateCustomerAccount(userID uint, req dto.CustomerUpdateRequest) error {
	m.updateCustomerCalled = true
	m.updateCustomerUserID = userID
	m.updateCustomerReq = req
	return m.updateCustomerErr
}

func (m *MockAdminService) DeleteCustomerAccount(userID uint) error {
	m.deleteCustomerCalled = true
	m.deleteCustomerUserID = userID
	return m.deleteCustomerErr
}

func (m *MockAdminService) ImportCustomerAccounts(file io.Reader) (services.ImportResult, error) {
	m.importCustomerCalled = true
	// We can read the file here to check content if needed for a more complex test
	return m.importCustomerResult, m.importCustomerErr
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

	t.Run("UpdateAdminAccount and GetAllCustomers", func(t *testing.T) {
		mockService := &MockAdminService{
			getAllResult: []models.User{{ID: 2, FullName: "Customer A", Email: "customer@example.com"}},
		}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.PATCH("/admins/:id", handler.UpdateAdminAccount)
		router.GET("/admins/customers", handler.GetAllCustomers)

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

		allCustomersReq := httptest.NewRequest(http.MethodGet, "/admins/customers", nil)
		allCustomersRes := httptest.NewRecorder()
		router.ServeHTTP(allCustomersRes, allCustomersReq)

		if allCustomersRes.Code != http.StatusOK {
			t.Fatalf("expected all customers status 200, got %d", allCustomersRes.Code)
		}
		if !strings.Contains(allCustomersRes.Body.String(), "Customer A") {
			t.Fatalf("unexpected all customers body: %s", allCustomersRes.Body.String())
		}
		if !strings.Contains(allCustomersRes.Body.String(), "registration_doc") {
			t.Fatalf("expected registration_doc in all customers response: %s", allCustomersRes.Body.String())
		}
		if !mockService.getAllCalled {
			t.Fatal("expected GetAllCustomers to be called")
		}
	})

	t.Run("GetAllCustomers keeps response when storage resolution fails", func(t *testing.T) {
		mockService := &MockAdminService{
			getAllResult: []models.User{{ID: 2, FullName: "Customer A", Email: "customer@example.com", RegistrationDoc: "/uploads/registration-docs/doc.pdf"}},
		}
		handler := handlers.NewAdminHandler(mockService, failingDocumentStorage{})
		router := gin.New()
		router.GET("/admins/customers", handler.GetAllCustomers)

		req := httptest.NewRequest(http.MethodGet, "/admins/customers", nil)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected all customers status 200, got %d. Body: %s", res.Code, res.Body.String())
		}
		if !strings.Contains(res.Body.String(), "/uploads/registration-docs/doc.pdf") {
			t.Fatalf("expected fallback registration_doc in response: %s", res.Body.String())
		}
		if !mockService.getAllCalled {
			t.Fatal("expected GetAllCustomers to be called")
		}	
	})

	t.Run("CreateCustomerAccount", func(t *testing.T) {
		mockService := &MockAdminService{}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.POST("/customers", handler.CreateCustomerAccount)

		body, err := json.Marshal(dto.CustomerCreateRequest{
			FullName:    "New Customer by Admin",
			Email:       "newcust@example.com",
			Phone:       "08987654321",
			Password:    "password123",
			Institution: "Inst. X",
		})
		if err != nil {
			t.Fatalf("marshal create customer request: %v", err)
		}
		req := httptest.NewRequest(http.MethodPost, "/customers", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusCreated {
			t.Fatalf("expected create customer status 201, got %d", res.Code)
		}
		if !mockService.createCustomerCalled || mockService.createCustomerReq.Email != "newcust@example.com" {
			t.Fatalf("unexpected create customer service call: %+v", mockService)
		}
	})

	t.Run("UpdateCustomerAccount", func(t *testing.T) {
		mockService := &MockAdminService{}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.PATCH("/customers/:id", handler.UpdateCustomerAccount)

		newName := "Updated Customer Name"
		body, err := json.Marshal(dto.CustomerUpdateRequest{
			FullName: &newName,
		})
		if err != nil {
			t.Fatalf("marshal update customer request: %v", err)
		}
		req := httptest.NewRequest(http.MethodPatch, "/customers/123", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected update customer status 200, got %d", res.Code)
		}
		if !mockService.updateCustomerCalled || mockService.updateCustomerUserID != 123 {
			t.Fatalf("unexpected update customer service call: called=%v, id=%d", mockService.updateCustomerCalled, mockService.updateCustomerUserID)
		}
		if mockService.updateCustomerReq.FullName == nil || *mockService.updateCustomerReq.FullName != newName {
			t.Fatalf("unexpected fullname in update request: %+v", mockService.updateCustomerReq.FullName)
		}
	})

	t.Run("DeleteCustomerAccount", func(t *testing.T) {
		mockService := &MockAdminService{}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.DELETE("/customers/:id", handler.DeleteCustomerAccount)

		req := httptest.NewRequest(http.MethodDelete, "/customers/123", nil)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected delete customer status 200, got %d", res.Code)
		}
		if !mockService.deleteCustomerCalled || mockService.deleteCustomerUserID != 123 {
			t.Fatalf("unexpected delete customer service call: called=%v, id=%d", mockService.deleteCustomerCalled, mockService.deleteCustomerUserID)
		}
	})

	t.Run("RejectUser", func(t *testing.T) {
		mockService := &MockAdminService{}
		handler := handlers.NewAdminHandler(mockService)
		router := gin.New()
		router.PATCH("/users/:id/reject", handler.RejectUser)

		req := httptest.NewRequest(http.MethodPatch, "/users/42/reject", nil)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected reject user status 200, got %d", res.Code)
		}
		if !strings.Contains(res.Body.String(), "User verification rejected and deleted") {
			t.Fatalf("unexpected body: %s", res.Body.String())
		}
		if !mockService.rejectCalled || mockService.rejectUserID != 42 {
			t.Fatalf("unexpected reject user service call: called=%v, id=%d", mockService.rejectCalled, mockService.rejectUserID)
		}
	})
}
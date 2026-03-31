package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func CreateUser(user *models.User) error {
	return repositories.CreateUser(user)
}

func GetUserByEmail(email string) (*models.User, error) {
	return repositories.GetUserByEmail(email)
}

func GetUserByID(userID uint) (models.User, error) {
	return repositories.GetUserByID(userID)
}

func UpdateProfile(userID uint, role string, req dto.UpdateProfileRequest) error {

	// update common user data
	if err := repositories.UpdateUserProfile(userID, req.FullName, req.Phone); err != nil {
		return err
	}

	if role == "customer" {
		return repositories.UpdateCustomerProfile(userID, map[string]interface{}{
			"group":         req.Group,
			"is_membership": req.IsMembership,
			"membership_no": req.MembershipNo,
			"pic_name":      req.PICName,
			"pic_contact":   req.PICContact,
			"province":      req.Province,
			"city":          req.City,
			"village":       req.Village,
			"address":       req.Address,
			"zip_code":      req.ZipCode,
			"occupation":    req.Occupation,
		})
	}

	if role == "admin" {
		return repositories.UpdateAdminProfile(userID, map[string]interface{}{
			"position":    req.Position,
			"unit_lab":    req.UnitLab,
			"employee_no": req.EmployeeNo,
		})
	}

	return nil
}



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

func UpdateProfile(userID uint, role string, req dto.ProfileRequest) error {
	userUpdates := map[string]interface{}{}
	if req.FullName != nil {
		userUpdates["fullname"] = *req.FullName
	}
	if req.Phone != nil {
		userUpdates["phone"] = *req.Phone
	}

	// update common user data
	if err := repositories.UpdateUserProfile(userID, userUpdates); err != nil {
		return err
	}

	if role == "customer" {
		customerUpdates := map[string]interface{}{}
		if req.Group != nil {
			customerUpdates["group"] = *req.Group
		}
		if req.IsMembership != nil {
			customerUpdates["is_membership"] = *req.IsMembership
		}
		if req.MembershipNo != nil {
			customerUpdates["membership_no"] = *req.MembershipNo
		}
		if req.PICName != nil {
			customerUpdates["pic_name"] = *req.PICName
		}
		if req.PICContact != nil {
			customerUpdates["pic_contact"] = *req.PICContact
		}
		if req.Province != nil {
			customerUpdates["province"] = *req.Province
		}
		if req.City != nil {
			customerUpdates["city"] = *req.City
		}
		if req.Subdistrict != nil {
			customerUpdates["subdistrict"] = *req.Subdistrict
		}
		if req.Village != nil {
			customerUpdates["village"] = *req.Village
		}
		if req.Address != nil {
			customerUpdates["address"] = *req.Address
		}
		if req.ZipCode != nil {
			customerUpdates["zip_code"] = *req.ZipCode
		}
		if req.Occupation != nil {
			customerUpdates["occupation"] = *req.Occupation
		}

		return repositories.UpdateCustomerProfile(userID, customerUpdates)
	}

	if role == "admin" {
		adminUpdates := map[string]interface{}{}
		if req.Position != nil {
			adminUpdates["position"] = *req.Position
		}
		if req.UnitLab != nil {
			adminUpdates["unit_lab"] = *req.UnitLab
		}
		if req.EmployeeNo != nil {
			adminUpdates["employee_no"] = *req.EmployeeNo
		}

		return repositories.UpdateAdminProfile(userID, adminUpdates)
	}

	return nil
}

// get profile lengkap berdasarkan userID
func GetUserProfile(userID uint) (models.User, error) {
	return repositories.GetUserProfile(userID)
}

// get customer yang belum diverifikasi
func GetUnverifiedCustomers() ([]models.User, error) {
	return repositories.GetUnverifiedCustomers()
}


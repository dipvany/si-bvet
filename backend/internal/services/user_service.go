package services

import (
	"fmt"
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

    customerUpdates := map[string]interface{}{}
    if role == "customer" {
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
        if req.LhuReceiverName != nil {
            customerUpdates["lhu_receiver_name"] = *req.LhuReceiverName
        }
        if req.LhuReceiverContact != nil {
            customerUpdates["lhu_receiver_contact"] = *req.LhuReceiverContact
        }
        // if req.Occupation != nil {
        // 	customerUpdates["occupation"] = *req.Occupation
        // }
    }

    adminUpdates := map[string]interface{}{}
    if role == "admin" {
        if req.Position != nil {
            adminUpdates["position"] = *req.Position
        }
        if req.UnitLab != nil {
            adminUpdates["unit_lab"] = *req.UnitLab
        }
        if req.EmployeeNo != nil {
            adminUpdates["employee_no"] = *req.EmployeeNo
        }
    }

    if err := repositories.UpdateProfileTx(userID, role, userUpdates, customerUpdates, adminUpdates); err != nil {
        return err
    }

    if role == "customer" {
        LogSystemActivity(fmt.Sprintf("Profil customer untuk user ID %d diperbarui", userID))
        return nil
    }

    if role == "admin" {
        LogSystemActivity(fmt.Sprintf("Profil admin untuk user ID %d diperbarui", userID))
        return nil
    }

    return nil
}

func GetUserProfile(userID uint) (models.User, error) {
    return repositories.GetUserProfile(userID)
}

func GetProfileByRole(userID uint, role string) (interface{}, error) {
    profile, err := repositories.GetUserProfileByRole(userID, role)
    if err != nil {
        return nil, err
    }

    if profile == nil {
        return nil, fmt.Errorf("unsupported role: %s", role)
    }
    return profile, nil
}

func GetAllCustomers() ([]models.User, error) {
    return repositories.GetAllCustomers()
}
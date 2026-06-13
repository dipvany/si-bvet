package services

import (
	"fmt"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

func stringPtr(value string) *string {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}

var _ = ginkgo.Describe("UserService", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		var err error
		dsn := fmt.Sprintf("file:user_service_%d?mode=memory&cache=shared", time.Now().UnixNano())
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Customer{},
			&models.Admin{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("CreateUser and GetUserByEmail", func() {
		ginkgo.It("creates a user and retrieves it by email", func() {
			user := models.User{
				FullName:     "John Doe",
				Email:        "john@example.com",
				Phone:        "081234567890",
				PasswordHash: "hashed-password",
				Role:         "customer",
				IsVerified:   false,
			}

			err := CreateUser(&user)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(user.ID).NotTo(gomega.Equal(uint(0)))

			found, err := GetUserByEmail("john@example.com")
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(found).NotTo(gomega.BeNil())
			gomega.Expect(found.ID).To(gomega.Equal(user.ID))
			gomega.Expect(found.FullName).To(gomega.Equal("John Doe"))
			gomega.Expect(found.Email).To(gomega.Equal("john@example.com"))
		})

		ginkgo.It("returns an error when email does not exist", func() {
			found, err := GetUserByEmail("missing@example.com")
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(found).To(gomega.BeNil())
		})
	})

	ginkgo.Describe("UpdateProfile", func() {
		ginkgo.It("updates common user data and customer profile", func() {
			user := models.User{
				FullName:     "Old Customer",
				Email:        "customer@example.com",
				Phone:        "0800000000",
				PasswordHash: "hashed-password",
				Role:         "customer",
				IsVerified:   false,
			}
			gomega.Expect(db.DB.Create(&user).Error).NotTo(gomega.HaveOccurred())

			customer := models.Customer{
				UserID:       user.ID,
				Group:        "old group",
				IsMembership: false,
				MembershipNo: "OLD-001",
				Province:     "Old Province",
				City:         "Old City",
				Subdistrict:  "Old Subdistrict",
				Village:      "Old Village",
				Address:      "Old Address",
				ZipCode:      "00000",
			}
			gomega.Expect(db.DB.Create(&customer).Error).NotTo(gomega.HaveOccurred())

			err := UpdateProfile(user.ID, "customer", dto.ProfileRequest{
				FullName:     stringPtr("New Customer"),
				Phone:        stringPtr("0811111111"),
				Group:        stringPtr("new group"),
				IsMembership: boolPtr(true),
				MembershipNo: stringPtr("NEW-123"),
				Province:     stringPtr("West Java"),
				City:         stringPtr("Bandung"),
				Subdistrict:  stringPtr("Coblong"),
				Village:      stringPtr("Dago"),
				Address:      stringPtr("Jl. Test 1"),
				ZipCode:      stringPtr("40135"),
			})
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updatedUser models.User
			gomega.Expect(db.DB.First(&updatedUser, user.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedUser.FullName).To(gomega.Equal("New Customer"))
			gomega.Expect(updatedUser.Phone).To(gomega.Equal("0811111111"))

			var updatedCustomer models.Customer
			gomega.Expect(db.DB.First(&updatedCustomer, "user_id = ?", user.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedCustomer.Group).To(gomega.Equal("new group"))
			gomega.Expect(updatedCustomer.IsMembership).To(gomega.BeTrue())
			gomega.Expect(updatedCustomer.MembershipNo).To(gomega.Equal("NEW-123"))
			gomega.Expect(updatedCustomer.Province).To(gomega.Equal("West Java"))
			gomega.Expect(updatedCustomer.City).To(gomega.Equal("Bandung"))
			gomega.Expect(updatedCustomer.Subdistrict).To(gomega.Equal("Coblong"))
			gomega.Expect(updatedCustomer.Village).To(gomega.Equal("Dago"))
			gomega.Expect(updatedCustomer.Address).To(gomega.Equal("Jl. Test 1"))
			gomega.Expect(updatedCustomer.ZipCode).To(gomega.Equal("40135"))
		})

		ginkgo.It("updates common user data and admin profile", func() {
			user := models.User{
				FullName:     "Old Admin",
				Email:        "admin@example.com",
				Phone:        "0800000001",
				PasswordHash: "hashed-password",
				Role:         "admin",
				IsVerified:   true,
			}
			gomega.Expect(db.DB.Create(&user).Error).NotTo(gomega.HaveOccurred())

			admin := models.Admin{
				UserID:     user.ID,
				Position:   "Old Position",
				UnitLab:    "Old Unit",
				EmployeeNo: "OLD-EMP",
			}
			gomega.Expect(db.DB.Create(&admin).Error).NotTo(gomega.HaveOccurred())

			err := UpdateProfile(user.ID, "admin", dto.ProfileRequest{
				FullName:   stringPtr("New Admin"),
				Phone:      stringPtr("0822222222"),
				Position:   stringPtr("Lead Admin"),
				UnitLab:    stringPtr("Central Lab"),
				EmployeeNo: stringPtr("EMP-999"),
			})
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updatedUser models.User
			gomega.Expect(db.DB.First(&updatedUser, user.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedUser.FullName).To(gomega.Equal("New Admin"))
			gomega.Expect(updatedUser.Phone).To(gomega.Equal("0822222222"))

			var updatedAdmin models.Admin
			gomega.Expect(db.DB.First(&updatedAdmin, "user_id = ?", user.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedAdmin.Position).To(gomega.Equal("Lead Admin"))
			gomega.Expect(updatedAdmin.UnitLab).To(gomega.Equal("Central Lab"))
			gomega.Expect(updatedAdmin.EmployeeNo).To(gomega.Equal("EMP-999"))
		})

		ginkgo.It("updates only common user data for other roles", func() {
			user := models.User{
				FullName:     "Old Superadmin",
				Email:        "superadmin@example.com",
				Phone:        "0800000002",
				PasswordHash: "hashed-password",
				Role:         "superadmin",
				IsVerified:   true,
			}
			gomega.Expect(db.DB.Create(&user).Error).NotTo(gomega.HaveOccurred())

			err := UpdateProfile(user.ID, "superadmin", dto.ProfileRequest{
				FullName: stringPtr("New Superadmin"),
				Phone:    stringPtr("0833333333"),
			})
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var updatedUser models.User
			gomega.Expect(db.DB.First(&updatedUser, user.ID).Error).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedUser.FullName).To(gomega.Equal("New Superadmin"))
			gomega.Expect(updatedUser.Phone).To(gomega.Equal("0833333333"))
		})
	})

	ginkgo.Describe("GetUserProfile", func() {
		ginkgo.It("returns the user with preloaded customer and admin relations", func() {
			user := models.User{
				FullName:     "Profile User",
				Email:        "profile@example.com",
				Phone:        "0800000003",
				PasswordHash: "hashed-password",
				Role:         "customer",
				IsVerified:   true,
			}
			gomega.Expect(db.DB.Create(&user).Error).NotTo(gomega.HaveOccurred())

			gomega.Expect(db.DB.Create(&models.Customer{
				UserID:       user.ID,
				Group:        "A",
				IsMembership: true,
				MembershipNo: "MEM-100",
			}).Error).NotTo(gomega.HaveOccurred())

			gomega.Expect(db.DB.Create(&models.Admin{
				UserID:     user.ID,
				Position:   "Coordinator",
				UnitLab:    "Quality Lab",
				EmployeeNo: "EMP-100",
			}).Error).NotTo(gomega.HaveOccurred())

			profile, err := GetUserProfile(user.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(profile.ID).To(gomega.Equal(user.ID))
			gomega.Expect(profile.Customer).NotTo(gomega.BeNil())
			gomega.Expect(profile.Admin).NotTo(gomega.BeNil())
			gomega.Expect(profile.Customer.MembershipNo).To(gomega.Equal("MEM-100"))
			gomega.Expect(profile.Admin.Position).To(gomega.Equal("Coordinator"))
		})
	})

	ginkgo.Describe("GetUnverifiedCustomers", func() {
		ginkgo.It("returns only unverified customers", func() {
			unverified := models.User{
				FullName:     "Unverified Customer",
				Email:        "unverified@example.com",
				Phone:        "0800000004",
				PasswordHash: "hashed-password",
				Role:         "customer",
				IsVerified:   false,
			}
			gomega.Expect(db.DB.Create(&unverified).Error).NotTo(gomega.HaveOccurred())

			verified := models.User{
				FullName:     "Verified Customer",
				Email:        "verified@example.com",
				Phone:        "0800000005",
				PasswordHash: "hashed-password",
				Role:         "customer",
				IsVerified:   true,
			}
			gomega.Expect(db.DB.Create(&verified).Error).NotTo(gomega.HaveOccurred())

			admin := models.User{
				FullName:     "Admin User",
				Email:        "admin-user@example.com",
				Phone:        "0800000006",
				PasswordHash: "hashed-password",
				Role:         "admin",
				IsVerified:   false,
			}
			gomega.Expect(db.DB.Create(&admin).Error).NotTo(gomega.HaveOccurred())

			customers, err := GetUnverifiedCustomers()
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(customers).To(gomega.HaveLen(1))
			gomega.Expect(customers[0].ID).To(gomega.Equal(unverified.ID))
			gomega.Expect(customers[0].Email).To(gomega.Equal("unverified@example.com"))
		})
	})
})
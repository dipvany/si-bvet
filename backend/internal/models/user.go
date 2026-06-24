package models

import "time"

type User struct {
	ID              uint       `json:"id" gorm:"primaryKey;column:id"`
	FullName        string     `json:"fullname" gorm:"column:fullname;type:varchar(255);not null"`
	Email           string     `json:"email" gorm:"column:email;type:varchar(255);not null;uniqueIndex:idx_users_email"`
	Phone           string     `json:"phone" gorm:"column:phone;type:varchar(255);not null;index:idx_users_phone"`
	PasswordHash    string     `json:"-" gorm:"column:password_hash;type:varchar(255);not null"`
	Role            string     `json:"role" gorm:"column:role;type:varchar(32);not null;check:role IN ('superadmin','admin','customer')"`
	IsVerified      bool       `json:"is_verified" gorm:"column:is_verified;not null;default:false"`
	IsActive        bool       `json:"is_active" gorm:"column:is_active;not null;default:true"`
	VerifiedAt      *time.Time `json:"verified_at" gorm:"column:verified_at"`
	LoginLinkTokenHash string   `json:"-" gorm:"column:login_link_token_hash;type:varchar(255)"`
	LoginLinkExpiresAt *time.Time `json:"login_link_expires_at,omitempty" gorm:"column:login_link_expires_at"`
	LoginLinkUsedAt    *time.Time `json:"login_link_used_at,omitempty" gorm:"column:login_link_used_at"`
	ResetPasswordTokenHash string   `json:"-" gorm:"column:reset_password_token_hash;type:varchar(255)"`
	ResetPasswordExpiresAt *time.Time `json:"reset_password_expires_at,omitempty" gorm:"column:reset_password_expires_at"`
	ResetPasswordUsedAt    *time.Time `json:"reset_password_used_at,omitempty" gorm:"column:reset_password_used_at"`
	Institution    string     `json:"institution" gorm:"column:institution;type:varchar(255)"`
	RegistrationDoc string     `json:"-" gorm:"column:registration_doc;type:text"`

	Customer *Customer `json:"customer,omitempty" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Admin    *Admin    `json:"admin,omitempty" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

func (User) TableName() string {
	return "Users"
}
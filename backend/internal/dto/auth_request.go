package dto

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=8"`
}

type RegisterRequest struct {
	FullName        string `json:"fullname" form:"fullname" binding:"required"`
	Email           string `json:"email" form:"email" binding:"required,email"`
	Phone           string `json:"phone" form:"phone" binding:"required"`
	Password        string `json:"password" form:"password" binding:"required"`
	Institution     string `json:"institution" form:"institution" binding:"required"`
	RegistrationDoc string `json:"registration_doc" form:"-"`
	FilePath        string `json:"-" form:"-"`
}

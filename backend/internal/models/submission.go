package models

import "time"

type Submission struct {
	ID                uint       `json:"id" gorm:"primaryKey;column:id"`
	UserID            uint       `json:"user_id" gorm:"column:user_id;not null;index:idx_submission_user_id"`
	NoRegistration    string     `json:"no_registration" gorm:"column:no_registration"`
	NoEpi             string     `json:"no_epi" gorm:"column:no_epi"`
	NoTicket          string     `json:"no_ticket" gorm:"column:no_ticket;not null;uniqueIndex:idx_submission_no_ticket"`
	TypeService       string     `json:"type_service" gorm:"column:type_service;type:varchar(255);not null"`
	PurposeOfTest     string     `json:"purpose_of_test" gorm:"column:purpose_of_test;type:text;not null"`
	DateOfSend        *time.Time `json:"date_of_send" gorm:"column:date_of_send"`
	DateOfReceive     *time.Time `json:"date_of_receive" gorm:"column:date_of_receive"`
	SampleTaker       string     `json:"sample_taker" gorm:"column:sample_taker"`
	IDIsikhnas        string     `json:"id_isikhnas" gorm:"column:id_isikhnas"`
	DiagnosisRequired bool       `json:"diagnosis_required" gorm:"column:diagnosis_required;not null;default:false"`
	AgendaNo          string     `json:"agenda_no" gorm:"column:agenda_no"`
	CustLetterNo      string     `json:"cust_letter_no" gorm:"column:cust_letter_no"`
	CourierName       string     `json:"courier_name" gorm:"column:courier_name"`
	CourierContact    string     `json:"courier_contact" gorm:"column:courier_contact"`
	Notes             string     `json:"notes" gorm:"column:notes;type:text"`
	SamplesCount      int        `json:"samples_count" gorm:"column:samples_count;not null"`
	ProcessStatus     string     `json:"process_status" gorm:"column:process_status;type:varchar(100);not null;index:idx_submission_process_status"`
	AttachmentDoc     string     `json:"attachment_doc" gorm:"column:attachment_doc;type:text"`

	CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`

	User    User         `json:"user_info" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	Samples []Sample     `json:"samples" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Billing *Billing     `json:"billing" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	LHU     *LhuDocument `json:"lhu_document" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Submission) TableName() string {
	return "Submission"
}
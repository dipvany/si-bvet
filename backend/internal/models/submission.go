package models

import "time"

type Submission struct {
	ID               uint      `json:"id" gorm:"primaryKey;column:id"`
	UserID           uint      `json:"user_id" gorm:"column:user_id;not null"`
	NoRegistration   string    `json:"no_registration" gorm:"column:no_registration"`
	NoEpi            string    `json:"no_epi" gorm:"column:no_epi"`
	NoTicket         string    `json:"no_ticket" gorm:"column:no_ticket;not null"`
	TypeService      string    `json:"type_service" gorm:"column:type_service;not null"`
	PurposeOfTest    string    `json:"purpose_of_test" gorm:"column:purpose_of_test;type:text;not null"`
	DateOfSend       *time.Time `json:"date_of_send" gorm:"column:date_of_send"`
	DateOfReceive    *time.Time `json:"date_of_receive" gorm:"column:date_of_receive"`
	SampleTaker      string    `json:"sample_taker" gorm:"column:sample_taker"`
	IDIsikhnas        string     `json:"id_isikhnas" gorm:"column:id_isikhnas"`
	DiagnosisRequired bool     `json:"diagnosis_required" gorm:"column:diagnosis_required"`
	AgendaNo          string     `json:"agenda_no" gorm:"column:agenda_no"`
	CustLetterNo      string     `json:"cust_letter_no" gorm:"column:cust_letter_no"`
	CourierName       string     `json:"courier_name" gorm:"column:courier_name"`
	CourierContact    string     `json:"courier_contact" gorm:"column:courier_contact"`
	Notes             string     `json:"notes" gorm:"column:notes"`
	SamplesCount     int     `json:"samples_count" gorm:"column:samples_count;not null"`
	ProcessStatus    string    `json:"process_status" gorm:"column:process_status;not null"`
	AttachmentDoc string    `json:"attachment_doc" gorm:"column:attachment_doc"`

	CreatedAt        *time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt        *time.Time `json:"updated_at" gorm:"column:updated_at"`

	User User `json:"user_info" gorm:"foreignKey:UserID"`
	Samples []Sample      `json:"samples" gorm:"foreignKey:SubmissionID"`
	Billing *Billing      `json:"billing" gorm:"foreignKey:SubmissionID"`
	Lhu     *LhuDocument  `json:"lhu_document" gorm:"foreignKey:SubmissionID"`
}

func (Submission) TableName() string {
	return "Submission"
}
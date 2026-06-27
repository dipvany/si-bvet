package models

import "time"

type ActivityLog struct {
	ID        uint      `json:"id" gorm:"primarykey"`
	Timestamp time.Time `json:"timestamp" gorm:"index"`
	Actor     string    `json:"actor" gorm:"size:255;index"` // Nama user, atau "SYSTEM"
	ActorID   *uint     `json:"actor_id"` // Nullable foreign key ke tabel users 
	User      *User     `json:"user" gorm:"foreignKey:ActorID"`
	Role      string    `json:"role" gorm:"size:50;index"` // Role dari actor
	Activity  string `json:"activity" gorm:"type:text"`    // Deskripsi aktivitas
	IPAddress string `json:"ip_address" gorm:"size:45"`
	Method    string `json:"method" gorm:"size:10"`
	Endpoint  string `json:"endpoint" gorm:"size:255"`
}

func (ActivityLog) TableName() string {
	return "ActivityLogs"
}
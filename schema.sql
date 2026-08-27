-- 세담홈케어(SEDAMHOME) DB 스키마
-- 실행: mysql -u root -p < schema.sql
CREATE DATABASE IF NOT EXISTS sedamhome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sedamhome;

CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,          -- 이름
  phone       VARCHAR(30)  NOT NULL,          -- 연락처
  addr        VARCHAR(120),                   -- 지역/단지명
  size        VARCHAR(20),                    -- 평수
  services    VARCHAR(255),                   -- 원하는 서비스, 콤마 구분 (예: "입주청소, 줄눈시공")
  hope_date   DATE,                           -- 희망 시공일
  memo        TEXT,                           -- 추가 요청사항
  agreed      TINYINT(1) NOT NULL DEFAULT 0,  -- 개인정보 수집·이용 동의 기록
  status      ENUM('신규','상담중','완료','보류') DEFAULT '신규',
  admin_memo  TEXT,
  ip_address  VARCHAR(45),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) CHARACTER SET utf8mb4;

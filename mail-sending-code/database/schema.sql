-- Email Marketing Infrastructure Management System Database Schema
-- Database: bulkmail_sending

CREATE DATABASE IF NOT EXISTS `bulkmail_sending` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bulkmail_sending`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'admin',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `status` ENUM('draft', 'queued', 'sending', 'sent', 'paused', 'failed') NOT NULL DEFAULT 'draft',
  `total_recipients` INT NOT NULL DEFAULT 0,
  `sent_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `open_count` INT NOT NULL DEFAULT 0,
  `attachment_path` VARCHAR(500) NULL,
  `attachment_name` VARCHAR(255) NULL,
  `scheduled_at` DATETIME(3) NULL,
  `sent_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_campaigns_user_id` (`user_id`),
  CONSTRAINT `fk_campaigns_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Recipients Table
CREATE TABLE IF NOT EXISTS `recipients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NULL DEFAULT '',
  `variables` JSON NULL,
  `status` ENUM('pending', 'sent', 'failed', 'bounced', 'complained', 'unsubscribed') NOT NULL DEFAULT 'pending',
  `sent_at` DATETIME(3) NULL,
  `opened_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_recipients_campaign_id` (`campaign_id`),
  INDEX `idx_recipients_email` (`email`),
  CONSTRAINT `fk_recipients_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Logs Table
CREATE TABLE IF NOT EXISTS `logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` INT NULL,
  `recipient_id` INT NULL,
  `email` VARCHAR(255) NOT NULL,
  `status` ENUM('sent', 'failed', 'bounced', 'complained', 'opened') NOT NULL,
  `bounce_type` ENUM('hard', 'soft', 'none') NOT NULL DEFAULT 'none',
  `complaint_reason` VARCHAR(500) NULL,
  `domain_used` VARCHAR(255) NULL,
  `error_message` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_logs_status` (`status`),
  INDEX `idx_logs_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Domains Table
CREATE TABLE IF NOT EXISTS `domains` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL UNIQUE,
  `ip_address` VARCHAR(50) NULL,
  `status` ENUM('active', 'warmup', 'inactive', 'blacklisted') NOT NULL DEFAULT 'warmup',
  `reputation_score` INT NOT NULL DEFAULT 100,
  `emails_sent_today` INT NOT NULL DEFAULT 0,
  `daily_limit` INT NOT NULL DEFAULT 500,
  `last_used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Suppression List Table
CREATE TABLE IF NOT EXISTS `suppression_list` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `reason` ENUM('hard_bounce', 'soft_bounce', 'complaint', 'unsubscribe', 'manual') NOT NULL,
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Email Stats Table
CREATE TABLE IF NOT EXISTS `email_stats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `stat_date` DATE NOT NULL UNIQUE,
  `emails_sent` INT NOT NULL DEFAULT 0,
  `emails_delivered` INT NOT NULL DEFAULT 0,
  `emails_failed` INT NOT NULL DEFAULT 0,
  `emails_bounced` INT NOT NULL DEFAULT 0,
  `emails_complained` INT NOT NULL DEFAULT 0,
  `emails_opened` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

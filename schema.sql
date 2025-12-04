CREATE DATABASE IF NOT EXISTS `condo_market` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `condo_market`;

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(255),
  `avatar_url` TEXT,
  `password_hash` TEXT,
  `confirmed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Idempotent unique index for email (MySQL 8.0+)
-- Unique index on email is expected to be present from first setup.
-- On re-runs, skip creating it to avoid version-specific IF NOT EXISTS issues.

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255),
  `description` TEXT,
  `price` DECIMAL(10,2),
  `user_id` VARCHAR(255) NOT NULL,
  `images` TEXT,
  `image_url` TEXT,
  `categories` TEXT,
  `is_featured` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`user_id`),
  INDEX (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_user`
    FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `from_user_id` VARCHAR(255) NOT NULL,
  `to_user_id` VARCHAR(255) NOT NULL,
  `rating` INT,
  `comment` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `reviews`
  ADD INDEX `idx_reviews_to_user` (`to_user_id`),
  ADD INDEX `idx_reviews_from_user` (`from_user_id`),
  ADD CONSTRAINT `fk_reviews_from`
    FOREIGN KEY (`from_user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_to`
    FOREIGN KEY (`to_user_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `buyer_id` VARCHAR(255) NOT NULL,
  `seller_id` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `chat_sessions`
  ADD INDEX `idx_chat_product` (`product_id`),
  ADD INDEX `idx_chat_buyer` (`buyer_id`),
  ADD INDEX `idx_chat_seller` (`seller_id`),
  ADD CONSTRAINT `fk_chat_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_chat_buyer`
    FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_chat_seller`
    FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `chat_id` INT NOT NULL,
  `sender_id` VARCHAR(255) NOT NULL,
  `message` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `chat_messages`
  ADD INDEX `idx_msg_chat` (`chat_id`),
  ADD INDEX `idx_msg_sender` (`sender_id`),
  ADD CONSTRAINT `fk_msg_chat`
    FOREIGN KEY (`chat_id`) REFERENCES `chat_sessions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_msg_sender`
    FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

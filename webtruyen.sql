/*
SQLyog Community v13.3.1 (64 bit)
MySQL - 10.4.32-MariaDB : Database - webtruyen
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`webtruyen` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `webtruyen`;

/*Table structure for table `authors` */

DROP TABLE IF EXISTS `authors`;

CREATE TABLE `authors` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `authors` */

insert  into `authors`(`id`,`name`,`description`,`avatar_url`,`created_at`) values 
(1,'chưa rõ',NULL,NULL,'2026-04-20 14:38:20');

/*Table structure for table `chapters` */

DROP TABLE IF EXISTS `chapters`;

CREATE TABLE `chapters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `story_id` bigint(20) NOT NULL,
  `chapter_number` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `image_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`image_urls`)),
  `view_count` bigint(20) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_chapter` (`story_id`,`chapter_number`),
  KEY `idx_chapter_story` (`story_id`),
  CONSTRAINT `fk_chapter_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `chapters` */

insert  into `chapters`(`id`,`story_id`,`chapter_number`,`title`,`content`,`image_urls`,`view_count`,`created_at`,`updated_at`) values 
(1,1,1,'Khăn trải bản thần kì','','[\"/img/story_1/chapter_1/001.jpg\",\"/img/story_1/chapter_1/002.jpg\",\"/img/story_1/chapter_1/003.jpg\",\"/img/story_1/chapter_1/004.jpg\",\"/img/story_1/chapter_1/005.jpg\",\"/img/story_1/chapter_1/006.jpg\",\"/img/story_1/chapter_1/007.jpg\",\"/img/story_1/chapter_1/008.jpg\",\"/img/story_1/chapter_1/009.jpg\",\"/img/story_1/chapter_1/010.jpg\",\"/img/story_1/chapter_1/011.jpg\"]',0,'2026-04-21 14:06:47','2026-04-21 14:06:47'),
(3,1,2,'đôi găng tay vô hình','','[\"/img/story_1/chapter_2/001.jpg\",\"/img/story_1/chapter_2/002.jpg\",\"/img/story_1/chapter_2/003.jpg\",\"/img/story_1/chapter_2/004.jpg\",\"/img/story_1/chapter_2/005.jpg\"]',0,'2026-04-21 14:24:44','2026-04-21 14:24:44');

/*Table structure for table `comments` */

DROP TABLE IF EXISTS `comments`;

CREATE TABLE `comments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `story_id` bigint(20) NOT NULL,
  `chapter_id` bigint(20) DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_comment_user` (`user_id`),
  KEY `fk_comment_chapter` (`chapter_id`),
  KEY `idx_comment_story` (`story_id`),
  CONSTRAINT `fk_comment_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comment_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `comments` */

/*Table structure for table `favorites` */

DROP TABLE IF EXISTS `favorites`;

CREATE TABLE `favorites` (
  `user_id` bigint(20) NOT NULL,
  `story_id` bigint(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`story_id`),
  KEY `fk_fav_story` (`story_id`),
  CONSTRAINT `fk_fav_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `favorites` */

/*Table structure for table `genres` */

DROP TABLE IF EXISTS `genres`;

CREATE TABLE `genres` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `genres` */

insert  into `genres`(`id`,`name`) values 
(2,'Hệ thống & Xuyên nhanh'),
(3,'Manga'),
(1,'Ngôn tình hiện đại & Cổ đại '),
(4,'Truyện Ngắn'),
(5,'Truyện thiếu nhi');

/*Table structure for table `password_reset_tokens` */

DROP TABLE IF EXISTS `password_reset_tokens`;

CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `expiry_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `fk_reset_user` (`user_id`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `password_reset_tokens` */

/*Table structure for table `reading_history` */

DROP TABLE IF EXISTS `reading_history`;

CREATE TABLE `reading_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `story_id` bigint(20) NOT NULL,
  `chapter_id` bigint(20) NOT NULL,
  `progress` int(11) DEFAULT 0,
  `last_read` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_rh_user` (`user_id`),
  KEY `fk_rh_story` (`story_id`),
  KEY `fk_rh_chapter` (`chapter_id`),
  CONSTRAINT `fk_rh_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rh_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `reading_history` */

/*Table structure for table `roles` */

DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `roles` */

insert  into `roles`(`id`,`role_name`) values 
(1,'ADMIN'),
(2,'CLIENT');

/*Table structure for table `stories` */

DROP TABLE IF EXISTS `stories`;

CREATE TABLE `stories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cover_url` varchar(500) DEFAULT NULL,
  `author_id` bigint(20) NOT NULL,
  `status` enum('ONGOING','COMPLETED','HIATUS') DEFAULT 'ONGOING',
  `view_count` bigint(20) DEFAULT 0,
  `rating` decimal(3,1) DEFAULT 0.0,
  `active` tinyint(1) DEFAULT 1,
  `created_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_story_creator` (`created_by`),
  KEY `idx_story_slug` (`slug`),
  KEY `idx_story_title` (`title`),
  KEY `idx_story_author` (`author_id`),
  CONSTRAINT `fk_story_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`),
  CONSTRAINT `fk_story_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `stories` */

insert  into `stories`(`id`,`title`,`slug`,`description`,`cover_url`,`author_id`,`status`,`view_count`,`rating`,`active`,`created_by`,`created_at`,`updated_at`) values 
(1,'dotemon','do-re-mon-xuyen-không','dotemon đã xuyên không','/img/1776696218613_9199f8fb2dcaca9a604e202fd62e0b90.jpg',1,'ONGOING',0,0.0,1,NULL,'2026-04-20 21:38:20','2026-04-20 21:43:38'),
(2,'10 công thức gà rán siêu ngon của vua đầu bết','10-cong-thuc-ga-ran-sieu-ngon-cua-vua-đau-bet','Trùm màn mẹ luôn chứ gì nữa\r\n','/img/1776699117627_z6621320735329_45cab1f46819043b0f19fae3516f8fbd.jpg',1,'COMPLETED',0,0.0,1,NULL,'2026-04-20 22:31:57','2026-04-20 22:31:57');

/*Table structure for table `story_genres` */

DROP TABLE IF EXISTS `story_genres`;

CREATE TABLE `story_genres` (
  `story_id` bigint(20) NOT NULL,
  `genre_id` bigint(20) NOT NULL,
  PRIMARY KEY (`story_id`,`genre_id`),
  KEY `fk_sg_genre` (`genre_id`),
  CONSTRAINT `fk_sg_genre` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sg_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `story_genres` */

insert  into `story_genres`(`story_id`,`genre_id`) values 
(1,2),
(1,3),
(1,5),
(2,4);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_user_role` (`role_id`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `users` */

insert  into `users`(`id`,`username`,`email`,`password`,`role_id`,`created_at`) values 
(2,'davitgiang','anbam999@gmail.com','$2a$10$wGTR0ngulJ5leUn3uS8zx.fl4WyyQFAbmdm2Y5cohoIZzXIBvl2Bi',1,'2026-03-23 14:16:07'),
(11,'Nguyen Van A','anbam99@gmail.com','$2a$10$cLpSBg5DGUBedgqK/GKpIuuW/ON4Am4yXPSdodddxlZHTtk4RWz5e',1,'2026-03-23 16:26:08');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

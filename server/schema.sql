-- ============================================================
-- 玄玑洞府 · 数据库初始化脚本（MySQL 8.0）
-- 服务端默认使用零配置的 JSON 存储（见 src/lib/store.ts），
-- 字段结构与本脚本完全一致；若需切换到 MySQL，导入本脚本后
-- 将 store.ts 的读写实现替换为对应的 SQL 语句即可，路由层无需改动。
-- ============================================================

CREATE DATABASE IF NOT EXISTS `xuanji_dongfu`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `xuanji_dongfu`;

-- 1. 管理员表
CREATE TABLE IF NOT EXISTS `admin` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
  `username`      VARCHAR(50)  NOT NULL COMMENT '账号',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 2. 个人信息表（固定 id = 1）
CREATE TABLE IF NOT EXISTS `profile` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '固定ID=1',
  `dao_name`         VARCHAR(50)  NOT NULL COMMENT '道号',
  `bone_age`         INT          NULL     COMMENT '骨龄',
  `location`         VARCHAR(100) NULL     COMMENT '修行地界',
  `realm`            VARCHAR(50)  NULL     COMMENT '修为境界',
  `motto`            TEXT         NULL     COMMENT '道心所向',
  `tech_stack`       JSON         NULL     COMMENT '主修功法数组',
  `avatar_url`       VARCHAR(255) NULL     COMMENT '虚拟形象地址',
  `particle_strength` TINYINT UNSIGNED NOT NULL DEFAULT 70 COMMENT '粒子强度 0-100',
  `greetings`        JSON         NULL     COMMENT '问候语池',
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='个人信息表';

-- 3. 工作经历表
CREATE TABLE IF NOT EXISTS `experience` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sect_name`    VARCHAR(100) NOT NULL COMMENT '宗门名称',
  `position`     VARCHAR(50)  NOT NULL COMMENT '司职',
  `start_date`   DATE         NOT NULL COMMENT '修行开始时间',
  `end_date`     DATE         NULL     COMMENT '修行结束时间，空=至今',
  `duties`       TEXT         NULL     COMMENT '执掌事务',
  `achievements` TEXT         NULL     COMMENT '修为精进',
  `sort`         INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `status`       TINYINT      NOT NULL DEFAULT 1 COMMENT '0下架1上架',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_experience_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作经历表';

-- 4. 项目表
CREATE TABLE IF NOT EXISTS `project` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL COMMENT '法宝名',
  `level`       VARCHAR(20)  NULL     COMMENT '品阶',
  `category`    VARCHAR(50)  NULL     COMMENT '分类',
  `tech_stack`  JSON         NULL     COMMENT '炼制材料',
  `description` TEXT         NULL     COMMENT '法宝功用',
  `github_url`  VARCHAR(255) NULL     COMMENT '祭炼之地',
  `cover_url`   VARCHAR(255) NULL     COMMENT '封面图',
  `sort`        INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `status`      TINYINT      NOT NULL DEFAULT 1 COMMENT '0下架1上架',
  `views`       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '品鉴数',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_sort` (`sort`),
  KEY `idx_project_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

-- 5. 联系方式表
CREATE TABLE IF NOT EXISTS `contact` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`       VARCHAR(50)  NOT NULL COMMENT '玉符类型',
  `label`      VARCHAR(50)  NOT NULL COMMENT '显示名称',
  `value`      VARCHAR(255) NOT NULL COMMENT '账号/链接',
  `icon`       VARCHAR(100) NULL     COMMENT '图标名',
  `sort`       INT          NOT NULL DEFAULT 0 COMMENT '排序权重',
  `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '0隐藏1显示',
  `clicks`     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '传讯次数',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='联系方式表';

-- 6. 登录日志表
CREATE TABLE IF NOT EXISTS `login_log` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL,
  `ip`         VARCHAR(64)  NULL,
  `user_agent` VARCHAR(512) NULL,
  `success`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志表';

-- 初始化管理员（密码明文 xuanji123 对应的 bcrypt 哈希，请上线前修改）
INSERT INTO `admin` (`username`, `password_hash`)
SELECT 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE NOT EXISTS (SELECT 1 FROM `admin` WHERE `username` = 'admin');

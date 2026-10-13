-- Angora Work OS Phase 0 Baseline Backup
-- Generated: 2026-10-13 18:37:52
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `agency_projects`;
CREATE TABLE `agency_projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `client_id` bigint(20) unsigned NOT NULL,
  `project_manager_id` bigint(20) unsigned DEFAULT NULL,
  `project_leader_id` bigint(20) unsigned DEFAULT NULL,
  `board_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Planning',
  `priority` varchar(255) NOT NULL DEFAULT 'Medium',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `client_visible` tinyint(1) NOT NULL DEFAULT 1,
  `client_access_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`client_access_settings`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `agency_projects_client_id_foreign` (`client_id`),
  KEY `agency_projects_project_manager_id_foreign` (`project_manager_id`),
  KEY `agency_projects_project_leader_id_foreign` (`project_leader_id`),
  KEY `agency_projects_board_id_foreign` (`board_id`),
  CONSTRAINT `agency_projects_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_projects_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `sales_customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_projects_project_leader_id_foreign` FOREIGN KEY (`project_leader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_projects_project_manager_id_foreign` FOREIGN KEY (`project_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ai_conversations`;
CREATE TABLE `ai_conversations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'New Conversation',
  `context_type` varchar(255) NOT NULL DEFAULT 'general',
  `context_id` bigint(20) unsigned DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_conversations_workspace_id_foreign` (`workspace_id`),
  KEY `ai_conversations_user_id_updated_at_index` (`user_id`,`updated_at`),
  CONSTRAINT `ai_conversations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_conversations_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ai_messages`;
CREATE TABLE `ai_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint(20) unsigned NOT NULL,
  `role` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `tool_calls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_calls`)),
  `tool_results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tool_results`)),
  `citations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`citations`)),
  `tokens_used` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_messages_conversation_id_index` (`conversation_id`),
  CONSTRAINT `ai_messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ai_provider_configs`;
CREATE TABLE `ai_provider_configs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `provider` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `api_key_encrypted` text DEFAULT NULL,
  `base_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `monthly_token_cap` int(10) unsigned NOT NULL DEFAULT 1000000,
  `monthly_spend_cap` decimal(10,4) NOT NULL DEFAULT 50.0000,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_provider_configs_workspace_id_foreign` (`workspace_id`),
  KEY `ai_provider_configs_created_by_foreign` (`created_by`),
  CONSTRAINT `ai_provider_configs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_provider_configs_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ai_usage_records`;
CREATE TABLE `ai_usage_records` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `prompt_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `completion_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `total_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `estimated_cost` decimal(10,6) NOT NULL DEFAULT 0.000000,
  `context_type` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_usage_records_workspace_id_created_at_index` (`workspace_id`,`created_at`),
  KEY `ai_usage_records_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `ai_usage_records_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_usage_records_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `analytics_reports`;
CREATE TABLE `analytics_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `report_type` varchar(255) NOT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `analytics_reports_created_by_foreign` (`created_by`),
  CONSTRAINT `analytics_reports_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_request_logs`;
CREATE TABLE `api_request_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `api_token_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `method` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `status_code` smallint(5) unsigned NOT NULL,
  `response_time_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `api_request_logs_user_id_foreign` (`user_id`),
  KEY `api_request_logs_api_token_id_created_at_index` (`api_token_id`,`created_at`),
  CONSTRAINT `api_request_logs_api_token_id_foreign` FOREIGN KEY (`api_token_id`) REFERENCES `api_tokens` (`id`) ON DELETE SET NULL,
  CONSTRAINT `api_request_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `api_tokens`;
CREATE TABLE `api_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `token_prefix` varchar(16) NOT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  `last_used_at` timestamp NULL DEFAULT NULL,
  `last_used_ip` varchar(45) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_revoked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_tokens_token_hash_unique` (`token_hash`),
  KEY `api_tokens_workspace_id_foreign` (`workspace_id`),
  KEY `api_tokens_user_id_is_revoked_index` (`user_id`,`is_revoked`),
  CONSTRAINT `api_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `api_tokens_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` bigint(20) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('1', '1', 'System', 'SYSTEM_DEPLOYMENT', 'Platform', '1', 'Multi-Tools Platform core architecture provisioned with 10 role personas.', '{\"env\":\"production_ready\",\"modules\":10}', '127.0.0.1', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('2', '2', 'Operations', 'ROLE_PERSONA_SWITCH', 'User', '2', 'Switched active test persona to Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-09 14:56:24', '2026-10-09 14:56:24');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('3', '3', 'Engineering', 'ROLE_PERSONA_SWITCH', 'User', '3', 'Switched active test persona to David Chen (dept_user)', NULL, '127.0.0.1', '2026-10-09 14:56:29', '2026-10-09 14:56:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('4', '4', 'Human Resources', 'ROLE_PERSONA_SWITCH', 'User', '4', 'Switched active test persona to Sarah Jenkins (hr_staff)', NULL, '127.0.0.1', '2026-10-09 14:56:31', '2026-10-09 14:56:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('5', '5', 'Production & QC', 'ROLE_PERSONA_SWITCH', 'User', '5', 'Switched active test persona to Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 14:56:32', '2026-10-09 14:56:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('6', '6', 'Sales', 'ROLE_PERSONA_SWITCH', 'User', '6', 'Switched active test persona to Rachel Sterling (sales_staff)', NULL, '127.0.0.1', '2026-10-09 14:56:34', '2026-10-09 14:56:34');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('7', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 14:56:36', '2026-10-09 14:56:36');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('8', '8', 'Finance', 'ROLE_PERSONA_SWITCH', 'User', '8', 'Switched active test persona to Sophia Martinez (finance_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:09', '2026-10-09 15:10:09');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('9', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:10:12', '2026-10-09 15:10:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('10', '2', 'Operations', 'ROLE_PERSONA_SWITCH', 'User', '2', 'Switched active test persona to Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-09 15:10:13', '2026-10-09 15:10:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('11', '3', 'Engineering', 'ROLE_PERSONA_SWITCH', 'User', '3', 'Switched active test persona to David Chen (dept_user)', NULL, '127.0.0.1', '2026-10-09 15:10:16', '2026-10-09 15:10:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('12', '4', 'Human Resources', 'ROLE_PERSONA_SWITCH', 'User', '4', 'Switched active test persona to Sarah Jenkins (hr_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:18', '2026-10-09 15:10:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('13', '5', 'Production & QC', 'ROLE_PERSONA_SWITCH', 'User', '5', 'Switched active test persona to Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:21', '2026-10-09 15:10:21');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('14', '6', 'Sales', 'ROLE_PERSONA_SWITCH', 'User', '6', 'Switched active test persona to Rachel Sterling (sales_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:23', '2026-10-09 15:10:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('15', '7', 'Marketing', 'ROLE_PERSONA_SWITCH', 'User', '7', 'Switched active test persona to Liam Gallagher (marketing_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:26', '2026-10-09 15:10:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('16', '8', 'Finance', 'ROLE_PERSONA_SWITCH', 'User', '8', 'Switched active test persona to Sophia Martinez (finance_staff)', NULL, '127.0.0.1', '2026-10-09 15:10:29', '2026-10-09 15:10:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('17', '9', 'General Staff', 'ROLE_PERSONA_SWITCH', 'User', '9', 'Switched active test persona to Julian Alvarez (team_member)', NULL, '127.0.0.1', '2026-10-09 15:10:31', '2026-10-09 15:10:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('18', '10', 'Partner / Client', 'ROLE_PERSONA_SWITCH', 'User', '10', 'Switched active test persona to Aria Thorne (external_user)', NULL, '127.0.0.1', '2026-10-09 15:10:33', '2026-10-09 15:10:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('19', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:15:25', '2026-10-09 15:15:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('20', '2', 'Operations', 'ROLE_PERSONA_SWITCH', 'User', '2', 'Switched active test persona to Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-09 15:15:28', '2026-10-09 15:15:28');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('21', '3', 'Engineering', 'ROLE_PERSONA_SWITCH', 'User', '3', 'Switched active test persona to David Chen (dept_user)', NULL, '127.0.0.1', '2026-10-09 15:15:30', '2026-10-09 15:15:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('22', '4', 'Human Resources', 'ROLE_PERSONA_SWITCH', 'User', '4', 'Switched active test persona to Sarah Jenkins (hr_staff)', NULL, '127.0.0.1', '2026-10-09 15:15:33', '2026-10-09 15:15:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('23', '5', 'Production & QC', 'ROLE_PERSONA_SWITCH', 'User', '5', 'Switched active test persona to Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 15:15:35', '2026-10-09 15:15:35');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('24', '6', 'Sales', 'ROLE_PERSONA_SWITCH', 'User', '6', 'Switched active test persona to Rachel Sterling (sales_staff)', NULL, '127.0.0.1', '2026-10-09 15:15:39', '2026-10-09 15:15:39');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('25', '7', 'Marketing', 'ROLE_PERSONA_SWITCH', 'User', '7', 'Switched active test persona to Liam Gallagher (marketing_staff)', NULL, '127.0.0.1', '2026-10-09 15:15:41', '2026-10-09 15:15:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('26', '8', 'Finance', 'ROLE_PERSONA_SWITCH', 'User', '8', 'Switched active test persona to Sophia Martinez (finance_staff)', NULL, '127.0.0.1', '2026-10-09 15:15:44', '2026-10-09 15:15:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('27', '9', 'General Staff', 'ROLE_PERSONA_SWITCH', 'User', '9', 'Switched active test persona to Julian Alvarez (team_member)', NULL, '127.0.0.1', '2026-10-09 15:15:47', '2026-10-09 15:15:47');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('28', '10', 'Partner / Client', 'ROLE_PERSONA_SWITCH', 'User', '10', 'Switched active test persona to Aria Thorne (external_user)', NULL, '127.0.0.1', '2026-10-09 15:15:49', '2026-10-09 15:15:49');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('29', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:16:13', '2026-10-09 15:16:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('30', '2', 'Operations', 'ROLE_PERSONA_SWITCH', 'User', '2', 'Switched active test persona to Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-09 15:50:16', '2026-10-09 15:50:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('31', '3', 'Engineering', 'ROLE_PERSONA_SWITCH', 'User', '3', 'Switched active test persona to David Chen (dept_user)', NULL, '127.0.0.1', '2026-10-09 15:50:18', '2026-10-09 15:50:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('32', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:50:50', '2026-10-09 15:50:50');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('33', '5', 'Production & QC', 'ROLE_PERSONA_SWITCH', 'User', '5', 'Switched active test persona to Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 15:51:08', '2026-10-09 15:51:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('34', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:51:12', '2026-10-09 15:51:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('35', '5', 'Production & QC', 'ROLE_PERSONA_SWITCH', 'User', '5', 'Switched active test persona to Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 15:51:18', '2026-10-09 15:51:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('36', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-09 15:54:21', '2026-10-09 15:54:21');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('37', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Backlog to Quality Review', NULL, '127.0.0.1', '2026-10-09 15:54:22', '2026-10-09 15:54:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('38', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-09 15:54:25', '2026-10-09 15:54:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('39', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-09 15:54:27', '2026-10-09 15:54:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('40', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-09 15:54:29', '2026-10-09 15:54:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('41', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 15:57:33', '2026-10-09 15:57:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('42', '2', 'Operations', 'ROLE_PERSONA_SWITCH', 'User', '2', 'Switched active test persona to Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-09 16:00:32', '2026-10-09 16:00:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('43', '4', 'Human Resources', 'ROLE_PERSONA_SWITCH', 'User', '4', 'Switched active test persona to Sarah Jenkins (hr_staff)', NULL, '127.0.0.1', '2026-10-09 16:00:34', '2026-10-09 16:00:34');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('44', '6', 'Sales', 'ROLE_PERSONA_SWITCH', 'User', '6', 'Switched active test persona to Rachel Sterling (sales_staff)', NULL, '127.0.0.1', '2026-10-09 16:00:36', '2026-10-09 16:00:36');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('45', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 16:00:38', '2026-10-09 16:00:38');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('46', '10', 'Partner / Client', 'ROLE_PERSONA_SWITCH', 'User', '10', 'Switched active test persona to Aria Thorne (external_user)', NULL, '127.0.0.1', '2026-10-09 16:01:24', '2026-10-09 16:01:24');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('47', '1', 'Executive', 'ROLE_PERSONA_SWITCH', 'User', '1', 'Switched active test persona to Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 16:01:26', '2026-10-09 16:01:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('48', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-09 16:17:53', '2026-10-09 16:17:53');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('49', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-09 16:17:54', '2026-10-09 16:17:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('50', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:00', '2026-10-09 16:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('51', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:03', '2026-10-09 16:52:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('52', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:03', '2026-10-09 16:52:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('53', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:04', '2026-10-09 16:52:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('54', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('55', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('56', '1', 'System', 'RBAC_PERMISSIONS_UPDATED', 'Role', NULL, 'Updated permissions matrix for role \'admin_manager\' (27 permissions granted)', NULL, '127.0.0.1', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('57', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-09 17:02:41', '2026-10-09 17:02:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('58', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-09 17:02:42', '2026-10-09 17:02:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('59', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-09 17:02:43', '2026-10-09 17:02:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('60', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-09 17:02:43', '2026-10-09 17:02:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('61', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Completed to Quality Review', NULL, '127.0.0.1', '2026-10-09 17:02:44', '2026-10-09 17:02:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('62', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Quality Review to Completed', NULL, '127.0.0.1', '2026-10-09 17:02:45', '2026-10-09 17:02:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('63', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from Quality Review to Backlog', NULL, '127.0.0.1', '2026-10-09 17:02:45', '2026-10-09 17:02:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('64', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Backlog to Quality Review', NULL, '127.0.0.1', '2026-10-09 17:02:46', '2026-10-09 17:02:46');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('65', '1', 'General', 'DOCUMENT_UPLOADED', 'Document', '5', 'Uploaded document: Test (Test)', NULL, '127.0.0.1', '2026-10-09 17:07:15', '2026-10-09 17:07:15');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('66', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 17:31:01', '2026-10-09 17:31:01');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('67', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-09 19:31:23', '2026-10-09 19:31:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('68', '1', 'Finance', 'FINANCE_EXPENSE_PROCESSED', 'FinanceExpense', '2', 'Expense #2 marked as Approved', NULL, '127.0.0.1', '2026-10-09 19:31:43', '2026-10-09 19:31:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('69', '1', 'Documents', 'DOCUMENT_TRASHED', 'Document', '5', 'Document Test moved to recycle bin', NULL, '127.0.0.1', '2026-10-09 19:32:02', '2026-10-09 19:32:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('70', '5', 'Production & QC', 'DEV_QUICK_LOGIN', 'User', '5', 'Development Quick Login as Marcus Brody (production_staff)', NULL, '127.0.0.1', '2026-10-09 21:15:32', '2026-10-09 21:15:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('71', '5', 'Production & QC', 'PRODUCTION_WORK_ORDER_CREATED', 'ProductionWorkOrder', '4', 'Created Work Order WO-2026-983 for 1000 units of ABC', NULL, '127.0.0.1', '2026-10-09 21:16:05', '2026-10-09 21:16:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('72', '5', 'Production & QC', 'PRODUCTION_STATUS_UPDATED', 'ProductionWorkOrder', '4', 'Work Order WO-2026-983 updated to In Production (0/1000 units)', NULL, '127.0.0.1', '2026-10-09 21:16:12', '2026-10-09 21:16:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('73', '5', 'Operations', 'KANBAN_TASK_CREATED', 'KanbanTask', '5', 'Created task: Test with priority Medium', NULL, '127.0.0.1', '2026-10-09 21:16:23', '2026-10-09 21:16:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('74', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-09 21:16:27', '2026-10-09 21:16:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('75', '5', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-09 21:16:31', '2026-10-09 21:16:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('76', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-12 17:26:52', '2026-10-12 17:26:52');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('77', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:12', '2026-10-12 17:27:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('78', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:13', '2026-10-12 17:27:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('79', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Quality Review to Completed', NULL, '127.0.0.1', '2026-10-12 17:27:13', '2026-10-12 17:27:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('80', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Completed to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:14', '2026-10-12 17:27:14');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('81', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 17:27:14', '2026-10-12 17:27:14');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('82', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:15', '2026-10-12 17:27:15');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('83', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:15', '2026-10-12 17:27:15');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('84', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to Completed', NULL, '127.0.0.1', '2026-10-12 17:27:16', '2026-10-12 17:27:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('85', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Completed to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:16', '2026-10-12 17:27:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('86', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:16', '2026-10-12 17:27:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('87', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 17:27:17', '2026-10-12 17:27:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('88', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:47', '2026-10-12 17:27:47');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('89', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:48', '2026-10-12 17:27:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('90', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Quality Review to Completed', NULL, '127.0.0.1', '2026-10-12 17:27:49', '2026-10-12 17:27:49');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('91', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Completed to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:49', '2026-10-12 17:27:49');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('92', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:49', '2026-10-12 17:27:49');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('93', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 17:27:50', '2026-10-12 17:27:50');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('94', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:51', '2026-10-12 17:27:51');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('95', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:52', '2026-10-12 17:27:52');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('96', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to Completed', NULL, '127.0.0.1', '2026-10-12 17:27:52', '2026-10-12 17:27:52');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('97', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Completed to Quality Review', NULL, '127.0.0.1', '2026-10-12 17:27:53', '2026-10-12 17:27:53');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('98', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-12 17:27:53', '2026-10-12 17:27:53');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('99', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 17:27:53', '2026-10-12 17:27:53');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('100', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-12 17:28:51', '2026-10-12 17:28:51');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('101', '8', 'Finance', 'DEV_QUICK_LOGIN', 'User', '8', 'Development Quick Login as Sophia Martinez (finance_staff)', NULL, '127.0.0.1', '2026-10-12 17:35:06', '2026-10-12 17:35:06');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('102', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-12 17:54:22', '2026-10-12 17:54:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('103', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-12 17:54:38', '2026-10-12 17:54:38');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('104', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 17:55:40', '2026-10-12 17:55:40');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('105', '1', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 17:55:40', '2026-10-12 17:55:40');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('106', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-12 18:05:57', '2026-10-12 18:05:57');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('107', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from In Progress to Backlog', NULL, '127.0.0.1', '2026-10-12 18:05:58', '2026-10-12 18:05:58');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('108', '2', 'Operations', 'DEV_QUICK_LOGIN', 'User', '2', 'Development Quick Login as Elena Rostova (admin_manager)', NULL, '127.0.0.1', '2026-10-12 18:13:49', '2026-10-12 18:13:49');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('109', '2', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 18:17:12', '2026-10-12 18:17:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('110', '2', 'Operations', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Quality Review to In Progress', NULL, '127.0.0.1', '2026-10-12 18:17:13', '2026-10-12 18:17:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('111', '3', 'Engineering', 'DEV_QUICK_LOGIN', 'User', '3', 'Development Quick Login as David Chen (dept_user)', NULL, '127.0.0.1', '2026-10-12 18:32:42', '2026-10-12 18:32:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('112', '3', 'Engineering', 'TASK_ATTACHMENT_UPLOADED', 'KanbanAttachment', '1', 'Uploaded attachment \'a98b7308-2ed1-4ba7-af42-aa277f8cc439.png\' to task \'Deploy Multi-Tenant RBAC Security Module\'', NULL, '127.0.0.1', '2026-10-12 19:48:54', '2026-10-12 19:48:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('113', '3', 'Engineering', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to Quality Review', NULL, '127.0.0.1', '2026-10-12 19:49:14', '2026-10-12 19:49:14');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('114', '3', 'Engineering', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to Backlog', NULL, '127.0.0.1', '2026-10-12 19:49:18', '2026-10-12 19:49:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('115', '3', 'Engineering', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Backlog to Quality Review', NULL, '127.0.0.1', '2026-10-12 19:49:19', '2026-10-12 19:49:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('116', '3', 'Engineering', 'KANBAN_TASK_MOVED', 'KanbanTask', '5', 'Moved task \'Test\' from Quality Review to Backlog', NULL, '127.0.0.1', '2026-10-12 19:49:21', '2026-10-12 19:49:21');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('117', '3', 'Engineering', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 20:00:25', '2026-10-12 20:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('118', '9', 'General Staff', 'DEV_QUICK_LOGIN', 'User', '9', 'Development Quick Login as Julian Alvarez (team_member)', NULL, '127.0.0.1', '2026-10-12 20:01:14', '2026-10-12 20:01:14');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('119', '9', 'General Staff', 'KANBAN_TASK_MOVED', 'KanbanTask', '4', 'Moved task \'Deploy Multi-Tenant RBAC Security Module\' from In Progress to Quality Review', NULL, '127.0.0.1', '2026-10-12 20:01:45', '2026-10-12 20:01:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('120', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-12 20:42:20', '2026-10-12 20:42:20');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('121', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-13 17:34:54', '2026-10-13 17:34:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('122', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from Backlog to In Progress', NULL, '127.0.0.1', '2026-10-13 17:43:54', '2026-10-13 17:43:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('123', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Quality Review to Backlog', NULL, '127.0.0.1', '2026-10-13 17:46:10', '2026-10-13 17:46:10');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('124', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from In Progress to In Progress', NULL, '127.0.0.1', '2026-10-13 17:46:11', '2026-10-13 17:46:11');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('125', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '2', 'Moved task \'Implement Automated Disaster Recovery Runbook\' from Backlog to Quality Review', NULL, '127.0.0.1', '2026-10-13 17:46:12', '2026-10-13 17:46:12');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('126', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Completed to Backlog', NULL, '127.0.0.1', '2026-10-13 17:46:13', '2026-10-13 17:46:13');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('127', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '3', 'Moved task \'Audit Q3 Financial Statements & Ledger Sync\' from Backlog to Backlog', NULL, '127.0.0.1', '2026-10-13 18:03:37', '2026-10-13 18:03:37');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('128', '1', 'Executive', 'KANBAN_TASK_MOVED', 'KanbanTask', '1', 'Moved task \'Review API Gateway Rate Limits & Token Expiry\' from In Progress to In Progress', NULL, '127.0.0.1', '2026-10-13 18:03:39', '2026-10-13 18:03:39');
INSERT INTO `audit_logs` (`id`, `user_id`, `department`, `action`, `entity_type`, `entity_id`, `description`, `payload`, `ip_address`, `created_at`, `updated_at`) VALUES ('129', '1', 'Executive', 'DEV_QUICK_LOGIN', 'User', '1', 'Development Quick Login as Alexander Vance (super_admin)', NULL, '127.0.0.1', '2026-10-13 18:14:38', '2026-10-13 18:14:38');

DROP TABLE IF EXISTS `automation_executions`;
CREATE TABLE `automation_executions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `automation_id` bigint(20) unsigned NOT NULL,
  `board_id` bigint(20) unsigned NOT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `triggered_by_user_id` bigint(20) unsigned DEFAULT NULL,
  `trigger_event` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'success',
  `actions_attempted` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions_attempted`)),
  `actions_succeeded` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions_succeeded`)),
  `actions_failed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`actions_failed`)),
  `error_message` text DEFAULT NULL,
  `execution_duration_ms` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_executions_task_id_foreign` (`task_id`),
  KEY `automation_executions_triggered_by_user_id_foreign` (`triggered_by_user_id`),
  KEY `automation_executions_automation_id_status_index` (`automation_id`,`status`),
  KEY `automation_executions_board_id_index` (`board_id`),
  CONSTRAINT `automation_executions_automation_id_foreign` FOREIGN KEY (`automation_id`) REFERENCES `board_automations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_executions_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_executions_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `automation_executions_triggered_by_user_id_foreign` FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `board_automations`;
CREATE TABLE `board_automations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `trigger_type` varchar(255) NOT NULL,
  `trigger_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`trigger_config`)),
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`conditions`)),
  `actions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`actions`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` bigint(20) unsigned NOT NULL,
  `execution_count` int(10) unsigned NOT NULL DEFAULT 0,
  `last_executed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `board_automations_created_by_foreign` (`created_by`),
  KEY `board_automations_board_id_is_active_index` (`board_id`,`is_active`),
  KEY `board_automations_trigger_type_index` (`trigger_type`),
  CONSTRAINT `board_automations_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `board_automations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `board_automations` (`id`, `board_id`, `name`, `description`, `trigger_type`, `trigger_config`, `conditions`, `actions`, `is_active`, `created_by`, `execution_count`, `last_executed_at`, `created_at`, `updated_at`) VALUES ('1', '1', 'Auto-Notify on Completion', 'When a task moves to Done, notify the creator and record an audit log', 'status_changed', '{\"to_status\":\"Done\"}', '{\"match_type\":\"and\",\"rules\":[{\"field\":\"status\",\"operator\":\"equals\",\"value\":\"Done\"}]}', '[{\"type\":\"notify_creator\",\"title\":\"Task Completed\",\"message\":\"Your task has been marked as Done.\"},{\"type\":\"create_audit_event\",\"description\":\"Automated completion workflow executed.\"}]', '1', '3', '0', NULL, '2026-10-12 18:41:27', '2026-10-12 18:41:27');

DROP TABLE IF EXISTS `board_columns`;
CREATE TABLE `board_columns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `key` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'text',
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `position` int(11) NOT NULL DEFAULT 0,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `width` int(11) NOT NULL DEFAULT 160,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `board_columns_board_id_foreign` (`board_id`),
  CONSTRAINT `board_columns_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('1', '1', 'col_person', 'Owner', 'people', NULL, '0', '1', '140', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('2', '1', 'col_status', 'Status', 'status', NULL, '1', '1', '150', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('3', '1', 'col_priority', 'Priority', 'priority', NULL, '2', '1', '130', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('4', '1', 'col_date', 'Due Date', 'date', NULL, '3', '1', '130', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('5', '1', 'col_timeline', 'Timeline', 'timeline', NULL, '4', '1', '170', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('6', '1', 'col_progress', 'Progress', 'progress', NULL, '5', '1', '150', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_columns` (`id`, `board_id`, `key`, `title`, `type`, `config`, `position`, `is_visible`, `width`, `created_at`, `updated_at`) VALUES ('7', '1', 'col_priority_6ace724fb66b6', 'Priority', 'priority', NULL, '6', '1', '150', '2026-10-13 18:02:55', '2026-10-13 18:02:55');

DROP TABLE IF EXISTS `board_groups`;
CREATE TABLE `board_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#579BFC',
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `board_groups_board_id_foreign` (`board_id`),
  CONSTRAINT `board_groups_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `board_groups` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('1', '1', 'Active Deliverables', '#579BFC', '0', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_groups` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('2', '1', 'Future Sprints & Backlog', '#A25DDC', '1', '2026-10-12 17:59:05', '2026-10-12 17:59:05');

DROP TABLE IF EXISTS `board_item_relationships`;
CREATE TABLE `board_item_relationships` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_board_id` bigint(20) unsigned NOT NULL,
  `source_task_id` bigint(20) unsigned NOT NULL,
  `target_board_id` bigint(20) unsigned NOT NULL,
  `target_task_id` bigint(20) unsigned NOT NULL,
  `column_key` varchar(255) DEFAULT NULL,
  `relation_type` varchar(255) NOT NULL DEFAULT 'one_way',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `board_item_rel_unique_pair` (`source_task_id`,`target_task_id`,`column_key`),
  KEY `board_item_relationships_target_board_id_foreign` (`target_board_id`),
  KEY `board_item_relationships_created_by_foreign` (`created_by`),
  KEY `source_task_col_idx` (`source_task_id`,`column_key`),
  KEY `target_task_idx` (`target_task_id`),
  KEY `source_target_board_idx` (`source_board_id`,`target_board_id`),
  CONSTRAINT `board_item_relationships_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `board_item_relationships_source_board_id_foreign` FOREIGN KEY (`source_board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `board_item_relationships_source_task_id_foreign` FOREIGN KEY (`source_task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `board_item_relationships_target_board_id_foreign` FOREIGN KEY (`target_board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `board_item_relationships_target_task_id_foreign` FOREIGN KEY (`target_task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `board_views`;
CREATE TABLE `board_views` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'table',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `board_views_board_id_foreign` (`board_id`),
  CONSTRAINT `board_views_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `board_views` (`id`, `board_id`, `name`, `type`, `is_default`, `settings`, `position`, `created_at`, `updated_at`) VALUES ('1', '1', 'Main Table', 'table', '1', NULL, '0', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_views` (`id`, `board_id`, `name`, `type`, `is_default`, `settings`, `position`, `created_at`, `updated_at`) VALUES ('2', '1', 'Kanban', 'kanban', '0', NULL, '1', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_views` (`id`, `board_id`, `name`, `type`, `is_default`, `settings`, `position`, `created_at`, `updated_at`) VALUES ('3', '1', 'Timeline', 'timeline', '0', NULL, '2', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `board_views` (`id`, `board_id`, `name`, `type`, `is_default`, `settings`, `position`, `created_at`, `updated_at`) VALUES ('4', '1', 'Calendar', 'calendar', '0', NULL, '3', '2026-10-12 17:59:05', '2026-10-12 17:59:05');

DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `client_contacts`;
CREATE TABLE `client_contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'member',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_contacts_client_id_user_id_unique` (`client_id`,`user_id`),
  KEY `client_contacts_user_id_foreign` (`user_id`),
  CONSTRAINT `client_contacts_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `sales_customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_contacts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `client_portal_invitations`;
CREATE TABLE `client_portal_invitations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint(20) unsigned NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `invited_by` bigint(20) unsigned NOT NULL,
  `expires_at` timestamp NOT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_portal_invitations_token_unique` (`token`),
  KEY `client_portal_invitations_client_id_foreign` (`client_id`),
  KEY `client_portal_invitations_invited_by_foreign` (`invited_by`),
  CONSTRAINT `client_portal_invitations_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `sales_customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_portal_invitations_invited_by_foreign` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `client_project_grants`;
CREATE TABLE `client_project_grants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `can_view_tasks` tinyint(1) NOT NULL DEFAULT 1,
  `can_approve` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_project_grants_project_id_user_id_unique` (`project_id`,`user_id`),
  KEY `client_project_grants_user_id_foreign` (`user_id`),
  CONSTRAINT `client_project_grants_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_project_grants_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `compliance_incidents`;
CREATE TABLE `compliance_incidents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `incident_code` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `severity` varchar(255) NOT NULL DEFAULT 'Moderate',
  `reported_by` bigint(20) unsigned NOT NULL,
  `incident_date` date NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Open',
  `summary` text NOT NULL,
  `resolution_action` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `compliance_incidents_incident_code_unique` (`incident_code`),
  KEY `compliance_incidents_reported_by_foreign` (`reported_by`),
  CONSTRAINT `compliance_incidents_reported_by_foreign` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `compliance_incidents` (`id`, `incident_code`, `type`, `severity`, `reported_by`, `incident_date`, `status`, `summary`, `resolution_action`, `created_at`, `updated_at`) VALUES ('1', 'INC-2026-08', 'Data Breach', 'Low', '3', '2026-10-03', 'Remediated', 'Stale test API token detected in public sandbox staging environment. Revoked within 7 minutes.', 'Automatic secret scanning added to GitHub Actions CI/CD pipeline.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `compliance_policies`;
CREATE TABLE `compliance_policies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `policy_code` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `version` varchar(255) NOT NULL DEFAULT '1.0',
  `effective_date` date NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Active',
  `description` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `compliance_policies_policy_code_unique` (`policy_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `compliance_policies` (`id`, `title`, `policy_code`, `category`, `version`, `effective_date`, `status`, `description`, `created_at`, `updated_at`) VALUES ('1', 'ISO/IEC 27001 Information Security Management', 'POL-SEC-01', 'Information Security', '3.2', '2026-04-09', 'Active', 'Mandatory requirements for digital asset security, encryption at rest, and RBAC token rotation.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `compliance_policies` (`id`, `title`, `policy_code`, `category`, `version`, `effective_date`, `status`, `description`, `created_at`, `updated_at`) VALUES ('2', 'Workplace Safety & Heavy Machinery Standard Operating Procedure', 'POL-OPS-04', 'Health & Safety', '2.0', '2026-07-09', 'Active', 'Safety equipment guidelines, lockout/tagout procedures, and emergency stop protocols.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `compliance_risks`;
CREATE TABLE `compliance_risks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `likelihood` int(11) NOT NULL DEFAULT 3,
  `impact` int(11) NOT NULL DEFAULT 3,
  `risk_score` int(11) NOT NULL DEFAULT 9,
  `mitigation_strategy` text NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Mitigating',
  `owner_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `compliance_risks_owner_id_foreign` (`owner_id`),
  CONSTRAINT `compliance_risks_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `compliance_risks` (`id`, `title`, `category`, `likelihood`, `impact`, `risk_score`, `mitigation_strategy`, `status`, `owner_id`, `created_at`, `updated_at`) VALUES ('1', 'Single-Source Microcontroller Supply Chain Volatility', 'Operational', '3', '4', '12', 'Dual-source qualification initiated with alternative European fab.', 'Mitigating', '2', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `cross_department_links`;
CREATE TABLE `cross_department_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_entity_type` varchar(255) NOT NULL,
  `source_entity_id` bigint(20) unsigned NOT NULL,
  `target_entity_type` varchar(255) NOT NULL,
  `target_entity_id` bigint(20) unsigned NOT NULL,
  `relationship_name` varchar(255) NOT NULL DEFAULT 'related_work',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dept_links_unique_pair` (`source_entity_type`,`source_entity_id`,`target_entity_type`,`target_entity_id`,`relationship_name`) USING HASH,
  KEY `cross_department_links_created_by_foreign` (`created_by`),
  KEY `dept_links_source_idx` (`source_entity_type`,`source_entity_id`),
  KEY `dept_links_target_idx` (`target_entity_type`,`target_entity_id`),
  CONSTRAINT `cross_department_links_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `dashboard_members`;
CREATE TABLE `dashboard_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `permission` varchar(255) NOT NULL DEFAULT 'view',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dashboard_members_dashboard_id_user_id_unique` (`dashboard_id`,`user_id`),
  KEY `dashboard_members_user_id_foreign` (`user_id`),
  CONSTRAINT `dashboard_members_dashboard_id_foreign` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dashboard_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `dashboard_widgets`;
CREATE TABLE `dashboard_widgets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `layout` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`layout`)),
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dashboard_widgets_dashboard_id_foreign` (`dashboard_id`),
  CONSTRAINT `dashboard_widgets_dashboard_id_foreign` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `dashboards`;
CREATE TABLE `dashboards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(255) NOT NULL DEFAULT 'LayoutDashboard',
  `type` varchar(255) NOT NULL DEFAULT 'custom',
  `department` varchar(255) DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `owner_id` bigint(20) unsigned NOT NULL,
  `visibility` varchar(255) NOT NULL DEFAULT 'team',
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`filters`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dashboards_project_id_foreign` (`project_id`),
  KEY `dashboards_owner_id_foreign` (`owner_id`),
  CONSTRAINT `dashboards_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dashboards_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `document_categories`;
CREATE TABLE `document_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#3b82f6',
  `icon` varchar(255) NOT NULL DEFAULT 'folder',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_categories_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `document_categories` (`id`, `name`, `slug`, `color`, `icon`, `created_at`, `updated_at`) VALUES ('1', 'Enterprise Architecture & Tech Specs', 'tech-specs', '#3b82f6', 'server', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `document_categories` (`id`, `name`, `slug`, `color`, `icon`, `created_at`, `updated_at`) VALUES ('2', 'HR Guidelines & Employee Handbooks', 'hr-policies', '#10b981', 'users', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `document_categories` (`id`, `name`, `slug`, `color`, `icon`, `created_at`, `updated_at`) VALUES ('3', 'Financial Audits & Annual Reports', 'finance-reports', '#f59e0b', 'dollar-sign', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `document_categories` (`id`, `name`, `slug`, `color`, `icon`, `created_at`, `updated_at`) VALUES ('4', 'Operations & Quality SOPs', 'operations-sop', '#8b5cf6', 'shield', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `document_versions`;
CREATE TABLE `document_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `version_number` varchar(255) NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_size_kb` int(11) NOT NULL DEFAULT 0,
  `uploaded_by` bigint(20) unsigned NOT NULL,
  `change_summary` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `document_versions_document_id_foreign` (`document_id`),
  KEY `document_versions_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `document_versions_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_versions_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `documents`;
CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_size_kb` int(11) NOT NULL DEFAULT 0,
  `mime_type` varchar(255) NOT NULL DEFAULT 'application/pdf',
  `department_access` varchar(255) NOT NULL DEFAULT 'All',
  `version` varchar(255) NOT NULL DEFAULT '1.0',
  `is_trashed` tinyint(1) NOT NULL DEFAULT 0,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documents_category_id_foreign` (`category_id`),
  KEY `documents_user_id_foreign` (`user_id`),
  CONSTRAINT `documents_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `document_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `documents_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `documents` (`id`, `category_id`, `user_id`, `title`, `original_filename`, `file_path`, `file_size_kb`, `mime_type`, `department_access`, `version`, `is_trashed`, `trashed_at`, `created_at`, `updated_at`) VALUES ('1', '1', '1', 'Angora Enterprise System Architecture Specification v2.4', 'Angora_Enterprise_Architecture_Overview.pdf', 'documents/architecture-overview.pdf', '3420', 'application/pdf', 'All', '2.4', '0', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `documents` (`id`, `category_id`, `user_id`, `title`, `original_filename`, `file_path`, `file_size_kb`, `mime_type`, `department_access`, `version`, `is_trashed`, `trashed_at`, `created_at`, `updated_at`) VALUES ('2', '2', '4', '2026 Global Employee Handbook & Remote Policy', 'Employee_Handbook_2026.pdf', 'documents/employee-handbook.pdf', '1840', 'application/pdf', 'All', '1.0', '0', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `documents` (`id`, `category_id`, `user_id`, `title`, `original_filename`, `file_path`, `file_size_kb`, `mime_type`, `department_access`, `version`, `is_trashed`, `trashed_at`, `created_at`, `updated_at`) VALUES ('3', '3', '8', 'Q3 2026 Consolidated Balance Sheet & P&L Statement', 'Financial_Summary_Q3_2026.xlsx', 'documents/finance-q3.xlsx', '950', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Finance', '1.2', '0', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `documents` (`id`, `category_id`, `user_id`, `title`, `original_filename`, `file_path`, `file_size_kb`, `mime_type`, `department_access`, `version`, `is_trashed`, `trashed_at`, `created_at`, `updated_at`) VALUES ('4', '4', '5', 'SMT Line Quality Assurance Inspection Manual (Rev C)', 'QA_Inspection_Manual_RevC.pdf', 'documents/qa-inspection.pdf', '4120', 'application/pdf', 'Production & QC', '3.0', '0', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `documents` (`id`, `category_id`, `user_id`, `title`, `original_filename`, `file_path`, `file_size_kb`, `mime_type`, `department_access`, `version`, `is_trashed`, `trashed_at`, `created_at`, `updated_at`) VALUES ('5', '1', '1', 'Test', 'Test', NULL, '1759', 'application/pdf', 'All', '1.0', '1', '2026-10-09 19:32:02', '2026-10-09 17:07:15', '2026-10-09 19:32:02');

DROP TABLE IF EXISTS `external_resource_links`;
CREATE TABLE `external_resource_links` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `integration_id` bigint(20) unsigned NOT NULL,
  `attachable_type` varchar(255) NOT NULL,
  `attachable_id` bigint(20) unsigned NOT NULL,
  `resource_type` varchar(255) NOT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `external_title` varchar(255) NOT NULL,
  `external_url` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `external_resource_links_integration_id_foreign` (`integration_id`),
  KEY `external_resource_links_attachable_type_attachable_id_index` (`attachable_type`,`attachable_id`),
  CONSTRAINT `external_resource_links_integration_id_foreign` FOREIGN KEY (`integration_id`) REFERENCES `third_party_integrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `finance_budgets`;
CREATE TABLE `finance_budgets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `department` varchar(255) NOT NULL,
  `fiscal_year` varchar(255) NOT NULL,
  `allocated_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `spent_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `finance_budgets` (`id`, `department`, `fiscal_year`, `allocated_amount`, `spent_amount`, `created_at`, `updated_at`) VALUES ('1', 'Engineering', 'FY2026', '500000.00', '312500.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `finance_budgets` (`id`, `department`, `fiscal_year`, `allocated_amount`, `spent_amount`, `created_at`, `updated_at`) VALUES ('2', 'Production & QC', 'FY2026', '850000.00', '621850.00', '2026-10-09 14:39:18', '2026-10-09 19:31:43');
INSERT INTO `finance_budgets` (`id`, `department`, `fiscal_year`, `allocated_amount`, `spent_amount`, `created_at`, `updated_at`) VALUES ('3', 'Marketing', 'FY2026', '220000.00', '145000.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `finance_budgets` (`id`, `department`, `fiscal_year`, `allocated_amount`, `spent_amount`, `created_at`, `updated_at`) VALUES ('4', 'Operations', 'FY2026', '180000.00', '102000.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `finance_expenses`;
CREATE TABLE `finance_expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `department` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `receipt_url` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approver_comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_expenses_user_id_foreign` (`user_id`),
  KEY `finance_expenses_approved_by_foreign` (`approved_by`),
  CONSTRAINT `finance_expenses_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `finance_expenses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `finance_expenses` (`id`, `user_id`, `department`, `category`, `title`, `amount`, `receipt_url`, `status`, `approved_by`, `approver_comment`, `created_at`, `updated_at`) VALUES ('1', '3', 'Engineering', 'Software', 'Annual Cloud Telemetry & Redis Cluster License', '4850.00', NULL, 'Approved', '8', 'Essential cloud capacity upgrade approved.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `finance_expenses` (`id`, `user_id`, `department`, `category`, `title`, `amount`, `receipt_url`, `status`, `approved_by`, `approver_comment`, `created_at`, `updated_at`) VALUES ('2', '5', 'Production & QC', 'Equipment', 'SMT Calibration Microscope & Test Probes', '1850.00', NULL, 'Approved', '1', NULL, '2026-10-09 14:39:18', '2026-10-09 19:31:43');

DROP TABLE IF EXISTS `finance_transactions`;
CREATE TABLE `finance_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `party_name` varchar(255) NOT NULL,
  `invoice_ref` varchar(255) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `due_date` date NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `paid_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `finance_transactions` (`id`, `type`, `party_name`, `invoice_ref`, `amount`, `due_date`, `status`, `paid_date`, `created_at`, `updated_at`) VALUES ('1', 'Payable', 'Silicon Components Global GmbH', 'BILL-88219', '42500.00', '2026-10-21', 'Pending', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `finance_transactions` (`id`, `type`, `party_name`, `invoice_ref`, `amount`, `due_date`, `status`, `paid_date`, `created_at`, `updated_at`) VALUES ('2', 'Receivable', 'Apex Dynamics Ltd', 'INV-2026-1042', '95040.00', '2026-10-29', 'Settled', '2026-10-07', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `form_fields`;
CREATE TABLE `form_fields` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `form_id` bigint(20) unsigned NOT NULL,
  `field_key` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `help_text` text DEFAULT NULL,
  `placeholder` text DEFAULT NULL,
  `default_value` text DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `conditional_logic` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`conditional_logic`)),
  `maps_to_column` varchar(255) DEFAULT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_fields_form_id_foreign` (`form_id`),
  CONSTRAINT `form_fields_form_id_foreign` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `form_submission_values`;
CREATE TABLE `form_submission_values` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` bigint(20) unsigned NOT NULL,
  `field_key` varchar(255) NOT NULL,
  `field_label` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `form_submission_values_submission_id_foreign` (`submission_id`),
  CONSTRAINT `form_submission_values_submission_id_foreign` FOREIGN KEY (`submission_id`) REFERENCES `form_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `form_submissions`;
CREATE TABLE `form_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `form_id` bigint(20) unsigned NOT NULL,
  `submission_token` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `client_id` bigint(20) unsigned DEFAULT NULL,
  `created_task_id` bigint(20) unsigned DEFAULT NULL,
  `submitter_name` varchar(255) DEFAULT NULL,
  `submitter_email` varchar(255) DEFAULT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'processed',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `form_submissions_submission_token_unique` (`submission_token`),
  KEY `form_submissions_form_id_foreign` (`form_id`),
  KEY `form_submissions_user_id_foreign` (`user_id`),
  KEY `form_submissions_client_id_foreign` (`client_id`),
  KEY `form_submissions_created_task_id_foreign` (`created_task_id`),
  CONSTRAINT `form_submissions_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `sales_customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `form_submissions_created_task_id_foreign` FOREIGN KEY (`created_task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `form_submissions_form_id_foreign` FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `form_submissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `forms`;
CREATE TABLE `forms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'general',
  `board_id` bigint(20) unsigned DEFAULT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `owner_id` bigint(20) unsigned NOT NULL,
  `visibility` varchar(255) NOT NULL DEFAULT 'internal',
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `success_message` varchar(255) DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `forms_uuid_unique` (`uuid`),
  KEY `forms_board_id_foreign` (`board_id`),
  KEY `forms_project_id_foreign` (`project_id`),
  KEY `forms_owner_id_foreign` (`owner_id`),
  CONSTRAINT `forms_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `forms_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forms_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `hr_attendances`;
CREATE TABLE `hr_attendances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `date` date NOT NULL,
  `clock_in` time DEFAULT NULL,
  `clock_out` time DEFAULT NULL,
  `working_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `status` varchar(255) NOT NULL DEFAULT 'Present',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hr_attendances_employee_id_foreign` (`employee_id`),
  CONSTRAINT `hr_attendances_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hr_attendances` (`id`, `employee_id`, `date`, `clock_in`, `clock_out`, `working_hours`, `status`, `created_at`, `updated_at`) VALUES ('1', '1', '2026-10-09', '08:58:00', '17:30:00', '8.50', 'Present', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `hr_attendances` (`id`, `employee_id`, `date`, `clock_in`, `clock_out`, `working_hours`, `status`, `created_at`, `updated_at`) VALUES ('2', '2', '2026-10-09', '09:05:00', '18:00:00', '8.90', 'Present', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `hr_employees`;
CREATE TABLE `hr_employees` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `emp_code` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `department` varchar(255) NOT NULL,
  `designation` varchar(255) NOT NULL,
  `employment_type` varchar(255) NOT NULL DEFAULT 'Full-Time',
  `join_date` date NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(255) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hr_employees_emp_code_unique` (`emp_code`),
  UNIQUE KEY `hr_employees_email_unique` (`email`),
  KEY `hr_employees_user_id_foreign` (`user_id`),
  CONSTRAINT `hr_employees_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hr_employees` (`id`, `user_id`, `emp_code`, `first_name`, `last_name`, `email`, `phone`, `department`, `designation`, `employment_type`, `join_date`, `basic_salary`, `status`, `created_at`, `updated_at`) VALUES ('1', '4', 'EMP-1001', 'Sarah', 'Jenkins', 'sarah.j@angora.internal', '+1 (555) 010-0004', 'Human Resources', 'Lead People Operations', 'Full-Time', '2025-04-09', '85000.00', 'Active', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `hr_employees` (`id`, `user_id`, `emp_code`, `first_name`, `last_name`, `email`, `phone`, `department`, `designation`, `employment_type`, `join_date`, `basic_salary`, `status`, `created_at`, `updated_at`) VALUES ('2', '3', 'EMP-1002', 'David', 'Chen', 'david.c@angora.internal', '+1 (555) 010-0003', 'Engineering', 'Senior Systems Architect', 'Full-Time', '2025-08-09', '115000.00', 'Active', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `hr_employees` (`id`, `user_id`, `emp_code`, `first_name`, `last_name`, `email`, `phone`, `department`, `designation`, `employment_type`, `join_date`, `basic_salary`, `status`, `created_at`, `updated_at`) VALUES ('3', '5', 'EMP-1003', 'Marcus', 'Brody', 'marcus.b@angora.internal', '+1 (555) 010-0005', 'Production & QC', 'Plant Floor Supervisor', 'Full-Time', '2026-02-09', '78000.00', 'Active', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `hr_leave_requests`;
CREATE TABLE `hr_leave_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `leave_type` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` int(11) NOT NULL DEFAULT 1,
  `reason` text NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approver_comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hr_leave_requests_employee_id_foreign` (`employee_id`),
  KEY `hr_leave_requests_approved_by_foreign` (`approved_by`),
  CONSTRAINT `hr_leave_requests_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hr_leave_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hr_leave_requests` (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `total_days`, `reason`, `status`, `approved_by`, `approver_comment`, `created_at`, `updated_at`) VALUES ('1', '2', 'Annual', '2026-10-23', '2026-10-27', '5', 'Family vacation leave', 'Approved', '4', 'Coverage arranged. Approved.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `hr_performance_reviews`;
CREATE TABLE `hr_performance_reviews` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint(20) unsigned NOT NULL,
  `reviewer_id` bigint(20) unsigned NOT NULL,
  `review_period` varchar(255) NOT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `feedback` text DEFAULT NULL,
  `goals` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Draft',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hr_performance_reviews_employee_id_foreign` (`employee_id`),
  KEY `hr_performance_reviews_reviewer_id_foreign` (`reviewer_id`),
  CONSTRAINT `hr_performance_reviews_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hr_performance_reviews_reviewer_id_foreign` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hr_performance_reviews` (`id`, `employee_id`, `reviewer_id`, `review_period`, `rating`, `feedback`, `goals`, `status`, `created_at`, `updated_at`) VALUES ('1', '2', '1', 'Q3 2026', '9', 'Exceptional technical execution on the platform integration and microservices layout.', 'Lead database sharding and caching optimizations in Q4.', 'Finalized', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `incoming_webhook_logs`;
CREATE TABLE `incoming_webhook_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source` varchar(255) NOT NULL,
  `event` varchar(255) DEFAULT NULL,
  `idempotency_key` varchar(255) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status` varchar(255) NOT NULL DEFAULT 'processed',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `incoming_webhook_logs_idempotency_key_index` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `kanban_attachments`;
CREATE TABLE `kanban_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size_bytes` bigint(20) unsigned NOT NULL DEFAULT 0,
  `mime_type` varchar(255) NOT NULL DEFAULT 'application/octet-stream',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kanban_attachments_task_id_foreign` (`task_id`),
  KEY `kanban_attachments_user_id_foreign` (`user_id`),
  CONSTRAINT `kanban_attachments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_attachments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kanban_attachments` (`id`, `task_id`, `user_id`, `file_name`, `file_path`, `file_size_bytes`, `mime_type`, `created_at`, `updated_at`) VALUES ('1', '4', '3', 'a98b7308-2ed1-4ba7-af42-aa277f8cc439.png', 'attachments/kanban/PVB9HlRHMW8LCqMYeKaL4NklFIa1JT3d6E6U8LyL.png', '1273127', 'image/png', '2026-10-12 19:48:54', '2026-10-12 19:48:54');

DROP TABLE IF EXISTS `kanban_boards`;
CREATE TABLE `kanban_boards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `department` varchar(255) NOT NULL DEFAULT 'General',
  `folder_name` varchar(255) DEFAULT NULL,
  `visibility` varchar(255) NOT NULL DEFAULT 'public',
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `is_template` tinyint(1) NOT NULL DEFAULT 0,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kanban_boards_created_by_foreign` (`created_by`),
  KEY `kanban_boards_workspace_id_foreign` (`workspace_id`),
  CONSTRAINT `kanban_boards_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_boards_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kanban_boards` (`id`, `workspace_id`, `title`, `description`, `department`, `folder_name`, `visibility`, `is_favorite`, `is_template`, `settings`, `created_by`, `created_at`, `updated_at`) VALUES ('1', '1', 'Enterprise Engineering & Operations Sprint', 'Main operational backlog, active department sprints, and milestone deliveries.', 'Operations', NULL, 'public', '0', '0', NULL, '1', '2026-10-09 14:39:18', '2026-10-12 17:59:05');

DROP TABLE IF EXISTS `kanban_columns`;
CREATE TABLE `kanban_columns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#64748b',
  `position` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kanban_columns_board_id_foreign` (`board_id`),
  CONSTRAINT `kanban_columns_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kanban_columns` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('1', '1', 'Backlog', '#64748b', '0', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `kanban_columns` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('2', '1', 'In Progress', '#3b82f6', '1', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `kanban_columns` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('3', '1', 'Quality Review', '#f59e0b', '2', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `kanban_columns` (`id`, `board_id`, `title`, `color`, `position`, `created_at`, `updated_at`) VALUES ('4', '1', 'Completed', '#10b981', '3', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `kanban_comments`;
CREATE TABLE `kanban_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `message` text NOT NULL,
  `reactions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`reactions`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kanban_comments_task_id_foreign` (`task_id`),
  KEY `kanban_comments_user_id_foreign` (`user_id`),
  KEY `kanban_comments_parent_id_foreign` (`parent_id`),
  CONSTRAINT `kanban_comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `kanban_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_comments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kanban_comments` (`id`, `task_id`, `parent_id`, `user_id`, `message`, `reactions`, `created_at`, `updated_at`) VALUES ('2', '1', NULL, '2', 'https://www.canva.com/', '{\"\\u2764\\ufe0f\":[3],\"\\ud83c\\udf89\":[9],\"\\ud83d\\ude80\":[9],\"\\ud83d\\udc4d\":[9]}', '2026-10-12 18:33:58', '2026-10-12 20:01:40');
INSERT INTO `kanban_comments` (`id`, `task_id`, `parent_id`, `user_id`, `message`, `reactions`, `created_at`, `updated_at`) VALUES ('3', '1', '2', '2', 'Working on it', NULL, '2026-10-12 18:34:16', '2026-10-12 18:34:16');
INSERT INTO `kanban_comments` (`id`, `task_id`, `parent_id`, `user_id`, `message`, `reactions`, `created_at`, `updated_at`) VALUES ('4', '1', '2', '2', 'Status?', NULL, '2026-10-12 20:01:36', '2026-10-12 20:01:36');

DROP TABLE IF EXISTS `kanban_tasks`;
CREATE TABLE `kanban_tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `board_id` bigint(20) unsigned NOT NULL,
  `column_id` bigint(20) unsigned NOT NULL,
  `group_id` bigint(20) unsigned DEFAULT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` varchar(255) NOT NULL DEFAULT 'Medium',
  `due_date` date DEFAULT NULL,
  `due_time` varchar(10) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `estimated_hours` decimal(8,2) DEFAULT NULL,
  `actual_hours` decimal(8,2) DEFAULT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `labels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labels`)),
  `custom_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_values`)),
  `is_personal` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kanban_tasks_board_id_foreign` (`board_id`),
  KEY `kanban_tasks_column_id_foreign` (`column_id`),
  KEY `kanban_tasks_assigned_to_foreign` (`assigned_to`),
  KEY `kanban_tasks_created_by_foreign` (`created_by`),
  KEY `kanban_tasks_group_id_foreign` (`group_id`),
  KEY `kanban_tasks_parent_id_foreign` (`parent_id`),
  CONSTRAINT `kanban_tasks_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `kanban_tasks_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_column_id_foreign` FOREIGN KEY (`column_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `board_groups` (`id`) ON DELETE SET NULL,
  CONSTRAINT `kanban_tasks_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('1', '1', '2', '1', NULL, 'Review API Gateway Rate Limits & Token Expiry', 'Fine-tune throttling limits to 120 req/min per tenant token.', 'High', '2026-10-14', NULL, '2026-10-08', '16.00', '6.00', '30', '1', '2', '0', '[\"Security\",\"API\"]', NULL, '0', NULL, '2026-10-09 14:39:18', '2026-10-13 18:36:47');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('2', '1', '3', '2', NULL, 'Implement Automated Disaster Recovery Runbook', 'Set up automated snapshot verification for MariaDB & Redis failover.', 'Urgent', '2026-10-11', NULL, '2026-10-09', '16.00', '6.00', '65', '2', '1', '0', '[\"DevOps\",\"Data\"]', NULL, '0', NULL, '2026-10-09 14:39:18', '2026-10-13 17:46:12');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('3', '1', '1', '1', NULL, 'Audit Q3 Financial Statements & Ledger Sync', 'Verify reconciliation reports between internal AP/AR and banking records.', 'Medium', '2026-10-10', NULL, '2026-10-09', '16.00', '16.00', '100', '2', '2', '0', '[\"Finance\",\"Audit\"]', NULL, '0', NULL, '2026-10-09 14:39:18', '2026-10-13 17:46:13');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('4', '1', '3', '2', NULL, 'Deploy Multi-Tenant RBAC Security Module', 'Full RBAC role matrix completed with 10 role permissions.', 'High', '2026-10-08', NULL, '2026-10-11', '16.00', '6.00', '30', '1', '1', '0', '[\"Security\",\"Core\"]', NULL, '0', NULL, '2026-10-09 14:39:18', '2026-10-12 20:01:45');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('5', '1', '1', '1', NULL, 'Test', 'test', 'Medium', '2026-10-14', NULL, '2026-10-11', '16.00', '6.00', '0', '2', '1', '1', NULL, NULL, '0', NULL, '2026-10-09 21:16:23', '2026-10-13 18:36:49');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('6', '1', '1', '1', '5', 'Design', NULL, 'Medium', NULL, NULL, NULL, NULL, NULL, '0', '2', '2', '0', NULL, NULL, '0', NULL, '2026-10-12 18:16:36', '2026-10-12 20:20:12');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('7', '1', '1', '1', '5', 'Backend', NULL, 'Medium', NULL, NULL, NULL, NULL, NULL, '0', NULL, '2', '1', NULL, NULL, '0', NULL, '2026-10-12 18:16:40', '2026-10-12 18:16:40');
INSERT INTO `kanban_tasks` (`id`, `board_id`, `column_id`, `group_id`, `parent_id`, `title`, `description`, `priority`, `due_date`, `due_time`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `assigned_to`, `created_by`, `position`, `labels`, `custom_values`, `is_personal`, `completed_at`, `created_at`, `updated_at`) VALUES ('8', '1', '1', '1', '6', 'Design', NULL, 'Medium', NULL, NULL, NULL, NULL, NULL, '0', NULL, '2', '0', NULL, NULL, '0', NULL, '2026-10-12 18:16:54', '2026-10-12 18:16:58');

DROP TABLE IF EXISTS `marketing_campaigns`;
CREATE TABLE `marketing_campaigns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `channel` varchar(255) NOT NULL,
  `budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `spend` decimal(12,2) NOT NULL DEFAULT 0.00,
  `impressions` int(11) NOT NULL DEFAULT 0,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `leads_generated` int(11) NOT NULL DEFAULT 0,
  `conversions` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'Planning',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `target_audience` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `marketing_campaigns` (`id`, `name`, `channel`, `budget`, `spend`, `impressions`, `clicks`, `leads_generated`, `conversions`, `status`, `start_date`, `end_date`, `target_audience`, `created_at`, `updated_at`) VALUES ('1', 'NextGen Industrial Automation Summit 2026', 'Events', '45000.00', '38200.00', '125000', '8400', '420', '64', 'Active', '2026-09-24', '2026-10-24', 'VP of Engineering, Plant Directors, Automation Architects', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `marketing_campaigns` (`id`, `name`, `channel`, `budget`, `spend`, `impressions`, `clicks`, `leads_generated`, `conversions`, `status`, `start_date`, `end_date`, `target_audience`, `created_at`, `updated_at`) VALUES ('2', 'Q4 Enterprise Search & B2B LinkedIn Campaign', 'Social Media', '20000.00', '12400.00', '340000', '14200', '290', '38', 'Active', '2026-09-19', '2026-11-08', 'OEM Manufacturers and Robotics System Integrators', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `marketing_contents`;
CREATE TABLE `marketing_contents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `format` varchar(255) NOT NULL,
  `platform` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Idea',
  `scheduled_date` date DEFAULT NULL,
  `author_id` bigint(20) unsigned NOT NULL,
  `copy_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `marketing_contents_campaign_id_foreign` (`campaign_id`),
  KEY `marketing_contents_author_id_foreign` (`author_id`),
  CONSTRAINT `marketing_contents_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marketing_contents_campaign_id_foreign` FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `marketing_contents` (`id`, `campaign_id`, `title`, `format`, `platform`, `status`, `scheduled_date`, `author_id`, `copy_notes`, `created_at`, `updated_at`) VALUES ('1', '1', 'Scaling IoT Hardware with Zero Downtime: An Architecture Blueprint', 'Whitepaper', 'LinkedIn', 'Published', '2026-10-06', '7', 'Promoted post with gated technical PDF download.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('1', '0001_01_01_000000_create_users_table', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('2', '0001_01_01_000001_create_cache_table', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('3', '0001_01_01_000002_create_jobs_table', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('4', '2026_10_09_000001_update_users_table_add_roles', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('5', '2026_10_09_000002_create_system_core_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('6', '2026_10_09_000003_create_kanban_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('7', '2026_10_09_000004_create_hr_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('8', '2026_10_09_000005_create_production_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('9', '2026_10_09_000006_create_sales_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('10', '2026_10_09_000007_create_marketing_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('11', '2026_10_09_000008_create_finance_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('12', '2026_10_09_000009_create_operations_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('13', '2026_10_09_000010_create_compliance_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('14', '2026_10_09_000011_create_document_tables', '1');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('15', '2026_10_09_000012_create_rbac_tables', '2');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('16', '2026_10_13_000001_create_work_os_expansion_tables', '3');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('17', '2026_10_13_000002_create_work_os_phase2_tables', '4');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('18', '2026_10_13_000003_create_work_os_phase3_tables', '5');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('19', '2026_10_13_000004_create_work_os_phase4_tables', '6');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('20', '2026_10_13_000005_create_work_os_phase5_tables', '7');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('21', '2026_10_13_000006_create_work_os_phase6_tables', '8');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('22', '2026_10_13_000007_create_work_os_phase7_tables', '9');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('23', '2026_10_13_000008_create_work_os_phase8_tables', '10');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('24', '2026_10_13_000009_create_work_os_phase9_tables', '11');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('25', '2026_10_13_000010_create_work_os_phase10_security_tables', '12');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('26', '2026_10_13_000011_add_code_to_agency_projects_table', '13');
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES ('27', '2026_10_13_000012_add_company_name_to_sales_customers_table', '14');

DROP TABLE IF EXISTS `operations_tickets`;
CREATE TABLE `operations_tickets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(255) NOT NULL,
  `service_type` varchar(255) NOT NULL,
  `requested_by` bigint(20) unsigned NOT NULL,
  `department` varchar(255) NOT NULL,
  `priority` varchar(255) NOT NULL DEFAULT 'Medium',
  `status` varchar(255) NOT NULL DEFAULT 'Open',
  `sla_due_at` timestamp NULL DEFAULT NULL,
  `details` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operations_tickets_ticket_number_unique` (`ticket_number`),
  KEY `operations_tickets_requested_by_foreign` (`requested_by`),
  CONSTRAINT `operations_tickets_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `operations_tickets` (`id`, `ticket_number`, `service_type`, `requested_by`, `department`, `priority`, `status`, `sla_due_at`, `details`, `created_at`, `updated_at`) VALUES ('1', 'OPS-TCK-901', 'Facility Request', '5', 'Operations', 'High', 'In Progress', '2026-10-09 22:39:18', 'HVAC unit in cleanroom inspection room requires humidity regulation adjustment.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `operations_workflows`;
CREATE TABLE `operations_workflows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `priority` varchar(255) NOT NULL DEFAULT 'Medium',
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `requested_by` bigint(20) unsigned NOT NULL,
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `description` text NOT NULL,
  `resolution_details` text DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `operations_workflows_requested_by_foreign` (`requested_by`),
  KEY `operations_workflows_assigned_to_foreign` (`assigned_to`),
  CONSTRAINT `operations_workflows_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `operations_workflows_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `operations_workflows` (`id`, `title`, `department`, `priority`, `status`, `requested_by`, `assigned_to`, `description`, `resolution_details`, `due_date`, `created_at`, `updated_at`) VALUES ('1', 'Factory Line 2 Firmware Synchronization Protocol', 'Operations', 'High', 'In Progress', '2', '3', 'Cross-department rollout of security patched firmware across 8 automated lines.', NULL, '2026-10-13', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('1', 'kanban.view', 'View Kanban Boards', 'Kanban', 'Can view sprint boards and task lanes', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('2', 'kanban.create', 'Create Kanban Tasks', 'Kanban', 'Can create and assign tasks', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('3', 'kanban.manage', 'Manage Kanban Boards', 'Kanban', 'Can configure columns and delete tasks', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('4', 'hr.view', 'View HR Directory', 'HR', 'Can view employee directory and roster', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('5', 'hr.manage', 'Manage Employees', 'HR', 'Can add/edit employees and compensation', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('6', 'hr.approve_leaves', 'Approve Leave Applications', 'HR', 'Can approve or reject time-off requests', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('7', 'production.view', 'View Production Orders', 'Production', 'Can view work orders and assembly lines', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('8', 'production.manage', 'Manage Work Orders', 'Production', 'Can create work orders and update status', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('9', 'production.qc', 'Quality Control Inspections', 'Production', 'Can record QA tests and log defects', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('10', 'sales.view', 'View Sales Pipeline', 'Sales', 'Can view deals and customer directory', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('11', 'sales.manage', 'Manage Deals & Accounts', 'Sales', 'Can create customers and advance deals', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('12', 'sales.invoices', 'Issue Quotations & Invoices', 'Sales', 'Can create and send client billing', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('13', 'marketing.view', 'View Campaigns', 'Marketing', 'Can view campaigns and content calendar', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('14', 'marketing.manage', 'Manage Campaigns', 'Marketing', 'Can create campaigns and schedule content', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('15', 'finance.view', 'View Budgets & Ledgers', 'Finance', 'Can view department budgets and AP/AR', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('16', 'finance.manage', 'Manage Ledgers', 'Finance', 'Can record transactions and update caps', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('17', 'finance.approve_expenses', 'Approve Expense Claims', 'Finance', 'Can approve or reject employee claims', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('18', 'operations.view', 'View Operations', 'Operations', 'Can view workflows and service tickets', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('19', 'operations.manage', 'Manage Workflows', 'Operations', 'Can initiate workflows and resolve tickets', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('20', 'compliance.view', 'View Policies & Risks', 'Compliance', 'Can view ISO policies and risk matrix', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('21', 'compliance.manage', 'Manage Compliance', 'Compliance', 'Can register risk assessments and log incidents', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('22', 'documents.view', 'View Document Vault', 'Documents', 'Can browse and download documents', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('23', 'documents.upload', 'Upload Documents', 'Documents', 'Can upload new documents and revisions', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('24', 'documents.manage', 'Manage Document Vault', 'Documents', 'Can move documents to trash and restore', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('25', 'analytics.view', 'View Analytics Telemetry', 'Analytics', 'Can view executive BI telemetry & export', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('26', 'audit_logs.view', 'View Audit Trail', 'Governance', 'Can inspect immutable system event logs', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `permissions` (`id`, `name`, `label`, `department`, `description`, `created_at`, `updated_at`) VALUES ('27', 'rbac.manage', 'Manage RBAC Permissions', 'System', 'Can manage roles and assign permissions', '2026-10-09 15:03:49', '2026-10-09 15:03:49');

DROP TABLE IF EXISTS `production_incidents`;
CREATE TABLE `production_incidents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `machine_line` varchar(255) DEFAULT NULL,
  `severity` varchar(255) NOT NULL DEFAULT 'Medium',
  `reported_by` bigint(20) unsigned NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Open',
  `description` text NOT NULL,
  `corrective_action` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `production_incidents_work_order_id_foreign` (`work_order_id`),
  KEY `production_incidents_reported_by_foreign` (`reported_by`),
  CONSTRAINT `production_incidents_reported_by_foreign` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_incidents_work_order_id_foreign` FOREIGN KEY (`work_order_id`) REFERENCES `production_work_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `production_incidents` (`id`, `work_order_id`, `title`, `machine_line`, `severity`, `reported_by`, `status`, `description`, `corrective_action`, `created_at`, `updated_at`) VALUES ('1', '2', 'Thermal calibration drift on SMT Oven #2', 'SMT Line 3', 'Medium', '5', 'Investigating', 'Temperature probe variance of 3.2°C detected during reflow stage.', 'Sensor recalibration in progress by maintenance technician.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `production_quality_checks`;
CREATE TABLE `production_quality_checks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint(20) unsigned NOT NULL,
  `inspector_id` bigint(20) unsigned NOT NULL,
  `sample_size` int(11) NOT NULL,
  `defect_count` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'Passed',
  `checklist_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`checklist_data`)),
  `notes` text DEFAULT NULL,
  `inspected_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `production_quality_checks_work_order_id_foreign` (`work_order_id`),
  KEY `production_quality_checks_inspector_id_foreign` (`inspector_id`),
  CONSTRAINT `production_quality_checks_inspector_id_foreign` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_quality_checks_work_order_id_foreign` FOREIGN KEY (`work_order_id`) REFERENCES `production_work_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `production_quality_checks` (`id`, `work_order_id`, `inspector_id`, `sample_size`, `defect_count`, `status`, `checklist_data`, `notes`, `inspected_at`, `created_at`, `updated_at`) VALUES ('1', '1', '5', '150', '1', 'Passed', '{\"voltage_test\":\"Pass\",\"thermal_tolerance\":\"Pass\",\"casing_integrity\":\"Pass\"}', 'Defect rate 0.6%, well below 2.0% threshold. Passed.', '2026-10-07 14:39:18', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `production_work_orders`;
CREATE TABLE `production_work_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_no` varchar(255) NOT NULL,
  `product_title` varchar(255) NOT NULL,
  `batch_number` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `completed_quantity` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'Pending',
  `priority` varchar(255) NOT NULL DEFAULT 'Normal',
  `start_date` date NOT NULL,
  `target_date` date NOT NULL,
  `assigned_unit` varchar(255) NOT NULL,
  `supervisor_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_work_orders_order_no_unique` (`order_no`),
  KEY `production_work_orders_supervisor_id_foreign` (`supervisor_id`),
  CONSTRAINT `production_work_orders_supervisor_id_foreign` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `production_work_orders` (`id`, `order_no`, `product_title`, `batch_number`, `quantity`, `completed_quantity`, `status`, `priority`, `start_date`, `target_date`, `assigned_unit`, `supervisor_id`, `notes`, `created_at`, `updated_at`) VALUES ('1', 'WO-2026-001', 'Industrial Optical Sensor Modules (Series X)', 'BATCH-8891-A', '2500', '2500', 'Completed', 'Normal', '2026-09-29', '2026-10-07', 'Assembly Line 1', '5', 'Batch completed on schedule with zero deviations.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `production_work_orders` (`id`, `order_no`, `product_title`, `batch_number`, `quantity`, `completed_quantity`, `status`, `priority`, `start_date`, `target_date`, `assigned_unit`, `supervisor_id`, `notes`, `created_at`, `updated_at`) VALUES ('2', 'WO-2026-002', 'High-Precision Stepper Controllers', 'BATCH-8892-B', '1200', '850', 'In Production', 'High', '2026-10-05', '2026-10-12', 'SMT Surface Mount Line 3', '5', 'Component soldering stage underway.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `production_work_orders` (`id`, `order_no`, `product_title`, `batch_number`, `quantity`, `completed_quantity`, `status`, `priority`, `start_date`, `target_date`, `assigned_unit`, `supervisor_id`, `notes`, `created_at`, `updated_at`) VALUES ('3', 'WO-2026-003', 'Embedded Telemetry Gateway Units', 'BATCH-8893-C', '500', '500', 'QA Review', 'Urgent', '2026-10-06', '2026-10-10', 'Cleanroom Inspection', '5', 'Awaiting firmware cryptographic signing verification.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `production_work_orders` (`id`, `order_no`, `product_title`, `batch_number`, `quantity`, `completed_quantity`, `status`, `priority`, `start_date`, `target_date`, `assigned_unit`, `supervisor_id`, `notes`, `created_at`, `updated_at`) VALUES ('4', 'WO-2026-983', 'ABC', 'BATCH-3034', '1000', '0', 'In Production', 'Normal', '2026-10-09', '2026-10-16', 'Assembly Line 1', '5', NULL, '2026-10-09 21:16:05', '2026-10-09 21:16:12');

DROP TABLE IF EXISTS `project_deliverables`;
CREATE TABLE `project_deliverables` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `external_url` varchar(255) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `status` varchar(255) NOT NULL DEFAULT 'submitted',
  `submitted_by` bigint(20) unsigned NOT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `is_client_visible` tinyint(1) NOT NULL DEFAULT 0,
  `approved_for_client_at` timestamp NULL DEFAULT NULL,
  `client_status` varchar(255) NOT NULL DEFAULT 'pending',
  `client_feedback` text DEFAULT NULL,
  `client_reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_deliverables_project_id_foreign` (`project_id`),
  KEY `project_deliverables_task_id_foreign` (`task_id`),
  KEY `project_deliverables_submitted_by_foreign` (`submitted_by`),
  KEY `project_deliverables_reviewed_by_foreign` (`reviewed_by`),
  CONSTRAINT `project_deliverables_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_deliverables_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `project_deliverables_submitted_by_foreign` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_deliverables_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `project_members`;
CREATE TABLE `project_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `agency_role` varchar(255) NOT NULL DEFAULT 'developer',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_members_project_id_user_id_agency_role_unique` (`project_id`,`user_id`,`agency_role`),
  KEY `project_members_user_id_foreign` (`user_id`),
  CONSTRAINT `project_members_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `role` varchar(255) NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_permission_id_unique` (`role`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=292 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('28', 'dept_user', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('29', 'dept_user', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('30', 'dept_user', '18', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('31', 'dept_user', '19', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('32', 'dept_user', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('33', 'dept_user', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('34', 'hr_staff', '4', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('35', 'hr_staff', '5', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('36', 'hr_staff', '6', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('37', 'hr_staff', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('38', 'hr_staff', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('39', 'hr_staff', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('40', 'hr_staff', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('41', 'production_staff', '7', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('42', 'production_staff', '8', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('43', 'production_staff', '9', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('44', 'production_staff', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('45', 'production_staff', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('46', 'production_staff', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('47', 'production_staff', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('48', 'sales_staff', '10', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('49', 'sales_staff', '11', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('50', 'sales_staff', '12', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('51', 'sales_staff', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('52', 'sales_staff', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('53', 'sales_staff', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('54', 'sales_staff', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('55', 'marketing_staff', '13', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('56', 'marketing_staff', '14', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('57', 'marketing_staff', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('58', 'marketing_staff', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('59', 'marketing_staff', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('60', 'marketing_staff', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('61', 'finance_staff', '15', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('62', 'finance_staff', '16', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('63', 'finance_staff', '17', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('64', 'finance_staff', '10', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('65', 'finance_staff', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('66', 'finance_staff', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('67', 'finance_staff', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('68', 'finance_staff', '23', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('69', 'finance_staff', '25', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('70', 'team_member', '1', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('71', 'team_member', '2', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('72', 'team_member', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('73', 'team_member', '18', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('74', 'external_user', '10', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('75', 'external_user', '22', '2026-10-09 15:03:49', '2026-10-09 15:03:49');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('238', 'admin_manager', '1', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('239', 'admin_manager', '2', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('240', 'admin_manager', '3', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('241', 'admin_manager', '4', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('242', 'admin_manager', '5', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('243', 'admin_manager', '6', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('244', 'admin_manager', '7', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('245', 'admin_manager', '8', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('246', 'admin_manager', '9', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('247', 'admin_manager', '10', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('248', 'admin_manager', '11', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('249', 'admin_manager', '12', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('250', 'admin_manager', '13', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('251', 'admin_manager', '14', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('252', 'admin_manager', '15', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('253', 'admin_manager', '16', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('254', 'admin_manager', '17', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('255', 'admin_manager', '18', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('256', 'admin_manager', '19', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('257', 'admin_manager', '20', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('258', 'admin_manager', '21', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('259', 'admin_manager', '22', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('260', 'admin_manager', '23', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('261', 'admin_manager', '24', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('262', 'admin_manager', '25', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('263', 'admin_manager', '26', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('264', 'admin_manager', '27', '2026-10-09 16:52:05', '2026-10-09 16:52:05');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('265', 'admin', '1', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('266', 'admin', '2', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('267', 'admin', '3', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('268', 'admin', '4', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('269', 'admin', '5', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('270', 'admin', '6', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('271', 'admin', '7', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('272', 'admin', '8', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('273', 'admin', '9', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('274', 'admin', '10', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('275', 'admin', '11', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('276', 'admin', '12', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('277', 'admin', '13', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('278', 'admin', '14', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('279', 'admin', '15', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('280', 'admin', '16', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('281', 'admin', '17', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('282', 'admin', '18', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('283', 'admin', '19', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('284', 'admin', '20', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('285', 'admin', '21', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('286', 'admin', '22', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('287', 'admin', '23', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('288', 'admin', '24', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('289', 'admin', '25', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('290', 'admin', '26', '2026-10-13 18:16:29', '2026-10-13 18:16:29');
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`, `created_at`, `updated_at`) VALUES ('291', 'admin', '27', '2026-10-13 18:16:29', '2026-10-13 18:16:29');

DROP TABLE IF EXISTS `sales_customers`;
CREATE TABLE `sales_customers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Lead',
  `total_spend` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `account_manager_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `portal_access_enabled` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sales_customers_account_manager_id_foreign` (`account_manager_id`),
  KEY `sales_customers_user_id_foreign` (`user_id`),
  CONSTRAINT `sales_customers_account_manager_id_foreign` FOREIGN KEY (`account_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_customers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_customers` (`id`, `name`, `company`, `company_name`, `email`, `phone`, `city`, `status`, `total_spend`, `created_at`, `updated_at`, `account_manager_id`, `user_id`, `portal_access_enabled`) VALUES ('1', 'Apex Dynamics Ltd', 'Apex Global Industries', 'Apex Global Industries', 'purchasing@apexdynamics.com', '+1 (555) 492-1100', 'Chicago, IL', 'Customer', '184500.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18', NULL, NULL, '1');
INSERT INTO `sales_customers` (`id`, `name`, `company`, `company_name`, `email`, `phone`, `city`, `status`, `total_spend`, `created_at`, `updated_at`, `account_manager_id`, `user_id`, `portal_access_enabled`) VALUES ('2', 'Vanguard Robotics Inc', 'Vanguard Technologies', 'Vanguard Technologies', 'procurement@vanguardrobotics.io', '+1 (555) 388-2991', 'San Jose, CA', 'Prospect', '45000.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18', NULL, NULL, '1');

DROP TABLE IF EXISTS `sales_invoices`;
CREATE TABLE `sales_invoices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_code` varchar(255) NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'Invoice',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(255) NOT NULL DEFAULT 'Draft',
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `items_json` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_invoices_invoice_code_unique` (`invoice_code`),
  KEY `sales_invoices_customer_id_foreign` (`customer_id`),
  CONSTRAINT `sales_invoices_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `sales_customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_invoices` (`id`, `invoice_code`, `customer_id`, `type`, `subtotal`, `tax_amount`, `total_amount`, `status`, `issue_date`, `due_date`, `items_json`, `notes`, `created_at`, `updated_at`) VALUES ('1', 'INV-2026-1042', '1', 'Invoice', '88000.00', '7040.00', '95040.00', 'Paid', '2026-09-29', '2026-10-29', '[{\"name\":\"Optical Sensor Module Series X\",\"qty\":1000,\"price\":88}]', 'Settled via wire transfer.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `sales_leads`;
CREATE TABLE `sales_leads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `deal_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stage` varchar(255) NOT NULL DEFAULT 'New',
  `probability` int(11) NOT NULL DEFAULT 10,
  `expected_close_date` date DEFAULT NULL,
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_leads_customer_id_foreign` (`customer_id`),
  KEY `sales_leads_assigned_to_foreign` (`assigned_to`),
  CONSTRAINT `sales_leads_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_leads_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `sales_customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_leads` (`id`, `customer_id`, `title`, `deal_value`, `stage`, `probability`, `expected_close_date`, `assigned_to`, `notes`, `created_at`, `updated_at`) VALUES ('1', '2', 'Autonomous Navigation Core Supply Agreement (1,000 units)', '125000.00', 'Proposal', '70', '2026-10-29', '6', 'RFP submission delivered. Technical review scheduled for Friday.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `sales_leads` (`id`, `customer_id`, `title`, `deal_value`, `stage`, `probability`, `expected_close_date`, `assigned_to`, `notes`, `created_at`, `updated_at`) VALUES ('2', '1', 'Annual Sensor Modules Refresh Contract', '88000.00', 'Closed Won', '100', '2026-10-04', '6', 'PO received and validated.', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `sales_targets`;
CREATE TABLE `sales_targets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `period` varchar(255) NOT NULL,
  `target_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `achieved_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_targets_user_id_foreign` (`user_id`),
  CONSTRAINT `sales_targets_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_targets` (`id`, `user_id`, `period`, `target_amount`, `achieved_amount`, `created_at`, `updated_at`) VALUES ('1', '6', 'Q4 2026', '350000.00', '213040.00', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `scheduled_reports`;
CREATE TABLE `scheduled_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `frequency` varchar(255) NOT NULL,
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recipients`)),
  `format` varchar(255) NOT NULL DEFAULT 'csv',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_sent_at` timestamp NULL DEFAULT NULL,
  `next_run_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `scheduled_reports_report_id_foreign` (`report_id`),
  CONSTRAINT `scheduled_reports_report_id_foreign` FOREIGN KEY (`report_id`) REFERENCES `analytics_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES ('JQRAFTe5H4OPxy4VDkvjim6RMiWzSQCfE16thrq1', '1', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoiUjZkVjEzOWVhZDY5Z1ZWWWE2cUxPc042V3BOUkZlZFY2SndJaWduViI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTtzOjE3OiJwYXNzd29yZF9oYXNoX3dlYiI7czo2NDoiNmRlMTdjZDI2MmJjMDcyOWQ5Mzc0ZDgwODk5Y2ViZTI4YWE3NWNiYTYwOTY3NzEzZjhjYzdkYTA1OWQ5ZTI4MiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjk6Imh0dHBzOi8vYW5nb3JhLnRlc3QvZGFzaGJvYXJkIjtzOjU6InJvdXRlIjtzOjk6ImRhc2hib2FyZCI7fX0=', '1791916610');

DROP TABLE IF EXISTS `system_notifications`;
CREATE TABLE `system_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'info',
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `system_notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `system_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_notifications` (`id`, `user_id`, `title`, `message`, `type`, `link`, `is_read`, `created_at`, `updated_at`) VALUES ('1', '1', 'System Initialized', 'Multi-Tools Integrated Platform across all 10 departments has been successfully deployed.', 'success', '/dashboard', '0', '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `system_notifications` (`id`, `user_id`, `title`, `message`, `type`, `link`, `is_read`, `created_at`, `updated_at`) VALUES ('2', '1', 'Production Alert', 'Work order WO-2026-003 has entered Quality Control verification.', 'warning', '/production', '0', '2026-10-09 14:39:18', '2026-10-09 14:39:18');

DROP TABLE IF EXISTS `task_dependencies`;
CREATE TABLE `task_dependencies` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `depends_on_task_id` bigint(20) unsigned NOT NULL,
  `dependency_type` varchar(255) NOT NULL DEFAULT 'finish_to_start',
  `lag_days` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_dependencies_task_id_depends_on_task_id_unique` (`task_id`,`depends_on_task_id`),
  KEY `task_dependencies_depends_on_task_id_foreign` (`depends_on_task_id`),
  CONSTRAINT `task_dependencies_depends_on_task_id_foreign` FOREIGN KEY (`depends_on_task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_dependencies_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `third_party_integrations`;
CREATE TABLE `third_party_integrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `provider` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'disconnected',
  `credentials_encrypted` text DEFAULT NULL,
  `account_identifier` varchar(255) DEFAULT NULL,
  `sync_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sync_settings`)),
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `error_log` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `third_party_integrations_user_id_foreign` (`user_id`),
  KEY `third_party_integrations_workspace_id_provider_index` (`workspace_id`,`provider`),
  CONSTRAINT `third_party_integrations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `third_party_integrations_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `permission_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_permissions_user_id_permission_id_unique` (`user_id`,`permission_id`),
  KEY `user_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `user_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'team_member',
  `department` varchar(255) NOT NULL DEFAULT 'General',
  `phone` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `email`, `role`, `department`, `phone`, `avatar_url`, `status`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES ('1', 'Alexander Vance', 'super_admin@angora.internal', 'super_admin', 'Executive', '+1 (555) 010-0001', NULL, 'active', NULL, '$2y$12$eEkzNJzDzNm4R4pX5AoBHu1kFjKTfWMXI6KXRq6Pn4aHwftHurnM6', NULL, '2026-10-09 14:39:18', '2026-10-09 14:39:18');
INSERT INTO `users` (`id`, `name`, `email`, `role`, `department`, `phone`, `avatar_url`, `status`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES ('2', 'Elena Rostova', 'admin@angora.internal', 'admin', 'Operations', '+1 (555) 010-0002', NULL, 'active', NULL, '$2y$12$eEkzNJzDzNm4R4pX5AoBHu1kFjKTfWMXI6KXRq6Pn4aHwftHurnM6', NULL, '2026-10-09 14:39:18', '2026-10-13 18:16:29');

DROP TABLE IF EXISTS `webhook_deliveries`;
CREATE TABLE `webhook_deliveries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint(20) unsigned NOT NULL,
  `event` varchar(255) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status_code` smallint(5) unsigned DEFAULT NULL,
  `response_body` text DEFAULT NULL,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `is_successful` tinyint(1) NOT NULL DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_deliveries_subscription_id_created_at_index` (`subscription_id`,`created_at`),
  CONSTRAINT `webhook_deliveries_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `webhook_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `webhook_subscriptions`;
CREATE TABLE `webhook_subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `secret` varchar(64) NOT NULL,
  `events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`events`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `failure_count` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_subscriptions_created_by_foreign` (`created_by`),
  KEY `webhook_subscriptions_workspace_id_is_active_index` (`workspace_id`,`is_active`),
  CONSTRAINT `webhook_subscriptions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `webhook_subscriptions_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `work_os_templates`;
CREATE TABLE `work_os_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `is_system_template` tinyint(1) NOT NULL DEFAULT 0,
  `icon` varchar(255) NOT NULL DEFAULT 'LayoutTemplate',
  `color` varchar(255) NOT NULL DEFAULT '#C8AEF5',
  `content_schema` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`content_schema`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_os_templates_created_by_foreign` (`created_by`),
  CONSTRAINT `work_os_templates_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `workdoc_comments`;
CREATE TABLE `workdoc_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workdoc_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `comment` text NOT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workdoc_comments_workdoc_id_foreign` (`workdoc_id`),
  KEY `workdoc_comments_user_id_foreign` (`user_id`),
  KEY `workdoc_comments_parent_id_foreign` (`parent_id`),
  CONSTRAINT `workdoc_comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `workdoc_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workdoc_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workdoc_comments_workdoc_id_foreign` FOREIGN KEY (`workdoc_id`) REFERENCES `workdocs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `workdoc_versions`;
CREATE TABLE `workdoc_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workdoc_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `version_number` varchar(255) NOT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `content` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workdoc_versions_workdoc_id_foreign` (`workdoc_id`),
  KEY `workdoc_versions_user_id_foreign` (`user_id`),
  CONSTRAINT `workdoc_versions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `workdoc_versions_workdoc_id_foreign` FOREIGN KEY (`workdoc_id`) REFERENCES `workdocs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `workdocs`;
CREATE TABLE `workdocs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` longtext DEFAULT NULL,
  `folder_name` varchar(255) DEFAULT NULL,
  `owner_id` bigint(20) unsigned NOT NULL,
  `project_id` bigint(20) unsigned DEFAULT NULL,
  `board_id` bigint(20) unsigned DEFAULT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `visibility` varchar(255) NOT NULL DEFAULT 'team',
  `is_template` tinyint(1) NOT NULL DEFAULT 0,
  `template_category` varchar(255) DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workdocs_owner_id_foreign` (`owner_id`),
  KEY `workdocs_project_id_foreign` (`project_id`),
  KEY `workdocs_board_id_foreign` (`board_id`),
  KEY `workdocs_task_id_foreign` (`task_id`),
  CONSTRAINT `workdocs_board_id_foreign` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `workdocs_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workdocs_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `agency_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `workdocs_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `workspace_members`;
CREATE TABLE `workspace_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `workspace_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'member',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workspace_members_workspace_id_user_id_unique` (`workspace_id`,`user_id`),
  KEY `workspace_members_user_id_foreign` (`user_id`),
  CONSTRAINT `workspace_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workspace_members_workspace_id_foreign` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspace_members` (`id`, `workspace_id`, `user_id`, `role`, `created_at`, `updated_at`) VALUES ('1', '1', '1', 'owner', '2026-10-12 17:59:05', '2026-10-12 17:59:05');
INSERT INTO `workspace_members` (`id`, `workspace_id`, `user_id`, `role`, `created_at`, `updated_at`) VALUES ('2', '1', '2', 'admin', '2026-10-12 17:59:05', '2026-10-12 17:59:05');

DROP TABLE IF EXISTS `workspaces`;
CREATE TABLE `workspaces` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(255) NOT NULL DEFAULT 'layout',
  `color` varchar(255) NOT NULL DEFAULT '#C8AEF5',
  `owner_id` bigint(20) unsigned NOT NULL,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workspaces_owner_id_foreign` (`owner_id`),
  CONSTRAINT `workspaces_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `workspaces` (`id`, `name`, `description`, `icon`, `color`, `owner_id`, `is_favorite`, `is_archived`, `created_at`, `updated_at`) VALUES ('1', 'Main Workspace', 'Cross-functional enterprise workspace spanning all departments.', 'layout-grid', '#C8AEF5', '1', '1', '0', '2026-10-12 17:59:05', '2026-10-12 17:59:05');

SET FOREIGN_KEY_CHECKS=1;

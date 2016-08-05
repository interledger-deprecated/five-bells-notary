CREATE SEQUENCE [N_SEQ_CASES_PK] AS INT
  INCREMENT BY 1
  START WITH 1
  CACHE 100
GO

CREATE SEQUENCE [N_SEQ_NOTIFICATIONS_PK] AS INT
  INCREMENT BY 1
  START WITH 1
  CACHE 100
GO


CREATE TABLE [N_LU_CASE_STATUS]
(
  [CASE_STATUS_ID]         INT NOT NULL CONSTRAINT [N_PK_LU_CASE_STATUS] PRIMARY KEY,
  [NAME]                   VARCHAR(20) NOT NULL ,
  [DESCRIPTION]            VARCHAR(255) NULL ,
  [DB_CREATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_USER]        VARCHAR(40) DEFAULT CURRENT_USER NOT NULL 
)
GO

CREATE UNIQUE INDEX [N_XAK_LU_CASE_STATUS] ON [N_LU_CASE_STATUS]
  ([NAME] ASC)
GO 

CREATE TABLE [N_CASES]
(
  [CASE_ID]                     INT NOT NULL CONSTRAINT [N_PK_CASES] PRIMARY KEY,
  [UUID]                        VARCHAR(64) NOT NULL ,
  [STATUS_ID]                   INT NOT NULL ,
  [EXECUTION_CONDITION_TYPE]    VARCHAR(20) NULL ,
  [EXECUTION_CONDITION_DIGEST]  VARCHAR(4000) NULL ,
  [EXEC_COND_FULFILLMENT]       VARCHAR(4000) NULL ,
  [EXPIRES_DTTM]                DATETIME NULL ,
  [NOTARIES]                    VARCHAR(4000) NULL ,
  [NOTIFICATION_TARGETS]        VARCHAR(4000) NULL ,
  [DB_CREATED_DTTM]             DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_DTTM]             DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_USER]             VARCHAR(40) DEFAULT CURRENT_USER NOT NULL 
)
GO

ALTER TABLE [N_CASES] 
 ADD CONSTRAINT N_DF_CASES_PK 
 DEFAULT (NEXT VALUE FOR [N_SEQ_CASES_PK]) FOR [CASE_ID]
GO 

CREATE UNIQUE INDEX [N_XAK_CASES_GUID] ON [N_CASES]
  ([UUID] ASC)
GO 
 

ALTER TABLE [N_CASES] ADD CONSTRAINT
  [FK_STATUS_ID__CASES] FOREIGN KEY ([STATUS_ID])
  REFERENCES [N_LU_CASE_STATUS] ([CASE_STATUS_ID])
GO


CREATE TABLE [N_LU_NOTIFICATION_STATUS]
(
  [NOTIFICATION_STATUS_ID] INT NOT NULL CONSTRAINT [N_PK_LU_NOTIFICATION_STATUS] PRIMARY KEY,
  [NAME]                   VARCHAR(20) NOT NULL ,
  [DESCRIPTION]            VARCHAR(255) NULL ,
  [DB_CREATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_USER]        VARCHAR(40) DEFAULT CURRENT_USER NOT NULL 
)
GO

CREATE UNIQUE INDEX [N_XAK_LU_NOTIFICATION_STATUS] ON [N_LU_NOTIFICATION_STATUS]
  ([NAME] ASC)
GO 


CREATE TABLE [N_NOTIFICATIONS]
(
  [NOTIFICATION_ID]        INT NOT NULL  CONSTRAINT [N_PK_NOTIFICATIONS] PRIMARY KEY,
  [STATUS_ID]              INT NOT NULL ,
  [CASE_ID]                INT NOT NULL ,
  [TARGET]                 VARCHAR(4000) NULL ,
  [RETRY_COUNT]            INT NULL ,
  [NEXT_RETRY_DTTM]        DATETIME NULL ,
  [IS_ACTIVE]              SMALLINT NULL ,
  [LAST_RETRY_DTTM]        DATETIME NULL ,
  [DB_CREATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_DTTM]        DATETIME DEFAULT GETDATE() NOT NULL ,
  [DB_UPDATED_USER]        VARCHAR(40) DEFAULT CURRENT_USER NOT NULL 
)
GO


ALTER TABLE [N_NOTIFICATIONS] 
 ADD CONSTRAINT N_DF_NOTIFICATIONS_PK  
 DEFAULT (NEXT VALUE FOR [N_SEQ_NOTIFICATIONS_PK]) FOR [NOTIFICATION_ID]
GO

ALTER TABLE [N_NOTIFICATIONS] ADD CONSTRAINT
  [FK_STATUS_ID__NOTIFICATIONS] FOREIGN KEY ([STATUS_ID])
  REFERENCES [N_LU_NOTIFICATION_STATUS] ([NOTIFICATION_STATUS_ID])
GO

ALTER TABLE [N_NOTIFICATIONS] ADD CONSTRAINT
  [FK_CASE_ID__NOTIFICATIONS] FOREIGN KEY ([CASE_ID])
  REFERENCES [N_CASES] ([CASE_ID])
GO




INSERT INTO [N_LU_CASE_STATUS] (CASE_STATUS_ID, NAME, DESCRIPTION) VALUES (1, 'proposed', 'This case is proposed')
GO
INSERT INTO [N_LU_CASE_STATUS] (CASE_STATUS_ID, NAME, DESCRIPTION) VALUES (2, 'rejected', 'This case has been rejected because it is past expiry')
GO
INSERT INTO [N_LU_CASE_STATUS] (CASE_STATUS_ID, NAME, DESCRIPTION) VALUES (3, 'executed', 'This case has been executed because it received the proper fulfillment')
GO

INSERT INTO [N_LU_NOTIFICATION_STATUS] (NOTIFICATION_STATUS_ID, NAME, DESCRIPTION) VALUES  (1, 'pending', 'This notification is being delivered')
GO
INSERT INTO [N_LU_NOTIFICATION_STATUS] (NOTIFICATION_STATUS_ID, NAME, DESCRIPTION) VALUES  (2, 'delivered', 'This notification has been delivered')
GO
INSERT INTO [N_LU_NOTIFICATION_STATUS] (NOTIFICATION_STATUS_ID, NAME, DESCRIPTION) VALUES  (3, 'failed', 'Delivery failed permanently')
GO
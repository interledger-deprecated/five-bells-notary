IF (EXISTS (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
            WHERE TABLE_NAME = 'N_NOTIFICATIONS' AND CONSTRAINT_NAME = 'FK_CASE_ID__NOTIFICATIONS'))
BEGIN 
  ALTER TABLE [N_NOTIFICATIONS] DROP CONSTRAINT [FK_CASE_ID__NOTIFICATIONS]  ; 
END
  ELSE 
    BEGIN 
        PRINT 'CONSTRAINT ON N_NOTIFICATIONS NOT FOUND' 
    END;
GO


IF (EXISTS (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
            WHERE TABLE_NAME = 'N_NOTIFICATIONS' AND CONSTRAINT_NAME = 'FK_STATUS_ID__NOTIFICATIONS'))
BEGIN  
  ALTER TABLE [N_NOTIFICATIONS] DROP CONSTRAINT [FK_STATUS_ID__NOTIFICATIONS]  ; 
END
  ELSE 
    BEGIN 
        PRINT 'CONSTRAINT ON N_NOTIFICATIONS NOT FOUND' 
    END;
GO


IF (EXISTS (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
            WHERE TABLE_NAME = 'N_CASES' AND CONSTRAINT_NAME = 'FK_STATUS_ID__CASES'))
BEGIN 
  ALTER TABLE [N_CASES] DROP CONSTRAINT [FK_STATUS_ID__CASES]  ; 
END
  ELSE 
    BEGIN 
        PRINT 'CONSTRAINT ON N_CASES NOT FOUND' 
    END;
GO


IF (EXISTS (SELECT SEQUENCE_NAME FROM INFORMATION_SCHEMA.SEQUENCES
            WHERE SEQUENCE_NAME = 'N_SEQ_CASES_PK'))
BEGIN 
    ALTER TABLE [N_CASES] DROP CONSTRAINT N_DF_CASES_PK;
    DROP SEQUENCE N_SEQ_CASES_PK;
END
  ELSE 
    BEGIN 
        PRINT 'SEQUENCE N_SEQ_CASES_PK NOT FOUND' 
    END;
GO


IF (EXISTS (SELECT SEQUENCE_NAME FROM INFORMATION_SCHEMA.SEQUENCES
            WHERE SEQUENCE_NAME = 'N_SEQ_NOTIFICATIONS_PK'))
BEGIN 
    ALTER TABLE [N_NOTIFICATIONS] DROP CONSTRAINT N_DF_NOTIFICATIONS_PK;
    DROP SEQUENCE N_SEQ_NOTIFICATIONS_PK;
END
  ELSE 
    BEGIN 
        PRINT 'SEQUENCE N_SEQ_NOTIFICATIONS_PK NOT FOUND' 
    END;
GO



TRUNCATE TABLE [N_NOTIFICATIONS] ;
GO

TRUNCATE TABLE [N_LU_NOTIFICATION_STATUS] ;
GO

TRUNCATE TABLE [N_CASES] ;
GO

TRUNCATE TABLE [N_LU_CASE_STATUS] ;
GO



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


ALTER TABLE [N_CASES] 
 ADD CONSTRAINT N_DF_CASES_PK 
 DEFAULT (NEXT VALUE FOR [N_SEQ_CASES_PK]) FOR [CASE_ID]
GO 

ALTER TABLE [N_NOTIFICATIONS] 
 ADD CONSTRAINT N_DF_NOTIFICATIONS_PK  
 DEFAULT (NEXT VALUE FOR [N_SEQ_NOTIFICATIONS_PK]) FOR [NOTIFICATION_ID]
GO

ALTER TABLE [N_CASES] ADD CONSTRAINT
  [FK_STATUS_ID__CASES] FOREIGN KEY ([STATUS_ID])
  REFERENCES [N_LU_CASE_STATUS] ([CASE_STATUS_ID])
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
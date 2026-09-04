import { Module } from '@nestjs/common';

import { EncounterLifecycleService } from './encounter-lifecycle.service';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalReconciliationService } from './clinical-reconciliation.service';
import { PatientClinicalHistoryService } from './patient-clinical-history.service';
import { ClinicalAccessAuditService } from './clinical-access-audit.service';
import { ClinicalResourceAccessService } from './clinical-resource-access.service';
import { PatientClinicalController } from './patient-clinical.controller';
import { AdminClinicalWorkspaceController } from './admin-clinical-workspace.controller';
import { AdminClinicalWorkspaceService } from './admin-clinical-workspace.service';
import { AdminPrescriptionsController } from './admin-prescriptions.controller';
import { PrescriptionService } from './prescription.service';

@Module({ controllers: [PatientClinicalController, AdminClinicalWorkspaceController, AdminPrescriptionsController], providers: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService], exports: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService] })
export class ClinicalModule {}

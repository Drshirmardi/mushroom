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
import { AdminTreatmentPlansController } from './admin-treatment-plans.controller';
import { PatientTreatmentPlansController } from './patient-treatment-plans.controller';
import { TreatmentPlanService } from './treatment-plan.service';

@Module({ controllers: [PatientClinicalController, AdminClinicalWorkspaceController, AdminPrescriptionsController, AdminTreatmentPlansController, PatientTreatmentPlansController], providers: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService, TreatmentPlanService], exports: [EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService, TreatmentPlanService] })
export class ClinicalModule {}

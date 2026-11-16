import { VisitCareController } from './visit-care.controller';
import { VisitCareService } from './visit-care.service';
import { PatientPrescriptionsController } from './patient-prescriptions.controller';
import { CustomProgramBoundaryService } from './custom-program-boundary.service';
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
import { AdminTreatmentPlansController, AdminTreatmentReportingController } from './admin-treatment-plans.controller';
import { PatientTreatmentPlansController } from './patient-treatment-plans.controller';
import { TreatmentPlanService } from './treatment-plan.service';
import { AdminTreatmentTasksController } from './admin-treatment-tasks.controller';
import { PatientTreatmentActivityController } from './patient-treatment-activity.controller';
import { TreatmentActivityService } from './treatment-activity.service';
import { AdminTreatmentProgressController } from './admin-treatment-progress.controller';
import { PatientTreatmentProgressController } from './patient-treatment-progress.controller';
import { TreatmentProgressService } from './treatment-progress.service';
import { OutboxModule } from '../outbox/outbox.module';

@Module({ imports: [OutboxModule], controllers: [VisitCareController, PatientPrescriptionsController, PatientClinicalController, AdminClinicalWorkspaceController, AdminPrescriptionsController, AdminTreatmentPlansController, AdminTreatmentReportingController, PatientTreatmentPlansController, AdminTreatmentTasksController, PatientTreatmentActivityController, AdminTreatmentProgressController, PatientTreatmentProgressController], providers: [VisitCareService, CustomProgramBoundaryService, EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService, TreatmentPlanService, TreatmentActivityService, TreatmentProgressService], exports: [CustomProgramBoundaryService, EncounterLifecycleService, ClinicalNotesService, ClinicalReconciliationService, PatientClinicalHistoryService, ClinicalAccessAuditService, ClinicalResourceAccessService, AdminClinicalWorkspaceService, PrescriptionService, TreatmentPlanService, TreatmentActivityService, TreatmentProgressService] })
export class ClinicalModule {}

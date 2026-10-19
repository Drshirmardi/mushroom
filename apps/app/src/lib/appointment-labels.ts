import type { PatientAppointment } from "./appointment-api";
export const appointmentStatusLabels: Record<PatientAppointment["status"], string> = { PENDING: "در انتظار تأیید", CONFIRMED: "تأیید شده", CHECKED_IN: "پذیرش شده", QUEUED: "در صف", IN_PROGRESS: "در حال ویزیت", COMPLETED: "تکمیل شده", NO_SHOW: "عدم مراجعه", CANCELLED: "لغو شده" };

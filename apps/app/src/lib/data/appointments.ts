export type Appointment = {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  statusColor: string;
  online: boolean;
  img: string;
};

export const APPOINTMENTS: Appointment[] = [
  { id: "a1", doctor: "دکتر سید ابوالفتح شیرمردی", specialty: "متخصص طب سنتی", date: "یکشنبه ۱۴ مرداد", time: "۱۰:۰۰", status: "تأیید شده", statusColor: "bg-green-50 text-green-700", online: false, img: "photo-1612349317150-e413f6a5b16d" },
  { id: "a2", doctor: "دکتر سارا میرزایی", specialty: "کارشناس تغذیه", date: "چهارشنبه ۱۷ مرداد", time: "۱۴:۳۰", status: "در انتظار", statusColor: "bg-amber-50 text-amber-700", online: false, img: "photo-1559839734-2b71ea197ec2" },
  { id: "a3", doctor: "دکتر سید ابوالفتح شیرمردی", specialty: "مشاوره پیگیری", date: "امروز", time: "۱۸:۰۰", status: "آماده اتصال", statusColor: "bg-blue-50 text-blue-700", online: true, img: "photo-1612349317150-e413f6a5b16d" },
];

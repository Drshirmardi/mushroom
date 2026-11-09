/**
 * User-facing status copy for the marriage invitation. Keep this derived
 * from server state; never infer acceptance or payment from local clicks.
 */
export function describeMarriageRequest({
  status,
  isInitiator,
  profileRequired,
  ownEligible,
  hasEducationalId,
}: {
  status: string;
  isInitiator: boolean;
  profileRequired: boolean;
  ownEligible: boolean;
  hasEducationalId: boolean;
}): { title: string; description: string } {
  if (status === "CANCELLED") {
    return { title: "این دعوت لغو شده است", description: "این لینک دیگر قابل پذیرش نیست." };
  }
  if (status === "REPLACED") {
    return { title: "لینک دعوت تغییر کرده است", description: "برای ادامه، از لینک دعوت جدید استفاده کنید." };
  }
  if (profileRequired) {
    return {
      title: "ابتدا مشخصاتت را تکمیل کن",
      description: "برای بررسی شرایط شرکت و ادامهٔ دعوت، اطلاعات حساب باید کامل باشد.",
    };
  }
  if (!ownEligible) {
    return {
      title: "شرایط شرکت را بررسی کن",
      description: "شرایط این نقش با اطلاعات فعلی حساب مطابقت ندارد.",
    };
  }
  if (status === "PENDING") {
    return isInitiator
      ? {
          title: "منتظر پذیرش نفر دوم",
          description: "لینک دعوت را برای نفر دوم بفرست. بعد از پذیرش او، مرحلهٔ بعد باز می‌شود.",
        }
      : {
          title: "دعوت جدید برای تو",
          description: "پیش از پذیرش، مشخصات دعوت و شرایط اتصال را بررسی کن.",
        };
  }
  if (status === "ACCEPTED") {
    return hasEducationalId
      ? {
          title: "دعوت پذیرفته شد",
          description: "حالا هر نفر با حساب خودش رضایت و ادامهٔ تست را انجام می‌دهد.",
        }
      : {
          title: "دعوت پذیرفته شد؛ در حال آماده‌سازی ادامه",
          description: "وضعیت دعوت را به‌روزرسانی کن تا مسیر ادامه مشخص شود.",
        };
  }
  return {
    title: "وضعیت دعوت",
    description: "برای مشاهدهٔ آخرین وضعیت دعوت، اطلاعات را دوباره دریافت کن.",
  };
}

export interface LoginPayload {
    phone: string;
    password: string;
    remember: boolean;
}

export interface SignupPayload {
    name: string;
    phone: string;
    password: string;
}

export type AuthResult = { ok: true } | { ok: false; message: string };

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// پیاده‌سازی موقت سمت کلاینت؛ کاربران فقط در حافظه مرورگر (تا رفرش صفحه)
// نگهداری می‌شوند. با اتصال بک‌اند واقعی، بدنه این دو تابع با فراخوانی API
// جایگزین می‌شود و امضای توابع بدون تغییر می‌ماند.
const users = new Map<string, { name: string; password: string }>();

export async function loginWithPhone(payload: LoginPayload): Promise<AuthResult> {
    await delay(800);

    const user = users.get(payload.phone);
    if (!user) {
        return {
            ok: false,
            message: "حسابی با این شماره موبایل یافت نشد؛ ابتدا ثبت‌نام کنید.",
        };
    }
    if (user.password !== payload.password) {
        return { ok: false, message: "شماره موبایل یا رمز عبور اشتباه است." };
    }
    return { ok: true };
}

export async function signupWithPhone(payload: SignupPayload): Promise<AuthResult> {
    await delay(800);

    if (users.has(payload.phone)) {
        return {
            ok: false,
            message: "این شماره موبایل قبلاً ثبت‌نام کرده است؛ می‌توانید وارد شوید.",
        };
    }
    users.set(payload.phone, { name: payload.name, password: payload.password });
    return { ok: true };
}

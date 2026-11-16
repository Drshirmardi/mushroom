'use client';
import { HeartbeatLoader } from '@/components/shared/heartbeat-loader';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Check, MapPin, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { marriageProfileReturn } from '@/lib/marriage-profile-return';
import { useAuthSession } from '@/components/auth/session-gate';
import {
  ProfileFields,
  validateEmail,
  type ProfileDraft,
} from '@/components/onboarding/profile-fields';
import { BottomSheet, type BottomSheetHandle } from '@/components/shared/bottom-sheet';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileBirthDateField } from '@/components/profile/profile-birth-date-field';
import {
  loadSelfProfile,
  onboardingErrorMessage,
  updateSelfProfile,
} from '@/lib/onboarding/patient-onboarding';

type EditableProfileDraft = ProfileDraft & { birthDate: string };
const EMPTY: EditableProfileDraft = { firstName: '', lastName: '', email: '', cityName: '', gender: '', birthDate: '' };
const same = (a: EditableProfileDraft, b: EditableProfileDraft) =>
  a.firstName === b.firstName &&
  a.lastName === b.lastName &&
  a.email === b.email &&
  a.cityName === b.cityName &&
  a.gender === b.gender &&
  a.birthDate === b.birthDate;

function FieldsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">در حال دریافت مشخصات…</span>
      <p className="rounded-2xl bg-muted p-4">
        <span className="block h-4 w-3/4 skeleton rounded bg-border" />
        <span className="mt-2 block h-4 w-1/2 skeleton rounded bg-border" />
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-white p-4">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row}>
              <span className="mb-1 block h-3 w-20 skeleton rounded bg-muted" />
              <span
                className="flex h-[52px] items-center rounded-lg border border-border bg-white px-4"
                aria-hidden="true"
              >
                <span className="block h-3 w-1/2 skeleton rounded bg-muted" />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 h-[56px] skeleton rounded-2xl bg-muted" />
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [profile, setProfile] = useState<EditableProfileDraft>(EMPTY);
  const [initial, setInitial] = useState<EditableProfileDraft>(EMPTY);
  const [phone, setPhone] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const pushTimer = useRef<number | null>(null);
  const confirmSheetRef = useRef<BottomSheetHandle>(null);
  const afterConfirmCloseRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current);
    },
    [],
  );
  useEffect(() => {
    void (async () => {
      try {
        const result = await loadSelfProfile(authentication.accessToken);
        const draft = {
          firstName: typeof result.firstName === 'string' ? result.firstName : '',
          lastName: typeof result.lastName === 'string' ? result.lastName : '',
          email: typeof result.email === 'string' ? result.email : '',
          cityName: typeof result.cityName === 'string' ? result.cityName : '',
          birthDate: typeof result.birthDate === 'string' ? result.birthDate.slice(0, 10) : '',
          gender:
            result.gender === 'FEMALE' || result.gender === 'MALE' ? result.gender : ('' as const),
        };
        setProfile(draft);
        setInitial(draft);
        setPhone(result.phone);
      } catch (cause) {
        setError(onboardingErrorMessage(cause, 'load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [authentication.accessToken]);
  const dirty = !same(profile, initial);
  const save = async (navigate = true): Promise<boolean> => {
    if (saving || justSaved || !dirty) return false;
    const emailMessage = validateEmail(profile.email);
    if (emailMessage) {
      setEmailError(emailMessage);
      document.getElementById('email')?.focus();
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSelfProfile(authentication.accessToken, {
        ...profile,
        birthDate: profile.birthDate || undefined,
      });
      setInitial(profile);
      if (navigate) {
        setJustSaved(true);
        pushTimer.current = window.setTimeout(
          () =>
            router.push(
              (() => {
                const next = new URLSearchParams(window.location.search).get('returnTo');
                return marriageProfileReturn(next) ?? '/profile';
              })(),
            ),
          750,
        );
      }
      return true;
    } catch (cause) {
      setError(onboardingErrorMessage(cause));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const returnFromProfile = () => {
    const next = marriageProfileReturn(new URLSearchParams(window.location.search).get('returnTo'));
    if (next) router.push(next);
    else router.back();
  };
  const dismissConfirm = (after?: () => void) => {
    afterConfirmCloseRef.current = after ?? null;
    confirmSheetRef.current?.close();
  };

  const finishConfirmClose = () => {
    const action = afterConfirmCloseRef.current;
    afterConfirmCloseRef.current = null;

    setConfirmLeave(false);
    action?.();
  };
  const goBack = () => {
    if (dirty && !saving) setConfirmLeave(true);
    else returnFromProfile();
  };
  const liveName = [profile.firstName.trim(), profile.lastName.trim()].filter(Boolean).join(' ');
  return (
    <div className="profile-scope">
      <PageHeader title="ویرایش پروفایل" onBack={goBack} />
      <div className="space-y-4 px-4 pb-4 pt-4">
        {loading ? (
          <FieldsSkeleton />
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save(true);
            }}
            className="space-y-4"
          >
            <div
              className="rounded-2xl border border-border bg-white p-5 text-center"
              aria-label="پیش‌نمایش پروفایل"
            >
              <p className="text-[11px] font-bold text-muted-foreground">پیش‌نمایش در پروفایل</p>
              {!previewFailed ? (
                <img
                  src="/avatars/avatar-male.png"
                  alt=""
                  width={96}
                  height={96}
                  draggable={false}
                  onError={() => setPreviewFailed(true)}
                  aria-hidden="true"
                  className="mx-auto mt-3 h-[96px] w-[96px] object-contain"
                />
              ) : (
                <div
                  className="mx-auto mt-3 flex h-[96px] w-[96px] items-center justify-center rounded-2xl bg-blue-50 text-3xl font-bold text-blue-700"
                  aria-hidden="true"
                >
                  {(liveName || '؟').slice(0, 1)}
                </div>
              )}
              <p className="mt-3 truncate text-lg font-extrabold text-foreground">
                {liveName || 'نام شما'}
              </p>
              {profile.cityName.trim() ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin size={13} aria-hidden="true" />
                  {profile.cityName.trim()}
                </p>
              ) : null}
              {phone ? (
                <p
                  dir="ltr"
                  className="mt-1 flex items-center justify-center gap-1.5 text-xs tabular-nums text-muted-foreground"
                >
                  {phone}
                  <Phone size={13} aria-hidden="true" />
                </p>
              ) : null}
              {!profile.cityName.trim() && !phone ? (
                <p className="mt-1.5 text-xs text-muted-foreground">—</p>
              ) : null}
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="rounded-2xl border border-border bg-white p-4">
              <ProfileFields
                value={profile}
                onChange={(value) => setProfile((current) => ({ ...current, ...value }))}
                phone={phone}
                tone="blue"
                grouped
                inlineEdit
                showGender
                hiddenFields={['cityName']}
                emailError={emailError}
                onEmailError={setEmailError}
                phoneAction={{
                  label: 'رفتن به امنیت حساب',
                  onClick: () => router.push('/profile/security'),
                }}
                identityAfter={
                  <ProfileBirthDateField
                    value={profile.birthDate}
                    onChange={(birthDate) => setProfile((current) => ({ ...current, birthDate }))}
                    disabled={saving || justSaved}
                  />
                }
              />
            </div>
            <button
              type="submit"
              disabled={saving || justSaved || !dirty}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-700 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
              aria-busy={Boolean(saving)}
            >
              {saving ? (
                <>
                  <HeartbeatLoader />
                  {'در حال ذخیره…'}
                </>
              ) : justSaved ? (
                <>
                  <Check size={16} strokeWidth={3} aria-hidden="true" />
                  ذخیره شد
                </>
              ) : dirty ? (
                'ذخیره تغییرات'
              ) : (
                'بدون تغییر'
              )}
            </button>
          </form>
        )}
      </div>
      <AnimatePresence>
        {confirmLeave && (
          <BottomSheet
            ref={confirmSheetRef}
            title="تغییرات ذخیره نشده"
            onBeforeClose={() => !saving}
            onClose={finishConfirmClose}
          >
            {' '}
            <p className="text-sm leading-6 text-muted-foreground">
              تغییراتی دارید که هنوز ذخیره نشده است. می‌خواهید چه کار کنید؟
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void save(false).then((ok) => {
                    if (ok) dismissConfirm(returnFromProfile);
                  });
                }}
                className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                aria-busy={Boolean(saving)}
              >
                {saving ? (
                  <>
                    <HeartbeatLoader />
                    {'در حال ذخیره…'}
                  </>
                ) : (
                  'ذخیره و خروج'
                )}
              </button>
              <button
                type="button"
                onClick={() => dismissConfirm(returnFromProfile)}
                className="w-full rounded-2xl bg-muted py-3.5 text-sm font-bold text-foreground transition-colors active:bg-border"
              >
                خروج بدون ذخیره
              </button>
              <button
                type="button"
                onClick={() => dismissConfirm()}
                className="w-full rounded-2xl py-3 text-sm font-bold text-muted-foreground transition-colors active:bg-muted"
              >
                انصراف
              </button>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

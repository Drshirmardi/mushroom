"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductEditorState } from "./catalog-view";
import { Check, RefreshCw, X } from "lucide-react";

import {
  ProductContentApiError,
  productContentApi,
  productContentErrorMessage,
  type AdminProductContent,
} from "../../lib/commerce-product-content-api";
import {
  CONTENT_FIELD_DEFS,
  CONTENT_SECTIONS,
  CONTENT_STATUS_LABEL,
  SOURCE_KIND_OPTIONS,
  canApproveContent,
  contentDraftFromServer,
  contentPatchBody,
  contentVisibilityNote,
  draftProvenance,
  emptyContentDraft,
  isContentDirty,
  provenanceError,
  type ContentDraft,
  type ContentFieldKey,
} from "./product-content-draft";

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
const statusClass: Record<AdminProductContent["status"], string> = {
  LEGACY_UNREVIEWED: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
};
const fa = (value: number) => value.toLocaleString("fa-IR");

function FieldInput({
  fieldKey,
  draft,
  disabled,
  onChange,
}: {
  fieldKey: ContentFieldKey;
  draft: ContentDraft;
  disabled: boolean;
  onChange: (key: ContentFieldKey, value: string) => void;
}) {
  const def = CONTENT_FIELD_DEFS.find((entry) => entry.key === fieldKey)!;
  const id = `product-content-${fieldKey}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-muted-foreground">
        {def.label}
      </label>
      {def.multiline ? (
        <textarea
          id={id}
          rows={3}
          maxLength={def.maxLength}
          disabled={disabled}
          value={draft[fieldKey]}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className={`${input} min-h-20 resize-y`}
          aria-describedby={`${id}-help ${id}-count`}
        />
      ) : (
        <input
          id={id}
          maxLength={def.maxLength}
          disabled={disabled}
          value={draft[fieldKey]}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className={input}
          aria-describedby={`${id}-help ${id}-count`}
        />
      )}
      <p id={`${id}-help`} className="mt-1 text-[11px] text-muted-foreground">
        {def.help}
      </p>
      <p id={`${id}-count`} className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
        {fa(draft[fieldKey].trim().length)} از {fa(def.maxLength)} نویسه
      </p>
    </div>
  );
}

type Notice = { kind: "success" | "error" | "conflict" | "info"; text: string } | null;

export default function ProductContentEditor({
  product,
  accessToken,
  onClose,
  onChanged,
  embedded = false,
  onEditorStateChange,
}: {
  product: { id: string; title: string };
  accessToken: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  embedded?: boolean;
  onEditorStateChange?: (state: ProductEditorState) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [server, setServer] = useState<AdminProductContent | null>(null);
  const [draft, setDraft] = useState<ContentDraft>(emptyContentDraft);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const busy = saving || approving || reloading;
  const dirty = server !== null && isContentDirty(draft, contentDraftFromServer(server));
  const provenanceProblem = provenanceError(draft);

  const load = async (keepDraft: boolean) => {
    setLoadState("loading");
    setNotice(null);
    try {
      const current = await productContentApi().load(product.id, accessToken);
      setServer(current);
      if (!keepDraft) setDraft(contentDraftFromServer(current));
      setLoadState("ready");
    } catch (error) {
      const status = error instanceof ProductContentApiError ? error.status : 0;
      const code = error instanceof ProductContentApiError ? error.code : "";
      setNotice({ kind: "error", text: productContentErrorMessage(status, code) });
      setLoadState("error");
    }
  };

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void load(false);
    });
    return () => {
      mounted = false;
    };
    // The parent keys this editor by product. Token rotation must not reset its
    // draft; the shared session-aware transport supplies current credentials.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  useEffect(() => {
    const element = dialog.current;
    if (!embedded) element?.showModal();
    return () => element?.close();
  }, [embedded]);
  useEffect(() => { onEditorStateChange?.({ busy, dirty }); }, [busy, dirty, onEditorStateChange]);

  const requestClose = () => {
    if (busy) return;
    if (dirty && !busy && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const setField = (key: ContentFieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setConfirmDiscard(false);
  };

  const reloadAfterConflict = async () => {
    if (busy || !conflicted || !confirmReload) return;
    setReloading(true);
    try {
      const current = await productContentApi().load(product.id, accessToken);
      setServer(current);
      setDraft(contentDraftFromServer(current));
      setConflicted(false);
      setConfirmReload(false);
      setConfirmDiscard(false);
      setNotice({ kind: "info", text: "نسخهٔ تازه دریافت شد. تغییرهای موردنظر را پس از بازبینی دوباره وارد کنید." });
    } catch (error) {
      const status = error instanceof ProductContentApiError ? error.status : 0;
      setNotice({ kind: "error", text: productContentErrorMessage(status, error instanceof ProductContentApiError ? error.code : "") });
    } finally {
      setReloading(false);
    }
  };

  const save = async () => {
    if (!server || busy || conflicted) return;
    if (provenanceProblem) {
      setNotice({ kind: "error", text: provenanceProblem });
      document.getElementById("product-content-sourceKind")?.focus();
      return;
    }
    if (!dirty) return;
    setSaving(true);
    setNotice(null);
    try {
      const { fields, provenance } = contentPatchBody(draft);
      const updated = await productContentApi().save(product.id, accessToken, {
        fields,
        provenance,
        expectedContentRevision: server.contentRevision,
      });
      const advanced = updated.contentRevision > server.contentRevision;
      setServer(updated);
      setDraft(contentDraftFromServer(updated));
      setConfirmDiscard(false);
      setNotice({
        kind: "success",
        text: advanced
          ? `ذخیره شد (نگارش ${fa(updated.contentRevision)})؛ تأیید قبلی باطل شد و محتوا تا تأیید تازه عمومی نیست.`
          : "ذخیره شد؛ تغییر مؤثری نبود و وضعیت تأیید عوض نشد.",
      });
      try {
        await onChanged();
      } catch {
        setNotice({ kind: "info", text: "ذخیره شد، اما فهرست محصولات به‌روز نشد؛ صفحه را دوباره دریافت کنید." });
      }
    } catch (error) {
      const status = error instanceof ProductContentApiError ? error.status : 0;
      const code = error instanceof ProductContentApiError ? error.code : "";
      if (status === 409) {
        setConflicted(true);
        setNotice({ kind: "conflict", text: "نسخهٔ محتوا روی سرور تغییر کرده است. پیش‌نویس شما حفظ شده؛ تا دریافت و بازبینی نسخهٔ تازه، ذخیره و تأیید متوقف است." });
      } else {
        setNotice({ kind: "error", text: productContentErrorMessage(status, code) });
      }
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    if (!server || busy || dirty || conflicted) return;
    setApproving(true);
    setNotice(null);
    try {
      const updated = await productContentApi().approve(product.id, accessToken, server.contentRevision);
      setServer(updated);
      setNotice({ kind: "success", text: `نگارش ${fa(updated.contentRevision)} تأیید شد.` });
      try {
        await onChanged();
      } catch {
        setNotice({ kind: "info", text: "تأیید ثبت شد، اما فهرست محصولات به‌روز نشد؛ صفحه را دوباره دریافت کنید." });
      }
    } catch (error) {
      const status = error instanceof ProductContentApiError ? error.status : 0;
      const code = error instanceof ProductContentApiError ? error.code : "";
      if (status === 409) {
        setConflicted(true);
        setNotice({ kind: "conflict", text: "تأیید انجام نشد چون نسخهٔ سرور عوض شده است. پیش‌نویس شما حفظ شده؛ ابتدا نسخهٔ تازه را دریافت و بازبینی کنید." });
      } else {
        setNotice({ kind: "error", text: productContentErrorMessage(status, code) });
      }
    } finally {
      setApproving(false);
    }
  };

  const resetDraft = () => {
    if (server) setDraft(contentDraftFromServer(server));
    setConfirmDiscard(false);
    setNotice(null);
  };

  const body = <>
      <header className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <h2 id="product-content-editor-title" className="font-bold">
            محتوای محصول
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">{product.title}</p>
        </div>
        {!embedded && <button type="button" disabled={busy} onClick={requestClose} className={secondary} aria-label="بستن ویرایشگر محتوا">
          <X size={18} />
        </button>}
      </header>
      <div className="space-y-5 p-4 sm:p-5">
        {loadState === "loading" && (
          <p role="status" className="text-sm text-muted-foreground">
            در حال دریافت محتوای ذخیره‌شده…
          </p>
        )}
        {loadState === "error" && (
          <div className="space-y-3">
            {notice && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800">
                {notice.text}
              </p>
            )}
            <button type="button" onClick={() => void load(false)} className={secondary}>
              <RefreshCw size={16} />
              تلاش دوباره
            </button>
          </div>
        )}
        {loadState === "ready" && server && (
          <>
            <section aria-label="وضعیت محتوا" className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass[server.status]}`}>{CONTENT_STATUS_LABEL[server.status]}</span>
              <span className="text-xs tabular-nums text-muted-foreground">نگارش {fa(server.contentRevision)}</span>
              {server.status === "APPROVED" && server.approvedContentRevision !== null && (
                <span className="text-xs text-muted-foreground">تأییدشده در نگارش {fa(server.approvedContentRevision)}</span>
              )}
              {dirty && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  ذخیره نشده
                </span>
              )}
            </section>
            {server.status === "LEGACY_UNREVIEWED" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                این محصول محتوای قدیمیِ بررسی‌نشده دارد. با اولین ویرایش وارد چرخه مدیریت می‌شود و محتوای عمومی تا تأیید صریح پنهان می‌ماند.
              </p>
            )}
            <p className="rounded-xl bg-secondary/40 p-3 text-xs leading-6 text-muted-foreground">{contentVisibilityNote(server.status)}</p>
            {CONTENT_SECTIONS.filter((section) => section.id !== "source").map((section) => (
              <section key={section.id} aria-label={section.title} className="space-y-3 rounded-xl border border-border p-3">
                <h3 className="text-sm font-bold">{section.title}</h3>
                {CONTENT_FIELD_DEFS.filter((def) => def.section === section.id).map((def) => (
                  <FieldInput key={def.key} fieldKey={def.key} draft={draft} disabled={busy} onChange={setField} />
                ))}
              </section>
            ))}
            <section aria-label="هـ — منبع محتوا و تأیید" className="space-y-3 rounded-xl border border-border p-3">
              <h3 className="text-sm font-bold">هـ — منبع محتوا و تأیید</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="product-content-sourceKind" className="mb-1 block text-xs font-bold text-muted-foreground">
                    نوع منبع
                  </label>
                  <select
                    id="product-content-sourceKind"
                    disabled={busy}
                    value={draft.sourceKind}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, sourceKind: event.target.value as ContentDraft["sourceKind"] }));
                      setConfirmDiscard(false);
                    }}
                    className={input}
                  >
                    <option value="">بدون منبع (پاک‌سازی)</option>
                    {SOURCE_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="product-content-sourceReference" className="mb-1 block text-xs font-bold text-muted-foreground">
                    مرجع منبع
                  </label>
                  <input
                    id="product-content-sourceReference"
                    maxLength={1000}
                    disabled={busy}
                    value={draft.sourceReference}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, sourceReference: event.target.value }));
                      setConfirmDiscard(false);
                    }}
                    placeholder="مثلاً کاتالوگ ۱۴۰۴، صفحه ۱۲"
                    className={input}
                    aria-describedby="product-content-source-help"
                  />
                </div>
              </div>
              <p id="product-content-source-help" className="text-[11px] leading-5 text-muted-foreground">
                منبع باید مشخص کند چه سندی بررسی شده؛ چیزی آپلود یا fetch نمی‌شود و نباید راز یا داده بیمار داشته باشد. پاک‌سازی منبع، تأیید را باطل می‌کند.
              </p>
              {draftProvenance(draft) === null && (draft.sourceKind !== "" || draft.sourceReference.trim() !== "") && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-800">
                  منبع ناقص است: نوع و مرجع باید هر دو کامل باشند، وگرنه ذخیره انجام نمی‌شود.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button type="button" disabled={busy || conflicted || !dirty} onClick={() => void save()} className={primary}>
                  {saving ? "در حال ذخیره…" : "ذخیره محتوا"}
                </button>
                {server.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <Check size={14} />
                    نگارش جاری تأیید شده است
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={conflicted || !canApproveContent(server.status, dirty, busy, draft)}
                    onClick={() => void approve()}
                    className={secondary}
                    title={dirty ? "اول تغییرها را ذخیره کنید" : undefined}
                  >
                    {approving ? "در حال تأیید…" : "تأیید نگارش ذخیره‌شده"}
                  </button>
                )}
                {dirty && (
                  <button type="button" disabled={busy} onClick={resetDraft} className="text-xs font-bold text-muted-foreground hover:underline">
                    انصراف از تغییرها
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                ذخیره و تأیید دو عمل جدا هستند؛ تأیید هرگز خودکار انجام نمی‌شود و فقط نگارش ذخیره‌شدهٔ فعلی را شامل می‌شود.
              </p>
            </section>
            {notice && (
              <p
                role={notice.kind === "success" ? "status" : "alert"}
                className={`rounded-xl p-3 text-sm leading-6 ${
                  notice.kind === "success" ? "bg-emerald-50 text-emerald-800" : notice.kind === "conflict" ? "bg-amber-50 text-amber-950" : notice.kind === "info" ? "bg-secondary/60 text-foreground" : "bg-red-50 text-red-800"
                }`}
              >
                {notice.text}
              </p>
            )}
            {conflicted && (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-950">برای رفع تعارض، نسخهٔ سرور را دریافت کنید. پیش‌نویس فعلی فقط با تأیید شما جایگزین می‌شود؛ پیش از ادامه، تغییرهای لازم را برای خود نگه دارید.</p>
                {confirmReload ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void reloadAfterConflict()} className={secondary}>
                      {reloading ? "در حال دریافت…" : "جایگزینی پیش‌نویس با نسخهٔ سرور"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setConfirmReload(false)} className={secondary}>حفظ پیش‌نویس</button>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirmReload(true)} className={secondary}>دریافت نسخهٔ تازه</button>
                )}
              </div>
            )}
            {confirmDiscard && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" role="alert">
                <p className="text-sm font-bold text-amber-950">تغییرهای ذخیره‌نشده از بین می‌رود. مطمئن هستید؟</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={onClose} className={secondary}>
                    بستن بدون ذخیره
                  </button>
                  <button type="button" onClick={() => setConfirmDiscard(false)} className={primary}>
                    ادامه ویرایش
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  </>;
  if (embedded) return <section aria-label="محتوا و جزئیات محصول">{body}</section>;
  return (
    <dialog
      ref={dialog}
      dir="rtl"
      aria-labelledby="product-content-editor-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]") ?? [],
        ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      {body}
    </dialog>
  );
}

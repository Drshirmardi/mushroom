"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TabId } from "@/lib/types";

/**
 * Screen registry: maps the app's logical screen names to their routes.
 * `useScreenNavigation()` resolves names → URLs, keeping call sites stable
 * while routes evolve.
 *
 * Route templates use `:param` tokens filled from the passed params.
 */

/** Root screen of each tab. */
export const TAB_ROOT_SCREENS: Record<TabId, string> = {
  home: "HomeMain",
  storemain: "StoreMain",
  assessment: "AssessmentHub",
  treatment: "TreatmentMain",
  profile: "ProfileMain",
  appointments: "AppointmentList",
};

/** Filled in as screens migrate to real routes. */
export const SCREEN_ROUTES: Record<string, string> = {
  HomeMain: "/",
  NotificationCenter: "/notifications",
  ArticlesList: "/articles",
  ArticleDetail: "/articles/:title",
  PainTracker: "/trackers/pain",
  MoodTracker: "/trackers/mood",
  ChatScreen: "/chat",
  StoreMain: "/store",
  ProductDetail: "/store/products/:productId",
  CartScreen: "/store/cart",
  CheckoutScreen: "/store/checkout",
  PaymentScreen: "/store/payment",
  OrderSuccess: "/store/order-success",
  OrderTracking: "/store/order-tracking",
  OrderHistory: "/store/orders",
  WishlistScreen: "/store/wishlist",
  AppointmentList: "/appointments",
  AppointmentDetail: "/appointments/:aptId",
  DoctorProfile: "/doctors/:doctorId",
  BookStep1: "/appointments/book",
  BookStep2: "/appointments/book/schedule",
  BookStep3: "/appointments/book/confirm",
  BookPayment: "/appointments/book/pay",
  BookSuccess: "/appointments/book/success",
  OnlineWaitingRoom: "/appointments/waiting-room",
  ConsultationSummary: "/appointments/summary",
  TreatmentMain: "/treatment",
  MedicationDetail: "/treatment/meds/:medId",
  SessionDetail: "/treatment/sessions",
  ExerciseDetail: "/treatment/exercises",
  ProgressReport: "/treatment/progress",
  AssessmentHub: "/assessment",
  AssessmentWizard: "/assessment/:type",
  AssessmentResult: "/assessment/result",
  AssessmentResume: "/assessment/resume",
  CoupleAssessments: "/assessment/couples",
  Programs: "/programs",
  BillingPayment: "/profile/wallet/pay",
  MezajDetail: "/mezaj",
  ProfileMain: "/profile",
  EditProfile: "/profile/edit",
  MedicalProfile: "/profile/medical",
  SecurityScreen: "/profile/security",
  NotifSettings: "/profile/notifications",
  WalletScreen: "/profile/wallet",
  WalletPaymentResult: "/profile/wallet/payment-result",
  MedicalHistory: "/profile/history",
  HealthRecord: "/profile/health-record",
};

/**
 * Resolve a legacy screen name (+params) to a real route, or null if unknown.
 */
export function screenToHref(
  name: string,
  params?: Record<string, any>
): string | null {
  const template = SCREEN_ROUTES[name];
  if (!template) return null;

  const unused: Record<string, string> = {};
  let href = template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params?.[key];
    if (value === undefined) return "";
    return encodeURIComponent(String(value));
  });
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (!template.includes(`:${key}`) && value !== undefined) {
        unused[key] = String(value);
      }
    }
  }
  const query = new URLSearchParams(unused).toString();
  return query ? `${href}?${query}` : href;
}

/**
 * Navigate by legacy screen name: resolves to the real route of that screen
 * (falls back to home if the name is unknown).
 */
export function useScreenNavigation() {
  const router = useRouter();
  return useCallback(
    (name: string, params?: Record<string, any>) => {
      router.push(screenToHref(name, params) ?? "/");
    },
    [router]
  );
}

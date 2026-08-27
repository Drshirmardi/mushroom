import { createApiClient } from "@sabz-zendegi/api-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AssessmentRequestError, getAssessmentResult, getAssessmentSubmission, getBookingEligibility,
  listPublishedAssessments, saveAssessmentAnswers, startAssessment, submitAssessment,
} from "./assessment-api";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: createApiClient({ baseUrl: "https://api.example.test", fetch: fetchMock }) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const submission = { id: "00000000-0000-4000-8000-000000000002", assessmentVersionId: "00000000-0000-4000-8000-000000000001", attemptNumber: 1, state: "IN_PROGRESS", answers: {}, resultSnapshot: null, score: null, startedAt: "2026-08-27T00:00:00.000Z", completedAt: null } as const;

describe("patient assessment API", () => {
  beforeEach(() => fetchMock.mockReset());

  it("lists, starts, resumes, saves, and reads the stored result with bearer auth", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ items: [] }))
      .mockResolvedValueOnce(json(submission, 201))
      .mockResolvedValueOnce(json(submission))
      .mockResolvedValueOnce(json({ ...submission, answers: { q1: "a" } }))
      .mockResolvedValueOnce(json({ ...submission, state: "COMPLETE", score: "2" }));
    await listPublishedAssessments("token");
    await startAssessment("token", submission.assessmentVersionId);
    await getAssessmentSubmission("token", submission.id);
    await saveAssessmentAnswers("token", submission.id, { answers: { q1: "a" } });
    await getAssessmentResult("token", submission.id);
    const requests = fetchMock.mock.calls.map(([request]) => request as Request);
    expect(requests.every((request) => request.headers.get("authorization") === "Bearer token")).toBe(true);
    await expect(requests[3].json()).resolves.toEqual({ answers: { q1: "a" } });
  });

  it("submits with the caller's stable idempotency key", async () => {
    fetchMock.mockResolvedValue(json({ ...submission, state: "COMPLETE" }));
    await submitAssessment("token", submission.id, "stable-completion-key");
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get("idempotency-key")).toBe("stable-completion-key");
  });

  it("loads the server eligibility decision without a client-side score", async () => {
    fetchMock.mockResolvedValue(json({ eligible: false, reason: "MAIN_ASSESSMENT_REQUIRED", nextAction: "COMPLETE_ASSESSMENT" }));
    await expect(getBookingEligibility("token")).resolves.toEqual({ eligible: false, reason: "MAIN_ASSESSMENT_REQUIRED", nextAction: "COMPLETE_ASSESSMENT" });
  });

  it("preserves API codes and unavailable failures", async () => {
    fetchMock.mockResolvedValueOnce(json({ code: "ASSESSMENT_ANSWERS_INVALID" }, 422));
    await expect(listPublishedAssessments("token")).rejects.toEqual(expect.objectContaining<Partial<AssessmentRequestError>>({ status: 422, code: "ASSESSMENT_ANSWERS_INVALID" }));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(listPublishedAssessments("token")).rejects.toEqual(expect.objectContaining<Partial<AssessmentRequestError>>({ status: 0 }));
  });
});

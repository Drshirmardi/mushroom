import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type CommerceCustomerCrmPage = components["schemas"]["CommerceCustomerCrmPageDto"];
export type CommerceCustomerCrmSegment = "POTENTIAL" | "ONE_TIME" | "RETURNING" | "VIP";
export type CommerceCustomerCrmSort = "NET_SPEND" | "SUCCESSFUL_PURCHASE_COUNT" | "LAST_PURCHASE_AT" | "DISPLAY_NAME";
export type CommerceCustomerCrmDirection = "ASC" | "DESC";

export type CommerceCustomerCrmQuery = {
  clinicId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  segment?: CommerceCustomerCrmSegment;
  sort?: CommerceCustomerCrmSort;
  direction?: CommerceCustomerCrmDirection;
};

export class CommerceCustomerCrmApiError extends Error {
  constructor(public readonly status: number) {
    super("Commerce customer CRM request failed.");
  }
}

export async function getCommerceCustomers(
  accessToken: string,
  query: CommerceCustomerCrmQuery,
): Promise<CommerceCustomerCrmPage> {
  try {
    const { data, response } = await withRequestTimeout(apiClient.GET("/v1/admin/commerce/customers", {
      headers: { authorization: `Bearer ${accessToken}` },
      params: { query },
    }));
    if (!response.ok || !data) throw new CommerceCustomerCrmApiError(response.status);
    return data;
  } catch (error) {
    if (error instanceof CommerceCustomerCrmApiError) throw error;
    throw new CommerceCustomerCrmApiError(0);
  }
}

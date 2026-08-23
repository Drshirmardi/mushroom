import type { components } from "@sabz-zendegi/api-client";

export type Authentication = components["schemas"]["AuthenticationResponseDto"];

let authentication: Authentication | null = null;

export const authSession = {
    get: () => authentication,
    set: (nextAuthentication: Authentication) => {
        authentication = nextAuthentication;
    },
    clear: () => {
        authentication = null;
    },
};

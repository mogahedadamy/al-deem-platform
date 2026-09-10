// @al-deem/api-client — واجهات مشتركة مولّدة من OpenAPI (38 paths).
// التطبيقات تستورد الأنواع مباشرة — والاستدعاءات عبر proxies الخاصة بها.
import type { components } from "./schema";

export type Schemas = components["schemas"];

// الأنواع الأكثر استخدامًا
export type Course = Schemas["Course"];
export type Category = Schemas["Category"];
export type Enrollment = Schemas["Enrollment"];
export type PaymentRequest = Schemas["PaymentRequest"];
export type Certificate = Schemas["Certificate"];
export type Profile = Schemas["Profile"];
export type ProfileWithRoles = Schemas["ProfileWithRoles"];
export type RoleKey = Schemas["RoleKey"];
export type UserPage = Schemas["UserPage"];

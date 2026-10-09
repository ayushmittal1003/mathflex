// Who on the team can open which part of the admin panel. Pure, so the sidebar can use it too.

export type StaffRole = "ADMIN" | "EDITOR" | "SUPPORT";
export type AnyRole = StaffRole | "STUDENT";

export const PERMISSIONS = {
  dashboard: "Dashboard",
  revenue: "Revenue numbers",
  content: "Chapters, parts & notes",
  questions: "Question bank",
  courses: "Courses",
  coupons: "Coupons",
  banners: "Banners & popups",
  orders: "Orders & payments",
  students: "Students",
  access: "Grant & revoke access",
  mentorship: "Mentorship calls",
  flexcare: "MathMate chatbot",
  video: "Video hosting",
  settings: "Settings & features",
  team: "Team & roles",
  audit: "Activity log",
  impersonate: "View as a student",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  ADMIN: ALL,
  EDITOR: ["dashboard", "content", "questions", "courses", "banners", "flexcare", "video"],
  SUPPORT: ["dashboard", "students", "access", "orders", "mentorship", "flexcare"],
};

export const ROLE_LABEL: Record<AnyRole, string> = { ADMIN: "Super Admin", EDITOR: "Editor", SUPPORT: "Support", STUDENT: "Student" };
export const ROLE_BLURB: Record<StaffRole, string> = {
  ADMIN: "Everything, including team, settings, revenue and impersonation.",
  EDITOR: "Builds content: chapters, videos, questions, courses and banners.",
  SUPPORT: "Helps students: accounts, access grants, orders and mentorship.",
};

export const STAFF_ROLES: StaffRole[] = ["ADMIN", "EDITOR", "SUPPORT"];
export const isStaff = (role: string | null | undefined): role is StaffRole => STAFF_ROLES.includes(role as StaffRole);
export const can = (role: string | null | undefined, p: Permission) => isStaff(role) && ROLE_PERMISSIONS[role].includes(p);

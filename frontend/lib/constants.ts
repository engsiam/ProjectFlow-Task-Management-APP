export const API_BASE_URL = "http://localhost:8000/api";
export const HEALTH_URL = "http://localhost:8000/health";
export const SWAGGER_URL = "http://localhost:8000/docs";

export const DEMO_USERS = [
  { role: "Owner", email: "owner@example.com", password: "Password123!" },
  { role: "Manager", email: "manager@example.com", password: "Password123!" },
  { role: "Member", email: "member@example.com", password: "Password123!" },
  { role: "Viewer", email: "viewer@example.com", password: "Password123!" }
];

export const STATUS_COLUMNS = [
  { key: "TODO", label: "To Do", icon: "radio_button_unchecked" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "pending" },
  { key: "REVIEW", label: "Review", icon: "rate_review" },
  { key: "DONE", label: "Done", icon: "check_circle" }
] as const;

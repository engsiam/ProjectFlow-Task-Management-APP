export const API_BASE_URL = "http://localhost:8000/api";
export const BACKEND_ORIGIN = "http://localhost:8000";
export const HEALTH_URL = "http://localhost:8000/health";
export const SWAGGER_URL = "http://localhost:8000/docs";

export const DEMO_USERS = [
  { role: "Admin", email: "admin@example.com", password: "Password123!" },
  {
    role: "Project Manager",
    email: "pm@example.com",
    password: "Password123!",
  },
  {
    role: "Team Member",
    email: "member@example.com",
    password: "Password123!",
  },
  { role: "Viewer", email: "viewer@example.com", password: "Password123!" },
];

export const STATUS_COLUMNS = [
  { key: "TODO", label: "To Do", icon: "radio_button_unchecked" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "pending" },
  { key: "REVIEW", label: "Review", icon: "rate_review" },
  { key: "DONE", label: "Done", icon: "check_circle" },
] as const;

// Public user object - never expose password or secrets.

export const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  bio: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const PUBLIC_USER_SAFE = (u: {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  name: u.name,
  avatar: u.avatar,
  bio: u.bio,
  status: u.status,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

import type { User } from "@/lib/domain/types";

export const mockUser: User = {
  id: "user-sana-khan",
  email: "sana@safar.example",
  name: "Sana Khan",
  homeCountry: "Pakistan",
  avatarUrl: null,
  authProvider: "email",
  createdAt: "2026-01-08T09:00:00.000Z",
  updatedAt: "2026-07-16T10:00:00.000Z",
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: "user-hamza-ali",
    email: "hamza@example.com",
    name: "Hamza Ali",
    homeCountry: "Pakistan",
    avatarUrl: null,
    authProvider: "email",
    createdAt: "2026-02-10T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
  },
];

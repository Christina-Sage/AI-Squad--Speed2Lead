export interface DemoUser {
  id: string;
  name: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "u-juejie", name: "JueJie Liu" },
  { id: "u-jade", name: "Jade Thomas" },
  { id: "u-christina", name: "Christina Creamore" },
  { id: "u-liban", name: "Liban Jama" },
];

export const DEMO_USER_COOKIE = "demo_user_id";

export function getDemoUser(userId: string | undefined): DemoUser {
  return DEMO_USERS.find((u) => u.id === userId) ?? DEMO_USERS[0];
}

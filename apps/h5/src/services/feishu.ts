export type FeishuUser = {
  openId: string;
  userId: string;
  name: string;
  department: string;
  roles: Array<"requester" | "reviewer" | "ops">;
};

export const mockRequesterUser: FeishuUser = {
  openId: "ou_mock_lkk_requester",
  userId: "lkk_1024",
  name: "李天赐",
  department: "LKK GTM / POSM",
  roles: ["requester"]
};

export const mockReviewerUser: FeishuUser = {
  openId: "ou_mock_james",
  userId: "lkk_james",
  name: "James Liu",
  department: "LKK Studio",
  roles: ["reviewer"]
};

export async function getCurrentFeishuUser(role: "requester" | "reviewer" = "requester"): Promise<FeishuUser> {
  return role === "reviewer" ? mockReviewerUser : mockRequesterUser;
}

export function getMockRequesterUser(): FeishuUser {
  return {
    ...mockRequesterUser,
    roles: [...mockRequesterUser.roles]
  };
}

export function canReview(user: FeishuUser | null, reviewerName: string) {
  if (!user) return false;
  return user.roles.includes("reviewer") || user.name === reviewerName;
}

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
};

export type UserLoginInfo = {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  name: string | null;
  phone: string | null;
};

export type UserRegisterPayload = {
  email: string;
  password: string;
  name: string;
  phone: string;
};

export type UserLoginPayload = {
  email: string;
  password: string;
};

const BASE = "http://localhost:8000";

export async function registerUser(
  payload: UserRegisterPayload,
): Promise<User> {
  const response = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function loginUser(
  payload: UserLoginPayload,
): Promise<UserLoginInfo> {
  const response = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

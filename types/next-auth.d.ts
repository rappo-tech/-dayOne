import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      customToken?: string; // ✅ our custom JWT token
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string;
    customToken?: string; // ✅ optional custom token
  }

  interface JWT {
    sub?: string;
    email?: string;
    name?: string;
    customToken?: string; // ✅ store token in JWT too
  }
}

// ✅ JWT Error types for better type safety
export interface JWTError extends Error {
  code?: string;
  claim?: string;
  reason?: string;
}
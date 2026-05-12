import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobile: string;
      role: "ADMIN" | "EMPLOYEE" | "CUSTOMER";
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    mobile: string;
    role: "ADMIN" | "EMPLOYEE" | "CUSTOMER";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    mobile: string;
    role: "ADMIN" | "EMPLOYEE" | "CUSTOMER";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  }
}

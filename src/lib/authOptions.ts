import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { SessionStrategy } from "next-auth"; // Import SessionStrategy type
import bcrypt from "bcrypt";
import prisma from "../../prisma/prisma"; // Adjust your import path
import { Role } from "../../types/next-auth"; // Adjust import path

import { JWT } from "next-auth/jwt"; // Import JWT type from next-auth
import { Session } from "next-auth"; // Import Session type
import { User } from "next-auth"; // Import User type


const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role as Role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy, // Ensure proper type casting
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        role: token.role as Role,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

export default authOptions;
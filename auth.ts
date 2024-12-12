import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "./lib/db";
import { User } from "./models/User";
import saltAndHashPassword from "./utils/password";

interface JWTToken {
  id?: string;
  role?: string;
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "text" },
      },
      async authorize(credentials) {
        await connectToDatabase();

        const pwHash = saltAndHashPassword(credentials?.password as string);
        const user = await User.findOne({
          email: credentials?.email,
          password: pwHash,
        });

        if (!user) {
          return null; // Return null if user not found
        }

        // Update last login if user is an annotator
        if (user.role === "annotator") {
          await User.updateOne({ _id: user._id }, { lastLogin: new Date() });
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as JWTToken).id = user.id;
        (token as JWTToken).role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = (token as JWTToken).id as string;
        (session.user as any).role = (token as JWTToken).role;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await connectToDatabase();

        // Check if the user already exists
        let existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Create new user if it doesn't exist
          const newUser = new User({
            name: user.name,
            email: user.email,
            password: saltAndHashPassword("defaultGooglePassword"), // Create a dummy password
            role: "annotator", // Default role
            phone: null,
            domain: [],
            lang: [],
            location: null,
            linkedin: null,
            resume: null,
            nda: null,
            permission: [],
            lastLogin: new Date(),
            invitation: null,
          });
          existingUser = await newUser.save();
        } else {
          // Update last login timestamp for existing user
          await User.updateOne(
            { _id: existingUser._id },
            { lastLogin: new Date() }
          );
        }

        // Inject user data for the JWT token
        user.id = existingUser._id.toString();
        user.role = existingUser.role;
      }

      return true; // Return true to proceed with login
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
  },
};

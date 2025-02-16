import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "./lib/db";
import { User } from "./models/User";
import saltAndHashPassword from "./utils/password";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

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
        token: { label: "token", type: "text" }, // For third-party token
      },
      async authorize(credentials) {
        await connectToDatabase();

        // Handle third-party token
        if (credentials?.token) {
          try {
            const ticket = await googleClient.verifyIdToken({
              idToken: credentials.token,
              audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();

            if (!payload?.email) {
              return null;
            }

            // Find or create user
            let user = await User.findOne({ email: payload.email });

            if (!user) {
              const newUser = new User({
                name: payload.name,
                email: payload.email,
                password: saltAndHashPassword("defaultGooglePassword"),
                role: "annotator",
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
              user = await newUser.save();
            } else {
              // Update last login timestamp
              await User.updateOne(
                { _id: user._id },
                { lastLogin: new Date() }
              );
            }

            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
            };
          } catch (error) {
            console.error('Token verification failed:', error);
            return null;
          }
        }

        // Regular email/password flow
        const pwHash = saltAndHashPassword(credentials?.password as string);
        const user = await User.findOne({
          email: credentials?.email,
          password: pwHash,
        });

        if (!user) {
          return null;
        }

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

        let existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          const newUser = new User({
            name: user.name,
            email: user.email,
            password: saltAndHashPassword("defaultGooglePassword"),
            role: "annotator",
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
          await User.updateOne(
            { _id: existingUser._id },
            { lastLogin: new Date() }
          );
        }

        user.id = existingUser._id.toString();
        user.role = existingUser.role;
      }

      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
  },
};
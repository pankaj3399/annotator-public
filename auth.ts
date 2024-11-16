import { AuthOptions } from "next-auth";
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from "./lib/db";
import { User } from "./models/User";
import saltAndHashPassword from "./utils/password";
// Your own logic for dealing with plaintext password strings; be careful!

interface JWTToken {
  id?: string;
  role?: string;
}

type credentials = {
  email: string;
  password: string;
}

export const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'email', type: 'text' },
        password: { label: 'password', type: 'text' },
      },
      async authorize(credentials) {
        await connectToDatabase();

        let user = null
        // logic to salt and hash password
        const pwHash = saltAndHashPassword(credentials?.password as string);

        // logic to verify if the user exists
        user = await User.findOne({ email: credentials?.email, password: pwHash });
        if (!user) {
          // No user found, so this is their first attempt to login
          // meaning this is also the place you could do registration
          // throw new Error("User not found.")
          return null
        }

        if (user.role == 'annotator') {
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
  },
  pages: {
    signIn: '/auth/login',
    // error: '/auth/error',
    newUser: '/auth/signup',
  },
};

// auth.ts
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "./lib/db";
import { User } from "./models/User";
import { Team } from "./models/Team"; // Import Team model
import { InvitedUsers } from "./models/InvitedUsers"; // Import InvitedUsers model
import saltAndHashPassword from "./utils/password";
import { auth } from "google-auth-library";
import { isAnnotator } from "./lib/userRoles";

interface JWTToken {
  id?: string;
  role?: string;
  team_id?: string; // Add team_id to JWT token
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
        if (isAnnotator(user.role)) {
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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as JWTToken).id = user.id;
        (token as JWTToken).role = (user as any).role;
        // Add team_id to token if it exists on user
        if ((user as any).team_id) {
          (token as JWTToken).team_id = (user as any).team_id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = (token as JWTToken).id as string;
        (session.user as any).role = (token as JWTToken).role;
        // Add team_id to session if it exists in token
        if ((token as JWTToken).team_id) {
          (session.user as any).team_id = (token as JWTToken).team_id;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        console.log("Google sign-in detected for:", user.email);
        await connectToDatabase();

        // Check if the user already exists
        let existingUser = await User.findOne({ email: user.email });
        let isNewUser = false;

        if (!existingUser) {
          console.log("Creating new user for Google sign-in:", user.email);
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
            team_id: null, // Initialize with no team
          });
          existingUser = await newUser.save();
          isNewUser = true;
          console.log("New user created with ID:", existingUser._id.toString());
        } else {
          console.log("Existing user found:", existingUser._id.toString());
          // Update last login timestamp for existing user
          await User.updateOne(
            { _id: existingUser._id },
            { lastLogin: new Date() }
          );
        }

        // TEAM ID HANDLING
        // Only assign team if user doesn't already have one
        if (isNewUser || !existingUser.team_id) {
          console.log("Looking for team ID to assign");
          
          let teamId = null;
          
          // Try to get team ID from cookies
          // Since we don't have direct access to cookies in the callback,
          // we'll check other sources
          
          // Try to get team ID from invitation
          const invitation = await InvitedUsers.findOne({
            email: user.email?.toLowerCase(),
            status: 'pending',
            team: { $exists: true, $ne: null }
          });
          
          if (invitation && invitation.team) {
            teamId = invitation.team.toString();
            console.log("Found team ID from invitation:", teamId);
          }
          
          // If we have a team ID, update the user and the team
          if (teamId) {
            console.log("Assigning team ID to user:", teamId);
            
            try {
              // Update user with team ID
              await User.findByIdAndUpdate(existingUser._id, { team_id: teamId });
              
              // Add user to team members
              await Team.findByIdAndUpdate(
                teamId,
                { $addToSet: { members: existingUser._id } }
              );
              
              // Make sure to include team_id in the user object for token
              (user as any).team_id = teamId;
              
              console.log("Team assignment completed successfully");
            } catch (error) {
              console.error("Error assigning team:", error);
            }
          }
        } else if (existingUser.team_id) {
          // Make sure to include existing team_id in the user object for token
          (user as any).team_id = existingUser.team_id.toString();
          console.log("User already has team assigned:", (user as any).team_id);
        }

        // Process pending invitations
        console.log("Checking for pending invitations for:", user.email);
        const pendingInvitations = await InvitedUsers.find({
          email: user.email?.toLowerCase(),
          status: 'pending'
        });

        if (pendingInvitations.length > 0) {
          console.log("Found pending invitations:", pendingInvitations.length);
          
          // Update all pending invitations to accepted
          await InvitedUsers.updateMany(
            { _id: { $in: pendingInvitations.map(inv => inv._id) } },
            { 
              status: 'accepted',
              acceptedBy: existingUser._id,
              updated_at: new Date()
            }
          );
          console.log("Updated invitations to accepted status");
        }

        // Inject user data for the JWT token
        user.id = existingUser._id.toString();
        (user as any).role = existingUser.role;
        // team_id already set above if needed
      }

      return true; // Return true to proceed with login
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
  },
};
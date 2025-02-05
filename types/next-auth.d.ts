import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      name: string;
      email: string;
    };
  }

  interface JWT {
    id: string;
    role: string;
  }
}

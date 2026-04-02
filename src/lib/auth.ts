import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      passwordChangeRequired?: boolean;
    };
  }

  interface User {
    role: string;
    passwordChangeRequired?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    passwordChangeRequired?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { clientProfile: true, trainer: true }
          });

          if (!user || !user.password) {
            // Log failed login — user not found
            await prisma.loginEvent.create({
              data: { email: normalizedEmail, success: false, reason: 'user_not_found' }
            }).catch(() => {});
            return null;
          }

          if (!user.isActive) {
            await prisma.loginEvent.create({
              data: { email: normalizedEmail, userId: user.id, success: false, reason: 'account_disabled' }
            }).catch(() => {});
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            await prisma.loginEvent.create({
              data: { email: normalizedEmail, userId: user.id, success: false, reason: 'invalid_password' }
            }).catch(() => {});
            return null;
          }

          // Successful login
          await Promise.all([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date(), loginCount: { increment: 1 } }
            }),
            prisma.loginEvent.create({
              data: { email: normalizedEmail, userId: user.id, success: true, reason: 'success' }
            })
          ]).catch(() => {});

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            passwordChangeRequired: user.passwordChangeRequired || false,
          };
        } catch (error) {
          console.error('Database error during auth:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.sub = user.id; // Ensure token.sub matches the actual user ID
        token.role = user.role;
        token.passwordChangeRequired = user.passwordChangeRequired;
      }
      
      // Handle token refresh
      if (trigger === 'update' && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, passwordChangeRequired: true }
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.passwordChangeRequired = dbUser.passwordChangeRequired;
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!; // This should now be the correct user ID
        session.user.passwordChangeRequired = token.passwordChangeRequired;
        
        // Always fetch the latest role from database to handle role changes
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub! },
            select: { role: true, passwordChangeRequired: true, name: true }
          });
          
          if (user) {
            session.user.role = user.role;
            session.user.passwordChangeRequired = user.passwordChangeRequired;
            session.user.name = user.name;
          } else {
            // User not found in database - invalid session
            console.warn('Session user not found in database:', token.sub);
            session.user.role = token.role || 'CLIENT';
          }
        } catch (error) {
          console.error('Error fetching user role during session:', error);
          session.user.role = token.role || 'CLIENT';
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin'
  },
  debug: process.env.NODE_ENV === 'development',
  events: {}
};
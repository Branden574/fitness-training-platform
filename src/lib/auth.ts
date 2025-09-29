import { NextAuthOptions } from 'next-auth';
// import { PrismaAdapter } from '@next-auth/prisma-adapter';
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
  // Enable Prisma adapter for better session persistence
  // adapter: PrismaAdapter(prisma), // Keep commented for now to avoid DB session issues
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔍 Auth attempt:', { email: credentials?.email });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        // Normalize email to lowercase for case-insensitive lookup
        const normalizedEmail = credentials.email.toLowerCase().trim();
        
        try {
          console.log('🔌 Connecting to database...');
          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail
            },
            include: {
              clientProfile: true,
              trainer: true
            }
          });

          console.log('👤 User found:', { 
            exists: !!user, 
            hasPassword: !!user?.password,
            email: user?.email,
            role: user?.role 
          });

          if (!user || !user.password) {
            console.log('❌ User not found or no password');
            return null;
          }

          // Compare password with stored hash
          console.log('🔐 Comparing password...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log('🔐 Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return null;
          }

          console.log('✅ Login successful for:', user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            passwordChangeRequired: user.passwordChangeRequired || false,
          };
        } catch (error) {
          console.error('💥 Database error during auth:', error);
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
        secure: false, // Set to true in production with HTTPS
        maxAge: 30 * 24 * 60 * 60 // 30 days
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false,
        maxAge: 30 * 24 * 60 * 60
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
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
  events: {
    async signOut(message) {
      console.log('🚪 User signed out:', message);
    },
    async session(message) {
      // console.log('👤 Session accessed:', { userId: message.session.user.id, role: message.session.user.role }); // Reduced logging for development
    }
  }
};
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SignJWT, jwtVerify } from "jose";

export const authOptions: AuthOptions = {

  providers: [
    // ✅ Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "select_account consent",// ✅ Always show Google account chooser with consent
          access_type: "offline",        // Optional: for refresh token
          response_type: "code",         // Recommended for OAuth 2.0
        },
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.customToken = user.customToken;

        // ✅ If Google login, still generate a custom JWT
        if (account?.provider === "google") {
          token.customToken = await new SignJWT({
            id: token.sub,
            email: token.email,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("12h")  // ✅ Changed from 1h to 12h
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        }
      } else {
        // ✅ Subsequent requests - check if token needs refresh
        try {
          if (token.customToken) {
            await jwtVerify(
              token.customToken as string, 
              new TextEncoder().encode(process.env.JWT_SECRET)
            );
          }
        } catch (error) {
//added this--- if token expired 
//Token expired or invalid - create new one
          const jwtError = error as { code?: string; message?: string };
          console.log('🔄 Refreshing token due to error:', jwtError.code || jwtError.message);
          token.customToken = await new SignJWT({
            id: token.sub,
            email: token.email,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string;
        session.user.customToken = token.customToken as string;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,

};
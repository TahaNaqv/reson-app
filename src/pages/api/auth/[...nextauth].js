import axios from "axios";
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { use } from "react";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      type: 'credentials',
      async authorize(credentials, req) {
        try {
          // Log environment variables for debugging (remove in production)
          console.log('LOGIN_API:', process.env.LOGIN_API);
          console.log('GET_COMPANY_DATA:', process.env.GET_COMPANY_DATA);

          var myHeaders = new Headers();
          myHeaders.append("Content-Type", "application/json");

          var raw = JSON.stringify({
            "email": credentials.email,
            "password": credentials.password
          });
          console.log('Login attempt for:', credentials.email);

          var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw
          };

          const res = await fetch(process.env.LOGIN_API, requestOptions);

          // Check if the response is OK
          if (!res.ok) {
            console.error('Login API error:', res.status, res.statusText);
            const errorText = await res.text();
            console.error('Error response:', errorText);
            return null;
          }

          const user = await res.json();
          console.log('Login response status:', user.status);

          if (user.status === 'true') {
            let compId = 0;

            // Only fetch company data if GET_COMPANY_DATA is set
            if (process.env.GET_COMPANY_DATA) {
              try {
                // Ensure there's a / between the base URL and user_id
                const baseUrl = process.env.GET_COMPANY_DATA.endsWith('/')
                  ? process.env.GET_COMPANY_DATA
                  : process.env.GET_COMPANY_DATA + '/';
                const apiUrl = baseUrl + user.user.user_id;
                console.log('Fetching company data from:', apiUrl);
                const getCompanyID = await axios.get(apiUrl);
                console.log('Company API response status:', getCompanyID.status);

                if (getCompanyID.status == 200) {
                  // getCompanyID.data is already the data, not a promise - remove await
                  const companyData = getCompanyID.data;
                  console.log('Company data received:', JSON.stringify(companyData));

                  if (companyData && typeof companyData === 'object') {
                    compId = companyData.company_id || 0;
                    console.log('Extracted company_id:', compId);
                  } else {
                    console.log('Company data is null or not an object');
                  }
                } else {
                  console.warn('Company API returned non-200 status:', getCompanyID.status);
                }
              } catch (error) {
                console.error('Error fetching company data:', error.message);
                if (error.response) {
                  console.error('Error response status:', error.response.status);
                  console.error('Error response data:', error.response.data);
                }
                if (error.request) {
                  console.error('No response received. Request:', error.request);
                }
                // Continue with compId = 0 if company fetch fails
              }
            } else {
              console.warn('GET_COMPANY_DATA environment variable is not set');
            }

            const usr = {
              "user_id": user.user.user_id,
              "company_id": compId,
              "user_name": user.user.user_name,
              "user_email": user.user.user_email_address
            }

            console.log('Final user object being returned:', JSON.stringify(usr));
            return usr;
          } else {
            console.log('Login failed - status is not true');
            return null;
          }
        } catch (error) {
          console.error('Authentication error:', error);
          console.error('Error details:', error.message);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ user, account, token, trigger, session }) {
      //   update token if user is returned
      // console.log('jwt', user);
      if (user) {
        token.user = user;
        // console.log('token user ' + JSON.stringify(token.user))
      }

      // update the trigger to include patient_id
      if (trigger === 'update') {
        token.user = session.user
      }
      //   return final_token
      return token;
    },
    async session({ session, token, user }) {
      //  update session from token
      // console.log('session', session);
      session.user = token.user; // you can add the properties you want instead of overwriting the session.user
      // console.log( 'Session user ' + JSON.stringify(session.user) )
      return session;
    },
  },
  pages: {
    signIn: '/login'
  }
}

export default NextAuth(authOptions)
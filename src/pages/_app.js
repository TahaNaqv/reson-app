import React, { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react"
import { ToastContainer } from 'react-toastify'
import '@/styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'

import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  style: 'normal',
  subsets: ['latin'],
  display: 'swap'
})

export default function App({ Component, pageProps: { session, ...pageProps } }) {
//   useEffect(() => {
//     import("bootstrap/dist/js/bootstrap.bundle.min");
// }, []);
  return (
    <>
      <style jsx global>{`
        body {
          font-family: ${roboto.style.fontFamily};
        }
      `}</style>
      <SessionProvider session={session}> 
        <ToastContainer limit={3} pauseOnFocusLoss={false} autoClose={2000} newestOnTop theme='colored'/>
        <Component {...pageProps} />
      </SessionProvider>
    </>
  )
}
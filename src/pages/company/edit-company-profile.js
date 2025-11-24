import { React, useState, useEffect } from 'react';
import Head from 'next/head'
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';
import EditCompanyProfile from '@/Components/CompanyProfile/EditCompanyProfile';

export default function EditCP() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    if (status === "loading") {
      return <PageLoader/>
    }

    if(session.user.user_id === null || session.user.user_id === '') {
      router.push('/register');
    }

    return(
        <>
            {/* Header bar */}
            <HeaderBar />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Edit Your Company Profile</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        </p>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-50 mt-4 mb-4'></div>
                    </div>
                </div>
            </div>
            <EditCompanyProfile />
        </>
    );
}
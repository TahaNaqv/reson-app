import { React, useState, useEffect } from 'react';
import Head from 'next/head'
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';

export default function CheckCompanyStatus() {
    const router = useRouter();
    const isSSR = typeof window === 'undefined';
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyID, setCompanyID] = useState('');

  const fetchCompanyData = async () => {
        try {
            const usrID = document.getElementById('logged_in_user').value;
            const response = await axios.get('/reson-api/company/user/' + usrID);
            setCompanyID(response.data.company_id)
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    if (status === "loading") {
      return <PageLoader/>
    }

    if(session.user.user_id === null || session.user.user_id === '') {
      router.push('/register');
    }
      

    return(
        <>
        </>
    );
}
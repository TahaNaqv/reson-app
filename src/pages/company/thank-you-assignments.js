import { React, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function ThankYou() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [s3VideoUrl, setS3VideoUrl] = useState('');

    useEffect(() => {
        if(session){
        }
    }, [session])

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
            <div className='row mb-5 mt-5'>
                <div className='col-12 top-content-box mt-5 text-center'>
                    <div className='checkMark d-inline-block'>
                        <Image src={'/images/check.svg'} alt='check' width={38} height={25} />
                    </div>
                    <h1 className='text-center mt-5 mb-2 body-heading'>Thank you for recording the questions</h1>
                </div>
            </div>
        </div>
        <div className='container'>
            <div className='row mt-3'>
                <div className='col-12 col-sm-2'></div>
                <div className='col-12 col-sm-8 text-center'>
                    <Link href='/company/dashboard' className='profile-btn'>Go to Dashboard</Link>
                </div>
                <div className='col-12 col-sm-2'></div>
            </div>
        </div>
        </>
    );
}
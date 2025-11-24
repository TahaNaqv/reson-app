import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link'
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function CandidateResultPage() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [jobData, setJobData] = useState([]);
    const [s3FileUrl, setS3FileUrl] = useState('');

    const fetchCompanyData = async () => {
        try {
            const user_id = session.user.user_id;
            const response = await axios.get(`/reson-api/company/user/${user_id}`);
            // console.log(response.data)
            setCompanyData(response.data);

            const s3key = response.data.company_logo_key;
            const s3folder = response.data.company_s3folder;

            const res2 = await fetch(
                `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
            )

            const { durl, dkey } = await res2.json()

            const fetchS3Url = await fetch(durl, {
                method: 'GET'
            })

            setS3FileUrl(fetchS3Url.url);
            // console.log(s3FileUrl);
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    const fetchCompanyJobs = async () => {
        try {
            const company_id = session.user.company_id;
            const jobs = await axios.get(`/reson-api/jobs/company/${company_id}`);
            setJobData(jobs.data);
            // console.log('jobData', jobData);
        } catch (error) {
            console.error('Error fetching jobs', error.message);
            
        }
    }

    useEffect(() => {
        if(session){
            if(session.user.company_id != 0) {
                fetchCompanyData()
                fetchCompanyJobs()
            } else {
                router.push('/company/create-profile')
            }
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
            <div className='container-fluid'>
                <div className='row'>
                    <div className='col-12 col-sm-3 company-details-bar'>
                        <div className='row mt-5 mb-3 align-items-center'>
                            <div className='col-12 text-center pt-sm-2'>
                                <h3 className='text-left body-heading font-Montagu'>Video Answers</h3>
                            </div>
                        </div>
                    </div>
                    <div className='col-12 col-sm-6 ps-sm-5 pe-sm-5 top-content-box'>
                        <div className='row mt-5 mb-3 align-items-center'>
                            <div className='col-12 text-center'>
                                <h1 className='text-left body-heading'>Result</h1>
                            </div>
                        </div>
                    </div>
                    <div className='col-12 col-sm-3 company-details-bar'>
                        <div className='row mt-5 mb-3 align-items-center'>
                            <div className='col-12 text-center pt-sm-2'>
                                <h3 className='text-left body-heading font-Montagu'>Analysis</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
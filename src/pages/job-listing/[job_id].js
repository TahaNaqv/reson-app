import { React, useState, useEffect } from 'react';
import Head from 'next/head'
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import Header from '@/Components/CandidateHeader/header';
import ViewJobListing from '@/Components/Candidate/viewJobListing';

export default function JobListing(props) {
    const router = useRouter();
    const [jobDetails, setJobDetails] = useState('');
    const { job_id } = router.query;
    useEffect(() => {
        if (job_id) {
            axios.get(`/reson-api/jobs/${job_id}`) // Assuming the endpoint to fetch job details is /api/jobs/:jobId
                .then(response => {
                    setJobDetails(response.data);
                    // console.log(response.data)
                    // Inside ViewJobListing component
                    localStorage.setItem('jobDetails', JSON.stringify({ job_id }));
                })
                .catch(error => {
                    console.error('Error fetching job details:', error);
                    // Handle error
                });
        }
// console.log(localStorage);

    }, [job_id]);

    if (!jobDetails) {
        return <PageLoader />;
    }
      

    return(
        <>
            {/* Header bar */}
            {/* <HeaderBar /> */}
            <Header />
            <div className='container'>
                <div className='row mt-4 mb-5'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Job Vacancy</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Thanks for your interest in our role. Find the description here and with the button below you can apply and qualify for a personal interview with our CEO.</p>
                    </div>
                </div>
            </div>
            <div className='container'>
                <div className='row'>
                    <div className='col-12 col-sm-2'></div>
                    <div className='col-12 col-sm-8'><ViewJobListing jobDetails={jobDetails}/></div>
                    <div className='col-12 col-sm-2'></div>
                </div>
            </div>
        </>
    );
}
import { React, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useParams } from 'next/navigation'
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';
import Link from 'next/link';

export default function ViewJobAsRecruiter() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
            router.push('/login');
        },
    });

    const params = useParams()
    const [jobData, setJobData] = useState('');
    const [companyData, setCompanyData] = useState('');
    const [s3FileUrl, setS3FileUrl] = useState('');
    const logoImgRef = useRef(null);

    const fetchJobData = async () => {
        try {
            const response = await axios.get(`/reson-api/jobs/${params.jobId}`);
            setJobData(response.data);

        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    const fetchCompanyData = async () => {
        try {
            const response = await axios.get(`/reson-api/company/${session.user.company_id}`);
            setCompanyData(response.data);

            const s3key = response.data.company_logo_key;
            const s3folder = response.data.company_s3folder;

            const res2 = await fetch(
                `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
            )

            const { durl, dkey } = await res2.json()

            setS3FileUrl(durl);
            // console.log(s3FileUrl);

        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    useEffect(() => {
        if (session) {
            fetchCompanyData()
            if (params.jobId) {
                fetchJobData()
            } else {
                router.push('/company/post-job-vacancy')
            }
        }
    }, [session])

    // Set src directly on img element to bypass React's HTML encoding
    useEffect(() => {
        if (s3FileUrl && logoImgRef.current) {
            logoImgRef.current.src = s3FileUrl;
        }
    }, [s3FileUrl])

    if (status === "loading") {
        return <PageLoader />
    }

    if (session.user.user_id === null || session.user.user_id === '') {
        router.push('/register');
    }


    return (
        <>
            {/* Header bar */}
            <HeaderBar />
            <div className='container'>
                <div className='row mt-5 mb-4'>
                    <div className='col-sm-2'></div>
                    {jobData && (
                        <div className='col-12 col-sm-8'>
                            <div className=' d-flex justify-content-between align-items-center'>
                                {/* <div className=''></div> */}

                                <div className='col-sm-8'>
                                    <div className='row'>
                                        <div className='col-sm-3 text-end'>
                                            {s3FileUrl && (
                                                <img
                                                    ref={logoImgRef}
                                                    width={120}
                                                    height={100}
                                                    alt="Company Logo"
                                                    className='companyLogo'
                                                    onError={(e) => {
                                                        console.error('Image failed to load. URL:', s3FileUrl);
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className='col-sm-9'>
                                            <h2 className='company-name'>{companyData.company_name}</h2>
                                            <div className='company-details mt-2 mb-1'>
                                                <p>{companyData.company_country}</p>
                                                <p>{companyData.company_email_address}</p>
                                                <p>{companyData.company_website}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* <div className='col-12 col-sm-4 text-end'>
                                <Link href={'/candidate/candidate-profile'} className='profile-btn'>View Company profile</Link>
                            </div> */}
                            </div>
                            <div className='row'>
                                <div className='col-12 line-divider mt-3 mb-5'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-6'>
                                    <p><strong>Job Role : </strong> {jobData.job_title}</p>
                                </div>
                                <div className='col-12 col-sm-6'>
                                    <p><strong>Job Category : </strong> {jobData.job_category}</p>
                                </div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12'>
                                    <p><strong>Job Offerings : </strong> {jobData.job_offerings}</p>
                                </div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12'>
                                    <p><strong>Job Description : </strong> {jobData.job_description}</p>
                                </div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12'>
                                    <p><strong>Job Requirments : </strong> {jobData.job_requirements}</p>
                                </div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12'>
                                    <p><strong>Job Qualificaiton : </strong> {jobData.job_qualification}</p>
                                </div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12'>
                                    <p><strong>Your expected engagement : </strong> </p>
                                    <ul className='list'>
                                        <li>Starting date : flexible</li>
                                        <li>Work location : {jobData.job_work_location}</li>
                                    </ul>
                                </div>
                            </div>
                            <div className='row mt-3 mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-4 text-end'>
                                    <Link href={`/company/jobs/edit/${params.jobId}`} className='profile-btn'>Edit Job</Link>
                                </div>
                                <div className='col-12 col-sm-4'>
                                    <Link href={'/company/dashboard'} className='profile-btn'>Go to Dashboard</Link>
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                        </div>
                    )}
                    <div className='col-sm-2'></div>
                </div>
            </div>
        </>
    );
}
import { React, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link'
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function CompanyDashboard() {
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
    const logoImgRef = useRef(null);

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

            setS3FileUrl(durl);
            // console.log(s3FileUrl);
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    const fetchCompanyJobs = async () => {
        try {
            const arr = [];
            const company_id = session.user.company_id;
            const jobs = await axios.get(`/reson-api/jobs/company/${company_id}`);
            (async () => {
                const arr = []; // Make sure arr is defined outside of the loop
            
                for (const obj of jobs.data) {
                    const jobId = obj.job_id;
                    try {
                        const response = await fetch(`/reson-api/job_result/job/${jobId}`);
                        const result = await response.json();
                        let jID, applications;
                        if(result.length !== undefined && result.length > 0) {
                            jID = result[0].job_id;
                            applications = result.length;
                        } else {
                            jID = jobId;
                            applications = 0;
                        }
                        // The 'applicants' object creation did not seem to be used, so it has been omitted.
                        
                        // Now we simply add the applications count to the object
                        arr.push({...obj, applicants: applications});
                    } catch (error) {
                        console.error('Fetch failed for job_id:', jobId, error);
                        // Handle the error appropriately
                        arr.push({...obj, applicants: 0});
                    }
                }
            
                setJobData(arr); // Now setJobData is called after all fetches have completed
            })();
            // console.log('jobData', arr);
            // fetchJobApplications()
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

    // Set src directly on img element to bypass React's HTML encoding
    useEffect(() => {
        if (s3FileUrl && logoImgRef.current) {
            logoImgRef.current.src = s3FileUrl;
        }
    }, [s3FileUrl])

    const copyJobLink = (e) => {
        let url = e.target.innerText.slice(20)
        navigator.clipboard.writeText(url)
        toast.info('Job Link copied to clipboard')
    }
      

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
                    {companyData && (
                    <div className='col-12 col-sm-3 company-details-bar text-center'>
                        <div className='pt-sm-5 pe-sm-3 ps-sm-3 pb-sm-2'>
                            {s3FileUrl && (
                                <img 
                                    ref={logoImgRef}
                                    width={300} 
                                    height={128} 
                                    alt="Company Logo" 
                                    className='companyLogo'
                                    onError={(e) => {
                                        console.error('Image failed to load. URL:', s3FileUrl);
                                    }}
                                />
                            )}
                        </div>
                        <div className='pe-2 ps-2 pt-4 pb-1'>
                            <h2 className='company-name text-center'>{companyData.company_name}</h2>
                        </div>
                        <div className='pe-2 ps-2 pt-1 pb-4 text-center company-details'>
                            <p>{companyData.company_address}</p>
                            <p>{companyData.company_email_address}</p>
                            <p>{companyData.company_website}</p>
                        </div>
                        <div className='text-center pe-2 ps-2 pt-2 pb-2'>
                            <Link href='/company/record-welcome-message' className='profile-btn position-relative d-block'>
                                <Image src={'/icons/record.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                Record Welcome Message
                            </Link>
                        </div>
                        <div className='text-center pe-2 ps-2 pt-2 pb-2'>
                            <Link href='/company/welcome-message' className='profile-btn position-relative d-block'>
                                <Image src={'/icons/present.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                View Welcome Message
                            </Link>
                        </div>
                        <div className='text-center pe-2 ps-2 pt-2 pb-2'>
                            <Link href='/company/company-profile' className='profile-btn position-relative d-block'>
                                <Image src={'/icons/profile.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                View Company Profile
                            </Link>
                        </div>
                        <div className='text-center pe-2 ps-2 pt-2 pb-2'>
                            <Link href='/company/edit-company-profile' className='profile-btn position-relative d-block'>
                                <Image src={'/icons/edit.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                Edit Company Profile
                            </Link>
                        </div>
                    </div>
                    )}
                    <div className='col-12 col-sm-9 ps-sm-5 pe-sm-5 top-content-box'>
                        <div className='row mt-5 mb-3 align-items-center'>
                            <div className='col-12 col-sm-8'>
                                <h1 className='text-left body-heading'>Job Vacancies</h1>
                            </div>
                            <div className='col-12 col-sm-4 text-end'>
                                <Link href='/company/post-job-vacancy' className='profile-btn position-relative'>Add New Job Vacancy</Link>
                            </div>
                        </div>
                        <div className='row mb-5'>
                            <div className='col-12 seperator'></div>
                        </div>
                        {jobData && jobData.length > 0 ? (jobData.map((item, index) => (
                            <div className='row mb-4' key={index + 1}>
                                <div className='col-12 job-list'>
                                    <div className='row align-items-center'>
                                        <div className='col-12 col-sm-8 pe-sm-5'>
                                            <div className='row'>
                                                <div className='col-6'><p><strong>Job Role: </strong>{item.job_title}</p></div>
                                                <div className='col-6'><p><strong>Job Category: </strong>{item.job_category}</p></div>
                                            </div>
                                            <div className='row mt-1 mb-1'>
                                                <div className='col-12'><p><strong>Job Offerings: </strong>{item.job_offerings}</p></div>
                                            </div>
                                            <div className='row'>
                                                <div className='col-6'><p><strong>Upload Date: </strong>{new Date(item.created_date).toISOString().split('T')[0]}</p></div>
                                                <div className='col-6'><p><strong>No. of Applications: </strong>{item.applicants}</p></div>
                                            </div>
                                            <div className='row mt-2'>
                                                <div className='col-12'>
                                                    <p onClick={copyJobLink} className='copy-clipboard'><strong>Candidate job link:</strong> {`${process.env.NEXT_PUBLIC_SITE_URL}/job-listing/${item.job_id}`}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='col-12 col-sm-4 d-block text-center'>
                                            <Link href={`/company/jobs/record/${item.job_id}`} className='profile-btn d-block text-center mb-3 position-relative'>
                                                <Image src={'/icons/record.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                                Record Assignments
                                            </Link>
                                            <Link href={`/company/jobs/applicants/${item.job_id}`} className='profile-btn d-block text-center mb-3 position-relative'>
                                                <Image src={'/icons/applications.svg'} alt='application' width={'14'} height={'16'} className='dashboard-icons' />
                                                View Applications
                                            </Link>
                                            <Link href={`/company/jobs/edit/${item.job_id}`} className='profile-btn d-block text-center position-relative'>
                                                <Image src={'/icons/edit.svg'} alt='application' width={'16'} height={'16'} className='dashboard-icons' />
                                                Edit Job
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))) : (
                        <>
                            <div className='row'>
                                <div className='col-12'>
                                    <h3>No jobs found</h3>
                                </div>
                            </div>
                        </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
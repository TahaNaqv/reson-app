import { React, useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ViewJobListing(jobDetails) {

    const [companyData, setCompanyData] = useState('');
    const [s3FileUrl, setS3FileUrl] = useState('');
    const logoImgRef = useRef(null);
    // console.log(jobDetails)

    const fetchCompanyData = async () => {
        try {
            const response = await axios.get('/reson-api/company/' + jobDetails.jobDetails.company_id);
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
        fetchCompanyData()
    }, [])

    // Set src directly on img element to bypass React's HTML encoding
    useEffect(() => {
        if (s3FileUrl && logoImgRef.current) {
            logoImgRef.current.src = s3FileUrl;
        }
    }, [s3FileUrl]) 
      

    return(
        <>
            {companyData && (
                <div className='col-12'>
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
                            <p><strong>Job Role : </strong> {jobDetails.jobDetails.job_title}</p>
                        </div>
                        <div className='col-12 col-sm-6'>
                            <p><strong>Job Category : </strong> {jobDetails.jobDetails.job_category}</p>
                        </div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12'>
                            <p><strong>Job Offerings : </strong> {jobDetails.jobDetails.job_offerings}</p>
                        </div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12'>
                            <p><strong>Job Description : </strong> {jobDetails.jobDetails.job_description}</p>
                        </div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12'>
                            <p><strong>Job Requirments : </strong> {jobDetails.jobDetails.job_requirements}</p>
                        </div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12'>
                            <p><strong>Your expected engagement : </strong> </p>
                            <ul className='list'>
                                <li>Starting date : flexible</li>
                                <li>Work location : {jobDetails.jobDetails.job_work_location}</li>
                            </ul>
                        </div>
                    </div>
                    <div className='row mt-3 mb-5'>
                        <div className='col-12 col-sm-5'></div>
                        <div className='col-12 col-sm-4'>
                            <Link href={'/candidate/candidate-email'} className='profile-btn'>Apply for job</Link>
                        </div>
                        <div className='col-12 col-sm-4'></div>
                    </div>
                </div>
            )}
        </>
    );
}
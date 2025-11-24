import { React, useState, useEffect } from 'react';
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

export default function EditJob() {
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
    const [s3FileUrl, setS3FileUrl] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [previewImg, setPreviewImg] = useState('');

    const fetchJobData = async () => {
        try {
            const job_id = params.jobId;
            const response = await axios.get(`/reson-api/jobs/${job_id}`);
            // console.log(response.data)
            setJobData(response.data);
            
        } catch (error) {
            console.error('Error fetching job details: ', error.message);
        }
    }


    useEffect(() => {
        if(session){
            if(params.jobId) {
                fetchJobData()
            } else {
                router.push('/company/post-job-vacancy')
            }
        }
    }, [session]) 

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        // console.log(event.target);
        var formData = new FormData(event.target)

        try {
            var raw = {
                "company_id": formData.get('company_id'),
                "job_title": formData.get('job_title'),
                "job_type": formData.get('job_type'),
                "job_category": formData.get('job_category'),
                "job_description": formData.get('job_description'),
                "job_offerings": formData.get('job_offerings'),
                "created_date": jobData.created_date,
                "date_updated": new Date(),
                "job_requirements": formData.get('job_requirements'),
                "job_qualification": formData.get('job_qualification'),
                "job_work_location": formData.get('job_work_location'),
                "job_expire_date": new Date(jobData.job_expire_date).toISOString().split('T')[0]
            }
            // console.log('raw', raw)

            const response = await axios.put(`/reson-api/jobs/${params.jobId}`, raw);
            if(response.status === 200) {
                toast.success('Job vacancy updated successfully');
            }
        } catch (error) {
            
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
        {/* Header bar */}
        <HeaderBar />
        <div className='container'>
            <div className='row'>
                <div className='col-12 top-content-box'>
                    <h1 className='text-center mt-5 mb-3 body-heading'>Edit Job Vacancy</h1>
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
        <div className='container'>
            <div className='row'>
                <div className='col-12'>
                    {jobData && (
                        <form className='container' id='editCompanyProfile' onSubmit={handleEditSubmit}>
                            <input type='hidden' name='company_id' value={session.user.company_id} />
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-4 pe-5'>
                                    <label htmlFor='job_title'>Job Role</label>
                                    <input type='text' id='job_title' name='job_title' placeholder='Enter Job Role' defaultValue={jobData.job_title} />
                                </div>
                                <div className='col-12 col-sm-4 ps-5'>
                                    <label htmlFor='job_category'>Job Category</label>
                                    <input type='text' id='job_category' name='job_category' placeholder='Enter Job Category' defaultValue={jobData.job_category} />
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-4 pe-5'>
                                    <label htmlFor='job_type'>Job Type</label>
                                    <input type='text' id='job_type' name='job_type' placeholder='Enter Job Type (E.g. Full-time, part-time, internship)' defaultValue={jobData.job_type} />
                                </div>
                                <div className='col-12 col-sm-4 ps-5'>
                                    {/* <label htmlFor='job_qualification'>Job Qualificaiton</label> */}
                                    {/* <input type='text' id='job_qualification' name='job_qualification' placeholder='Enter Job Qualification' defaultValue={jobData.job_qualification} /> */}
                                    {/* <textarea type='text' id='job_qualification' name='job_qualification' rows={'4'} placeholder='Enter Job Qualification' defaultValue={jobData.job_qualification} /> */}
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-8'>
                                    <label htmlFor='job_qualification'>Job Qualificaiton</label>
                                    <textarea type='text' id='job_qualification' name='job_qualification' rows={'4'} placeholder='Enter Job Qualification' defaultValue={jobData.job_qualification} />
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-8'>
                                    <label htmlFor='job_description'>Job Description</label>
                                    <textarea type='text' id='job_description' name='job_description' rows={'4'} placeholder='Enter Job Description' defaultValue={jobData.job_description} />
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-4 pe-5'>
                                    <label htmlFor='job_offerings'>Job Offerings</label>
                                    <textarea type='text' id='job_offerings' name='job_offerings' rows={'4'} placeholder='Enter Job Offerings' defaultValue={jobData.job_offerings} />
                                </div>
                                <div className='col-12 col-sm-4 ps-5'>
                                    <label htmlFor='job_requirements'>Job Requirements</label>
                                    <textarea type='text' id='job_requirements' name='job_requirements' rows={'4'} placeholder='Enter Job Requirements' defaultValue={jobData.job_requirements} />
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mb-5'>
                                <div className='col-12 col-sm-2'></div>
                                <div className='col-12 col-sm-8'>
                                    <label htmlFor='job_work_location'>Job Work Location</label>
                                    <input type='text' id='job_work_location' name='job_work_location' placeholder='Enter Job Work Location' defaultValue={jobData.job_work_location} />
                                </div>
                                <div className='col-12 col-sm-2'></div>
                            </div>
                            <div className='row mt-5 mb-5 align-items-center'>
                                <div className='col-12 col-sm-6 text-end'>
                                    <input type='submit' id='submitEditCompanyProfile' className='submit-profile-btn' value={'Update and Save'} />
                                </div>
                                <div className='col-12 col-sm-6'>
                                    <Link href={`/company/jobs/view/${params.jobId}`} className='profile-btn'>View Job Listing</Link>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}
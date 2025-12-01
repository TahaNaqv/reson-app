import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link'
import axios from 'axios';
import { useParams } from 'next/navigation'
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function JobApplicants() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const params = useParams()
    const [companyData, setCompanyData] = useState('');
    const [jobData, setJobData] = useState([]);
    const [applicationData, setApplicationData] = useState([]);
    const [candidateIds, setCandidateIds] = useState([]);
    const [candidateDetails, setCandidateDetails] = useState([]);
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

            setS3FileUrl(durl);
            // console.log(s3FileUrl);
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    const fetchJobData = async () => {
        const job_id = params.jobId;
        const candidates = [];
        const candidateDetailsArr = [];
        
        // Get Job details
        const response = await axios.get(`/reson-api/jobs/${job_id}`);
        
        // Get Total number of applications for the job, push them to jobData state and get candidate ids
        const totalApplicants = await axios.get(`/reson-api/job_result/job/${job_id}`);
        setJobData({...response.data, applicants: totalApplicants.data.length});
        
        if(totalApplicants.data.length > 0) {
            // Push all candidate ids to candidateIds state
            totalApplicants.data.forEach((candidate) => {
                candidates.push(candidate.candidate_id);
            });
            setCandidateIds(candidates);

            // Fetch all candidate details and push to candidateDetails state
            const candidateDetailsPromises = candidates.map((id) =>
            axios.get(`/reson-api/candidate/${id}`)
            );

            const candidateDetailsResponses = await Promise.all(candidateDetailsPromises);
            const candidateData = candidateDetailsResponses.map((response) => {
                candidateDetailsArr.push({candidate_id: response.data.candidate_id, candidate_first_name: response.data.candidate_first_name, candidate_last_name: response.data.candidate_last_name, candidate_email_address: response.data.candidate_email_address})
            });

            const mergedCandidateDetails = mergeData(totalApplicants.data,candidateDetailsArr);
            setCandidateDetails(mergedCandidateDetails)
        }
        
    }

    function mergeData(objects1, objects2) {
        return objects1.map(obj1 => Object.assign({}, obj1, objects2.find(obj2 => obj2.candidate_id === obj1.candidate_id)));
      }

    useEffect(() => {
        if(session){
            if(session.user.company_id != 0) {
                fetchCompanyData()
                fetchJobData()
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
                    {companyData && (
                    <div className='col-12 col-sm-3 company-details-bar text-center'>
                        <div className='pt-sm-5 pe-sm-3 ps-sm-3 pb-sm-2'>
                            {s3FileUrl && (
                                <img src={s3FileUrl} width={300} height={128} alt="Company Logo" className='companyLogo' />
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
                        <div className='text-center pe-2 ps-2 pt-4 pb-4'>
                            <Link href='/company/company-profile' className='profile-btn position-relative d-block'>
                                <Image src={'/icons/profile.svg'} alt='record' width={'20'} height={'14'} className='dashboard-icons' />
                                View Company Profile
                            </Link>
                        </div>
                    </div>
                    )}
                    <div className='col-12 col-sm-9 ps-sm-5 pe-sm-5 top-content mt-5 mb-5'>
                        {jobData && (
                            <div className='row mb-4'>
                            <div className='col-12 job-list'>
                                <div className='row align-items-center'>
                                    <div className='col-12 pe-sm-4'>
                                        <div className='row'>
                                            <div className='col-6'><p><strong>Job Role: </strong>{jobData.job_title}</p></div>
                                            <div className='col-6'><p><strong>Job Category: </strong>{jobData.job_category}</p></div>
                                        </div>
                                        <div className='row mt-1 mb-1'>
                                            <div className='col-12'><p><strong>Job Offerings: </strong>{jobData.job_offerings}</p></div>
                                        </div>
                                        <div className='row'>
                                            <div className='col-6'><p><strong>Upload Date: </strong>{jobData.created_date ? jobData.created_date.slice(0, 10) : ''}</p></div>
                                            <div className='col-6'><p><strong>No. of Applications: </strong>{jobData.applicants}</p></div>
                                        </div>
                                        <div className='row mt-2'>
                                            <div className='col-12'>
                                                <p><strong>Candidate job link:</strong> {`${process.env.NEXT_PUBLIC_SITE_URL}/job-listing/${jobData.job_id}`}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                        <div className='row'>
                            <div className='col-12 p-0'>
                                <div className='table-responsive mb-4'>
                                    <table className='table table-hover candidate-table'>
                                        <thead>
                                            <tr>
                                                <th scope='col'>#</th>
                                                <th scope='col'>Candidate Name</th>
                                                <th scope='col'>Candidate Email</th>
                                                <th scope='col'>Date of Application</th>
                                                <th scope='col'>Result</th>
                                                <th scope='col'>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {candidateDetails && candidateDetails.length > 0 ? (candidateDetails.map((item, index) => (
                                            <tr key={index + 1}>
                                                <th scope='row'>{index + 1}</th>
                                                <td>{item.candidate_first_name} {item.candidate_last_name }</td>
                                                <td>{item.candidate_email_address}</td>
                                                <td>{item.created_date.slice(0,10)}</td>
                                                <td></td>
                                                <td><Link href={`/company/jobs/applicants/${jobData.job_id}/candidate-${item.candidate_id}`} className='profile-btn'>View</Link></td>
                                            </tr>
                                        ))) : (
                                        <>
                                            <tr>
                                                <th scope='row'>No applications found</th>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
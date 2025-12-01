import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import CandidateHeader from '@/Components/CandidateHeader/candidateHeader';
import VideoPlayer from '@/Components/VideoPlayer/player';

export default function Welcome() {
    const router = useRouter();
    const progress = 75;
    const [jobId, setJobId] = useState('');

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        const storedJobDetails = localStorage.getItem('jobDetails');
        if (storedJobDetails) {
            setJobId(JSON.parse(storedJobDetails));
        }
    }, []);
    const [jobDetails, setJobDetails] = useState('');
    useEffect(() => {
        if (jobId) {
            axios.get(`/reson-api/jobs/${jobId.job_id}`) // Assuming the endpoint to fetch job details is /api/jobs/:jobId
                .then(response => {
                    setJobDetails(response.data);
                })
                .catch(error => {
                    console.error('Error fetching job details:', error);
                });
        }

    }, [jobId]);
    // console.log(jobDetails)
    const [companyDetails, setCompanyDetails] = useState('');
    const [userDetails, setUserDetails] = useState('');
    useEffect(() => {
        if (jobDetails) {
            axios.get(`/reson-api/company/${jobDetails.company_id}`) // Assuming the endpoint to fetch job details is /api/jobs/:jobId
                .then(response => {
                    if(response.data) {
                        axios.get(`/reson-api/user_accounts/${response.data.user_id}`)
                        .then(resp => {
                            setUserDetails(resp.data.user.user_name);
                            // console.log(response.data)
                        })
                        .catch(error => {
                            console.error('Error fetching user details:', error);
                        })
                    }
                    setCompanyDetails(response.data);
                })
                .catch(error => {
                    console.error('Error fetching job details:', error);
                });
        }
        

    }, [jobDetails]);
    // console.log(companyDetails)
    const [s3VideoUrl, setS3VideoUrl] = useState('');

    const welcomeVideo = async () => {
        try {
            const userFolder = 'user_id_' + companyDetails.user_id + '/company';
            const response = axios.get(`/reson-api/company/${companyDetails.company_id}`);

            const s3key = (await response).data.company_ceo_video_key;
            // console.log(s3key)
            const s3folder = userFolder;

            const res2 = await fetch(
                `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
            )

            const { durl, dkey } = await res2.json()

            setS3VideoUrl(durl);
            // console.log(s3VideoUrl)

        } catch (error) {
            console.error('Error fetching company details', error.message)
        }
    }

    useEffect(() => {
        if(jobDetails, companyDetails){
            // console.log(s3VideoUrl)
            welcomeVideo();
        }
    }, [jobDetails, companyDetails, userDetails])

    const videoJsOptions = {
        autoplay: false,
        controls: true,
        sources: [
            {
                src: s3VideoUrl,
                type: 'video/mp4',
            },
        ],
    };
    
    return (
        <>
            {/* Header bar */}

            <CandidateHeader />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 col-sm-2'></div>
                    <div className='col-12 col-sm-8 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Welcome from the CEO</h1>
                        <div className='text-center'>
                            <p className='sub-text mt-2 mb-1'>
                            {`Hi, this is ${userDetails ? userDetails : '[name]'} from ${companyDetails.company_name ? companyDetails.company_name : '[company]'},`}
                            </p>
                            <p className='sub-text mb-1'>
                                {`We are so happy about your application. We are excited to get to know you a little better and see for both of us if we are a good fit.`}
                            </p>
                            <p className='sub-text mb-1'>
                                {`For the next ten questions you will need around 10 - 15 minutes and a good internet connection to complete the interview.`}
                            </p>
                            <p className='sub-text mb-1'>
                                {`If you are ready you will be taken to a meditation that should give you the right energy for the assessment.`}
                            </p>
                            <p className='sub-text mb-1'>
                                {`If you are not happy with your first take don't worry, you can preview and rerecord as many times as needed.`}
                            </p>
                            <p className='sub-text mb-1'>
                                {`If this is the first time doing an interview in this way please don't stress out about getting the perfect video. We are more interested in getting to know you and if you are a good fit for this role rather then a perfect video. So relax, take a breath and do a meditation and just be you`}
                            </p>
                        </div>
                    </div>
                    <div className='col-12 col-sm-2'></div>
                </div>

                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-40 mt-4 mb-4'></div>
                    </div>
                </div>

                <div className='container'>
            <div className='row mb-5'>
                <div className='col-12 col-sm-2'></div>
                <div className='col-12 col-sm-8 position-relative'>
                    <div className='videoPlayer position-relative'>
                        <div className="recorded-player">
                            {/* <video className="recorded" src={s3VideoUrl} autoPlay controls></video> */}
                            {s3VideoUrl && (
                                <VideoPlayer {...videoJsOptions} />
                            )}
                        </div>
                    </div>
                </div>
                <div className='col-12 col-sm-2'></div>
            </div>
        </div>
               
            <div className='row mt-5 mb-5'>
                <div className='col-12 text-center mb-5'>
                    <Link href={'/candidate/question-answer-list'} className='profile-btn'>Start the assignment</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
import { React, useState, useEffect } from 'react';
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function PostNewJob() {
    const router = useRouter();
    const isSSR = typeof window === 'undefined';
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [userID, setUserID] = useState('');

 // console.log(session)
    function cfform() {
        if (typeof window !== "undefined") {
            // Client-side-only code
            if(window.cf) {
                fetchCompanyData()
                var conversationalForm = window.cf.ConversationalForm.startTheConversation({
                    formEl: document.getElementById("profile-cf"),
                    context: document.getElementById("cf-context"),
                    submitCallback: async function() {
                      conversationalForm.addRobotChatResponse("Alright, you are done. We are creating the job listing. You will be redirected shortly.");
                        var formDataSerialized = conversationalForm.getFormData(true);
                        var formData = conversationalForm.getFormData();
                        // console.log('formData', formData)
                        // console.log('formDataSerialized', formDataSerialized)
                    try {
                        var raw = {
                            "company_id": formData.get('company_id'),
                            "job_title": formDataSerialized['job_title'],
                            "job_type": formDataSerialized['job_type'],
                            "job_category": formDataSerialized['job_category'],
                            "job_description": formDataSerialized['job_description'],
                            "job_offerings": formDataSerialized['job_offerings'],
                            "created_date": new Date(),
                            "date_updated": new Date(),
                            "job_requirements": formDataSerialized['job_requirements'],
                            "job_qualification": formDataSerialized['job_qualification'],
                            "job_work_location": formDataSerialized['job_work_location'],
                            "job_expire_date": new Date().toISOString().split('T')[0]
                        }
                        // console.log(raw);
                        const response = await axios.post('/reson-api/jobs', raw);
                        // console.log(response);
                                if(response.status === 201) {
                                    toast.success('Job posted successfully', {
                                    onClose: () => {
                                        router.push(`/company/jobs/record/${response.data.job_id}`);
                                    },
                                    })
                                } else {
                                    toast.error('Error creating job post. Please try again in sometime.', { theme: 'colored' });
                                }
                    } catch (error) {
                                toast.error('Error creating job post. Please try again in sometime.', { theme: 'colored' });
                                console.log(error);
                    }
                    }
                  });
            }
          }
        
  };

  const recordWelcomeVideo = () => {
    return (
        <div className='text-center'>
            {/* <span className='closeBtn'></span> */}
            <p>Hey! You have not recorded the welcome video yet.</p>
            <Link href={'/company/record-welcome-message'}>Record Now?</Link>
        </div>
    )
  }

  const fetchCompanyData = async () => {
    try {
        if(document.getElementById('logged_in_user')) {
            const user_id = document.getElementById('logged_in_user').value;
            const response = await axios.get('/reson-api/company/user/' + user_id);
            setCompanyData(response.data);
            setUserID(user_id);

            if(!response.data.company_ceo_video_key) {
                toast(recordWelcomeVideo, {
                    position: 'bottom-left',
                    autoClose: false,
                    closeOnClick: true,
                    className: 'notify-video-record'
                })
            }
        }
        
    } catch (error) {
        console.error('Error fetching company id: ', error.message);
    }
}

    useEffect(() => {
        setTimeout(cfform, 2000);
    }, []) 

    if (status === "loading") {
      return <PageLoader/>
    }

    if(session.user.user_id === null || session.user.user_id === '') {
      router.push('/register');
    }

    return(
        <>
        <Script src='https://cdn.jsdelivr.net/gh/space10-community/conversational-form@1.0.1/dist/conversational-form.min.js' crossOrigin='yes' />
            {/* Header bar */}
            <HeaderBar />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Create Job Vacancy</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        </p>
                        <div className='progress-bar-area mt-3 mb-5 text-center'>
                            <div className='spacer-50 m2-3 mb-3'></div>
                        </div>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12'>
                        <h3 className='hi-recruiter'><strong>Hi,</strong> {session.user.user_name}</h3>
                    </div>
                </div>
            </div>
            <>
                <div className='container'>
                    <div className='row'>
                        <form id="profile-cf" className='col-12'>
                            <input type='hidden' name='company_id' value={session.user.company_id} />
                            <input type="text" name="job_title" cf-questions="What's the Job Role?" />
                            <input type='text' name='job_type' cf-questions="What's the Job Type? (ex: remote, internship, full-time, part-time)" />
                            <input type="text" name="job_category" cf-questions="What's the Job Category? (ex: Sales & Marketing, IT, Design, Operations, Software Development)" />
                            <cf-robot-message cf-questions="We now require the <strong>Job Description.</strong>"></cf-robot-message>
                            <textarea rows={'4'} name="job_description" cf-questions="Can you share the job description details?"  />
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <textarea rows={'4'} name="job_offerings" cf-questions="Please share what does the job offer?" />
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <cf-robot-message cf-questions="Next, let's discuss <strong>Job Requirements</strong>"></cf-robot-message>
                            <textarea rows={'4'} name="job_requirements" cf-questions="Can you share the Job Requirements?" />
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <cf-robot-message cf-questions="Next, let's discuss <strong>Job Qualification</strong>"></cf-robot-message>
                            <textarea rows={'4'} name="job_qualification" cf-questions="Can you share the Job Qualificaitons?" />
                            {/* <input type="text" name="job_qualification" cf-questions="Can you share the Job Qualificaitons?" /> */}
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <input type="text" name="job_work_location" cf-questions="What is the Job Work Location?" />
                            {/* <input type="text" name="job_expire_date" cf-questions="Lastly please specify an end date for this job listing?" /> */}
                         </form>
                        <div id="cf-context" role="cf-context" cf-context="" className='col-12' />
                    </div> 
                </div> 
            </>
        </>
    );
}
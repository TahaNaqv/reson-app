import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import Header from '@/Components/CandidateHeader/header';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function CandidateEmail() {
    const router = useRouter();

    const handleSubmit = async (event) => {
        event.preventDefault()
        // check if the given email is in a valid email address format
        const givenEmail = event.target.candidate_email_address.value
        const candidateFirstName = event.target.candidate_first_name.value
        const candidateLastName = event.target.candidate_last_name.value
        var validRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        if(validRegex.test(givenEmail) === true) {
            // fetch to see if candidate by this email id exists
            try {
                const checkCandidateEmail = await axios.get(`/reson-api/candidate/email/${givenEmail}`)
                console.log(checkCandidateEmail.data)
                
                if(checkCandidateEmail.status === 200) {
                    toast.info('User exists');
                    
                    const jobId = JSON.parse(localStorage.getItem('jobDetails')).job_id
                    const candidateData = checkCandidateEmail.data
                    const candidateId = candidateData.candidate_id

                    // Clear localstorage
                    localStorage.removeItem('candidateDetails');
                    // Set localstorage 
                    localStorage.setItem('candidateDetails', JSON.stringify({
                        candidateId,
                        firstName: candidateData.candidate_first_name,
                        lastName: candidateData.candidate_last_name,
                        candidateEmail: givenEmail
                    }));

                    // console.log(localStorage.getItem('candidateDetails'));
                    // Check if this user has already applied for this job, if not show option to answer from first
                    try {
                        const hasAppliedResponse = await axios.get(`/reson-api/job_result/jobId/${jobId}/candidateId/${candidateId}`);
                        const hasApplied = hasAppliedResponse.data;
                        console.log(hasApplied.status)
                        if(hasApplied.status != 'false') {
                            if(hasApplied.status === 'Answered') {
                                
                                toast.info('You have already applied for this job');
                                await router.push('/candidate/thankyou');
                            }
                        } else {
                            await router.push('/candidate/energy');
                        }
                        
                    } catch (error) {
                        if(error.response.status === 404) {
                            console.clear()
                            // toast.info('User has not applied to this job. Redirect to assignments flow');
                            await router.push('/candidate/energy');
                        }
                    }

                }
                
            } catch (error) {
                if(error.response.status === 404) {
                    console.clear()
                    // Clear localstorage
                    localStorage.removeItem('candidateDetails');
                    // Save Candidate details to db
                    const raw = {
                        candidate_first_name: candidateFirstName,
                        candidate_last_name: candidateLastName,
                        candidate_profile_image: 'NA',
                        candidate_img_key: 'NA',
                        candidate_s3_folder: 'NA',
                        candidate_dob: 'NA',
                        candidate_email_address: givenEmail,
                        skills: 'NA'
                    }
                    console.log(raw)
                    const saveCandidate = await axios.post('/reson-api/candidate', raw);
                    const candidateId = saveCandidate.data.candidate_id;
                    // Set Candidate email in the localstorage
                    localStorage.setItem('candidateDetails', JSON.stringify({
                        candidateId,
                        candidateEmail: givenEmail,
                        firstName: candidateFirstName,
                        lastName: candidateLastName
                    }));
                    // toast.info('User email not found. Show the profile page.')
                    if(candidateId) {
                        await router.push('/candidate/energy');
                    }
                }
                
            }
        }
    }

    return(
        <>
            {/* Header bar */}
            {/* <HeaderBar /> */}
            <Header />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Enter your Details to continue</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        </p>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-50 mt-2 mb-2'></div>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12 col-sm-4'></div>
                    <div className='col-12 col-sm-4'>
                        <form id='editCompanyProfile' encType = "multipart/form-data" onSubmit={handleSubmit}>
                            <div className='row mb-3'>
                                <div className='col-12 col-sm-6 pe-3'>
                                    <label htmlFor='candidate_first_name'>First Name</label>
                                    <input type='text' name='candidate_first_name' required placeholder='Enter your first name'/>
                                </div>
                                <div className='col-12 col-sm-6 ps-3'>
                                    <label htmlFor='candidate_last_name'>Last Name</label>
                                    <input type='text' id='candidate_last_name' name='candidate_last_name' required placeholder='Enter your last name'  />
                                </div>
                            </div>
                            <label htmlFor='candidate_email'>Email Address</label>
                            <input type='email' id='candidate_email' name='candidate_email_address' required placeholder="name@example.com" className='mb-4' />
                            <div className='text-center'>
                                <input type='submit' id='submitEditCompanyProfile' className='submit-profile-btn' value={'Submit and Proceed'} />
                            </div>
                        </form>
                    </div>
                    <div className='col-12 col-sm-4'></div>
                </div>
            </div>
        </>
    );
}
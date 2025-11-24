import React, { useState, useEffect } from 'react';
// import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';

export default function CreateProfile() {
    const router = useRouter();
    const isSSR = typeof window === 'undefined';
    const { data: session, status, update } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [render, setRender] = useState('');

    function cfform() {
        if (typeof window !== "undefined") {
            // Client-side-only code
            if(window.cf) {
                var conversationalForm = window.cf.ConversationalForm.startTheConversation({
                    formEl: document.getElementById("profile-cf"),
                    context: document.getElementById("cf-context"),
                    submitCallback: async function() {
                      conversationalForm.addRobotChatResponse("Alright, you are done. We are creating your profile. You will be redirected shortly.");
                    //   console.log(conversationalForm.getFormData());
                        var formDataSerialized = conversationalForm.getFormData(true);
                        var formData = conversationalForm.getFormData();
                        const file = formData.get('company_logo');
                        const filename = file.name
                        let userProfilePic = ''
                        let s3key = ''
                        // console.log(formDataSerialized['user_id'])
                        // console.log('fdata: ', formData.get('user_id'));
                        if(filename) {
                            // Upload the files to S3 bucket
                            const fileType = encodeURIComponent(file.type)
                            const userFolder = 'user_id_' + formData.get('user_id') + '/company'
                
                            const res = await fetch(
                                `/api/upload?file=${filename}&fileType=${fileType}&folder=${userFolder}`
                            )
                            const { url, key } = await res.json()
                
                            // console.log(url)
                
                            const upload = await fetch(url, {
                                method: 'PUT',
                                body: file,
                                headers: { "Content-Type": fileType }
                            })
                            if (upload.ok) {
                                toast.success('Company Logo uploaded successfully')
                            } else {
                                toast.error('Company Logo upload failed. Please try again later')
                                return false
                            }
                
                            userProfilePic = `https://reson-images.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`
                            s3key = key
                        }

                    try {
                        var raw = {
                            "user_id": formData.get('user_id'),
                            "company_name": formDataSerialized['company_name'],
                            "company_website": formDataSerialized['company_website'],
                            "company_email_address": formDataSerialized['company_email'],
                            "company_logo": userProfilePic,
                            "company_logo_key": s3key,
                            "company_s3folder": 'user_id_' + formData.get('user_id') + '/company',
                            "company_description": '',
                            "company_team_size": formDataSerialized['company_team_size'],
                            "company_stage": formDataSerialized['company_stage'],
                            "company_address": formDataSerialized['company_address'],
                            "company_country": formDataSerialized['company_country'],
                            "company_values": formDataSerialized['company_values'],
                            "company_working_environment": formDataSerialized['company_working_environment'],
                            "company_growth": formDataSerialized['company_growth'],
                            "company_diversity": formDataSerialized['company_diversity'],
                            "company_vision": formDataSerialized['company_vision'],
                            "created_date": new Date(),
                            "last_modified_date": new Date()
                        }
                        // console.log(raw);
                        const response = await axios.post('/reson-api/company', raw);
                        // console.log(response);
                        console.log(response.data.company_id);
                                if(response.status === 201) {
                                    triggerSessionUpdate(response.data.company_id);
                                    // console.log(session.user);
                                    if(session.user.company_id != '') {
                                        toast.success('Company profile created successfully', {
                                            onClose: () => {
                                                router.push('/company/record-welcome-message');
                                            },
                                            })
                                    }
                                    
                                } else {
                                    toast.error('Error creating company profile. Please try again in sometime.', { theme: 'colored' });
                                }
                    } catch (error) {
                                toast.error('Error creating company profile. Please try again in sometime.', { theme: 'colored' });
                                console.log(error);
                    }
                    }
                  });
            }
          }
        
  };

  const showForm = async () => {
    if(session) {
        if(session.user.company_id === 0) {
            setTimeout(cfform, 2000);
        } else {
            router.push('/company/dashboard');
        }
    }
  }

    useEffect(() => {
        setRender('initial');
        if(render == 'initial') {
            showForm()
        }
    }, [status, render]) 

    if (status === "loading") {
      return <PageLoader/>
    }
      
    // console.log(session.user)

    async function triggerSessionUpdate(cmpID) {
        await update({
            ...session,
            user: {
                ...session.user,
                company_id: cmpID
            }
        })
    }

    return(
        <>
        <Script src='https://cdn.jsdelivr.net/gh/space10-community/conversational-form@1.0.1/dist/conversational-form.min.js' crossOrigin='yes' />
        {/* <Head>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/gh/space10-community/conversational-form@1.0.1/dist/conversational-form.min.js" crossorigin></script>
        </Head> */}
            {/* Header bar */}
            <HeaderBar />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Create Your Profile</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        </p>
                        <div className='progress-bar-area mt-3 mb-5 text-center'>
                            <progress id="createProfileProgress" value="10" max="100"> 0% </progress>
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
                            <input type='hidden' name='user_id' value={session.user.user_id} />
                            <input type="text" name="company_name" cf-questions="What is your company name?" />
                            <input type='file' name='company_logo' cf-questions="Upload your company logo in PNG or JPEG. File should not exceed 2MB." cf-input-placeholder="Click the icon to upload the file" />
                            <input type="text" name="company_team_size" cf-questions="How many employees does your company have?" />
                             <input type="text" name="company_address" cf-questions="Can you mention the registered location of the company?" />
                             <input type="text" name="company_country" cf-questions="Please enter the country" />
                             <input type="text" name="company_stage" cf-questions="What is the current stage of your startup? (ex: Pre-Seed, Series A, Series B, ...)" />
                            <cf-robot-message cf-questions="Next, we'll work on the <strong>Company Values & Culture</strong>"></cf-robot-message>
                            {/* <input type="text" name="company_values" cf-questions="What are the top three core values of your organization, and how are they reflected in the day-to-day operations and decisions?" /> */}
                            <textarea rows={'4'} name="company_values" cf-questions="What are the top three core values of your organization, and how are they reflected in the day-to-day operations and decisions?"  />
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <cf-robot-message cf-questions="Next, let's discuss <strong>Working Environment</strong>"></cf-robot-message>
                            {/* <input type="text" name="company_working_environment" cf-questions="How would you describe the working environment and style of collaboration in your company (e.g., team-oriented, independent, flexible)?" /> */}
                            <textarea rows={'4'} name="company_working_environment" cf-questions="How would you describe the working environment and style of collaboration in your company (e.g., team-oriented, independent, flexible)?"  />
                            <cf-robot-message cf-questions="Let's talk about <strong>Growth and Development Opportunities</strong>"></cf-robot-message>
                            {/* <input type="text" name="company_growth" cf-questions="What opportunities does your company offer for professional growth and development, such as training programs, mentorship, or career advancement?" /> */}
                            <textarea rows={'4'} name="company_growth" cf-questions="What opportunities does your company offer for professional growth and development, such as training programs, mentorship, or career advancement?"  />
                            <cf-robot-message cf-questions="Thank you."></cf-robot-message>
                            <cf-robot-message cf-questions="What about <strong>Diversity and Inclusion?</strong>"></cf-robot-message>
                            {/* <input type="text" name="company_diversity" cf-questions="How does your organization implement diversity and inclusion in its workforce, and what initiatives or policies are in place to support this?" /> */}
                            <textarea rows={'4'} name="company_diversity" cf-questions="How does your organization implement diversity and inclusion in its workforce, and what initiatives or policies are in place to support this?"  />
                            <cf-robot-message cf-questions="Lastly, what are your <strong>Future Vision and Goals?</strong>"></cf-robot-message>
                            {/* <input type="text" name="company_vision" cf-questions="What are the key goals and vision for the company's future, especially regarding growth, innovation, and market presence?" /> */}
                            <textarea rows={'4'} name="company_vision" cf-questions="What are the key goals and vision for the company's future, especially regarding growth, innovation, and market presence?"  />
                            <input type="text" name="company_website" cf-questions="Please share your company website link." />
                            <input type="email" name="company_email" cf-questions="Please share an email id if someone wants to reach you?" />
                         </form>
                        <div id="cf-context" role="cf-context" cf-context="" className='col-12' />
                    </div> 
                </div> 
            </>
        </>
    );
}
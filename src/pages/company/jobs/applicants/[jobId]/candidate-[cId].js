'use client'
import { React, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';
import VideoPlayer from '@/Components/VideoPlayer/player';

export default function CandidateResult() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        router.push('/login');
      },
    });

    const params = useParams();
    const [companyData, setCompanyData] = useState('');
    const [jobData, setJobData] = useState([]);
    const [answerData, setAnswerData] = useState([]);
    const [openAIResult, setOpenAIResult] = useState();
    const systemArr = [];
    let openAISystem

    const ChartComponent = dynamic(() => import('@/Components/VennChartResult/vennChart'), { ssr: false });

    // This function was created only to generate the transcription temporarily. No need to use this function for MVP
    const checkTranscriptionStatus = async () => {
        const jobId = params.jobId;
        const candidateId = params.cId.slice(10);
        const fetchJobResult = await axios.get(`/reson-api/answer/candidate/${candidateId}/job/${jobId}`);
        const jobResultData = await fetchJobResult.data;
        if(jobResultData && jobResultData.length > 0) {
            for (const row of jobResultData) {
                const s3Key = row.answer_key;
                const s3Folder = row.job_s3_folder;
                const s3VideoUrl = `https://reson-images.s3.eu-central-1.amazonaws.com/${s3Folder}/${s3Key}`
                try {
                    const transcriptionStatus = await axios.get(`/api/transcribe/status?jobName=${s3Key}`)
                    const transcriptionExists = await transcriptionStatus.data;
                    console.log(transcriptionExists)
                    if(transcriptionExists.response.httpStatusCode === 400) {

                        toast.info('No Transcription data available');
                        const transcription = await fetch(
                            `/api/transcribe?media=${s3VideoUrl}&outputBucket=${s3Folder}&jobName=${s3Key}`
                        )
                        const transcriptionResponse = await transcription.json()
                    }
                    // return
                } catch (error) {
                    
                }
            }
        }
    }

    const fetchData = async () => {
        try {
            const jobId = params.jobId;
            const candidateId = params.cId.slice(10);
            const arr = [];
            // Fetch Candidate Answers
            toast.info('Please wait, we are fetching user answers');
            const response = await axios.get(`/reson-api/answer/candidate/${candidateId}/job/${jobId}`);
            const responseData = await response.data
            if (responseData && responseData.length > 0) {
                for (const item of responseData) {
                    const s3key = item.answer_key;
                    const jsonS3Key = s3key + '.json';
                    const s3folder = item.job_s3_folder;
                    const getVideo = await axios.get(`/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`);
                    const getVideoLink = await getVideo.data
                    const videoLink = getVideoLink.durl;

                    const getJson = await axios.get(`/api/download?file=${jsonS3Key}&key=${jsonS3Key}&folder=${s3folder}`);
                    const getJsonLink = await getJson.data

                    const jsonLink = getJsonLink.durl;
                    const jsonText = await axios.get(jsonLink);
                    const answers = jsonText.data.results.transcripts[0].transcript;

                    arr.push({...item, answers, videoLink});
                    systemArr.push({answerIndex: item.answer_title, answers})
                    
                }
            }
            // console.log('systemArr', systemArr)
            setAnswerData(arr);

            // Get Job Details
            toast.info('Please wait, we are fetching Job Details')
            const jobResponse = await axios.get(`/reson-api/jobs/${jobId}`)
            const jobResult = await jobResponse.data
            setJobData(jobResult);

            // Get Company Details
            toast.info('Please wait, we are fetching Company Details')
            const companyId = jobResult.company_id
            const companyResponse = await axios.get(`/reson-api/company/${companyId}`)
            const companyResult = await companyResponse.data
            setCompanyData(companyResult);

            // Check if openAI results are stored in the db
            const getJobResult = await axios.get(`/reson-api/job_result/jobId/${jobId}/candidateId/${candidateId}`)
            const jobResultData = await getJobResult.data[0]
            console.log(`/reson-api/job_result/jobId/${jobId}/candidateId/${candidateId}`)
            

            if(jobResultData) {
                console.log(jobResultData)
                let resultJson
                if(jobResultData.ai_output === 'NA') {
                    toast.info('Please wait, we are running openAI prompt on the results')
                    console.log('Run openAI prompt and store results in the db');
                    // fetch openAI results
                    openAISystem = `Assessment:Question \n\n1. Which one is more essential: Being a good listener or a good communicator?\n\n ${arr[0].answers} \n\n 2. Can you rate the importance of these aspects for you: Career development, perks and benefits, salary, or excellent work? \n\n ${arr[1].answers} \n\n 3. If your life were a book, what would it be called? \n\n ${arr[2].answers} \n\n 4. Which resonates with you: "Everything has to be perfect" or "Done is better than perfect? \n\n ${arr[3].answers} \n\n 5. What is your first step when you have a new task with little or almost no direction? \n\n ${arr[4].answers} \n\n 6. You are trapped in a labyrinth. How would you proceed? \n\n ${arr[5].answers} \n\n 7. How do you define success in your work? \n\n ${arr[6].answers} \n\n 8. How do you define work-life balance and how do you achieve it? \n\n ${arr[7].answers} \n\n 9. If you could wake up tomorrow and have a new skill or quality, what would it be and how would you use it in your role? \n\n ${arr[8].answers} \n\n 10. If you could be an object in an office, what would you be and why? \n\n ${arr[9].answers} \n\n Company: Company Name: ${companyResult.company_name} \n\n Company Website: ${companyResult.company_website} \n\n Company Email Address: ${companyResult.company_email_address} \n\n Company Address: ${companyResult.company_address} \n\n Company Team size: ${companyResult.company_team_size} \n\n Company Stage (Startup environments): ${companyResult.company_stage} \n\n Company Country: ${companyResult.company_country} \n\n Company Values: ${companyResult.company_values} \n\n Company Working Environment: ${companyResult.company_working_environment} \n\n **Company: Growth and Development Opportunities: ${companyResult.company_growth}** \n\n **Company Diversity and Inclusion: ${companyResult.company_diversity}** \n\n **Company Future Vision: ${companyResult.company_vision}** \n\n Job Title: ${jobResult.job_title} \n\n Job Type: ${jobResult.job_type} \n\n Job Category: ${jobResult.job_category} \n\n Job Description: ${jobResult.job_description} \n\n Job Requirements: ${jobResult.job_requirements} \n\n Job Qualification: ${jobResult.job_qualification} \n\n Job Work Location: ${jobResult.job_work_location}`;

                    const raw = {
                        system: openAISystem
                    }

                    const getResults = await axios.post(`/api/openai/results`, raw);
                    // setOpenAIResult(getResults.data.content);


                    console.log('open AI results before saving to db', getResults.data)

                    // return

                    if(getResults.data) {
                        toast.success('Successfully fetched openAI results')
                        console.log('save results in db');
                        console.log(getJobResult.data, 'job data');
                        const interactionId = jobResultData.interaction_id;
                        const status = jobResultData.status;
                        if( interactionId ) {
                            toast.info('Please wait, Saving Open AI results to db')
                            const jobRaw = {
                                "status": status,
                                "ai_output": JSON.stringify(getResults.data)
                            }
                            console.log(jobRaw);
                            const saveAIResult = await axios.put(`/reson-api/job_result/${interactionId}`, jobRaw)
                            if(saveAIResult.status === 200 || saveAIResult.status === 201) {
                                toast.success('AI results saved to db successfully');
                                const reFetchJobResults = await axios.get(`/reson-api/job_result/jobId/${jobId}/candidateId/${candidateId}`);
                                const getAIData = await reFetchJobResults.data
                                console.log('getAIData', getAIData);
                                if( getAIData ) {
                                    resultJson = JSON.parse(getAIData[0].ai_output)
                                    console.log('resultJson after ai', resultJson)
                                    setOpenAIResult(resultJson)
                                    
                                }
                            }
                        }
                    }

                } else {
                    resultJson = JSON.parse(jobResultData.ai_output)
                    setOpenAIResult(resultJson)
                }
            } else {
                toast.error('Error fetching job Result');
            }
            



        } catch (error) {
            console.error('Error fetching data: ', error.message);
        }
    }

    const drawThumbnail = async (video) => {
        let canvas = document.getElementById('videoCanvas');
        canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }

    useEffect(() => {
        if(session){
            if(session.user.company_id !== 0) {
                // checkTranscriptionStatus();
                fetchData();
            } else {
                router.push('/company/create-profile');
            }
        }
    }, [session]);

    let vennData;

    useEffect(() => {
        if(openAIResult) {
            vennData = [
                { key: ['A'], data: 100 },
                { key: ['B'], data: 100 },
                { key: ['A', 'B'], data: openAIResult.finalResult[1] }
              ];
        }
    }, [openAIResult])

    if (status === "loading") {
        return <PageLoader/>;
    }

    if(session.user.user_id === null || session.user.user_id === '') {
        router.push('/register');
    }

    return(
        <>
            <HeaderBar />
            <div className='container-fluid'>
                <div className='row'>
                    <div className='col-12 col-sm-3 company-details-bar text-center pt-5 pb-5'>
                        <h3 className='body-heading'>Video Answers</h3>
                        <div className='row'>
                            {answerData && answerData.length > 0 ? (answerData.map((item, index) => {
                                return (
                                    <div key={index + 1} className='col-12 col-sm-6 mb-2 result-videos'>
                                        <VideoPlayer controls={'true'} sources={item.videoLink} />
                                        {/* <canvas id='videoCanvas'></canvas> */}
                                    </div>
                                );
                            })) : (
                                <></>
                            )}
                        </div>
                    </div>
                    <div className='col-12 col-sm-6 top-content pt-5 pb-5'>
                        <h1 className='text-center body-heading'>Result</h1>
                        {openAIResult && (
                            <div className='col-12 ps-3 pe-3 pt-4'>
                                <div className='d-flex justify-content-center'>
                                    <ChartComponent props={openAIResult.finalResult[1]} />
                                </div>
                                <p className='open-ai-result'>{openAIResult.finalResult[0]}</p>
                            </div>
                        )}
                    </div>
                    <div className='col-12 col-sm-3 company-details-bar text-center pt-5 pb-5'>
                        <h3 className='body-heading'>Analysis</h3>
                        {openAIResult && (
                            <div className='col-12 ps-3 pe-3 pt-3'>
                                <p className='open-ai-score'>{openAIResult.finalResult[1]}%</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

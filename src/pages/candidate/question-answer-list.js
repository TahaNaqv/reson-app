import { React, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import Timer from '@/Components/CandidateHeader/timer';
import axios from 'axios';
import { toast } from 'react-toastify';
import { SendMailClient } from 'zeptomail';
import 'bootstrap/dist/css/bootstrap.min.css';
import CandidateHeader from '@/Components/CandidateHeader/candidateHeader';
import VideoPlayer from '@/Components/VideoPlayer/player';

export default function Welcome() {
    const router = useRouter();
    const progress = 75;
    const [jobId, setJobId] = useState('');
    const [candidateDetails, setCandidateDetails] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userActions, setUserActions] = useState(true);
    const [showSubmit, setShowSubmit] = useState(false);

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        const storedJobDetails = localStorage.getItem('jobDetails');
        if (storedJobDetails) {
            setJobId(JSON.parse(storedJobDetails));
        }
    }, []);
    // console.log(jobId, 'jobid');
    useEffect(() => {
        const storedCandidateDetails = localStorage.getItem('candidateDetails');
        if (storedCandidateDetails) {
            setCandidateDetails(JSON.parse(storedCandidateDetails));
        }
    }, []);
    // console.log(candidateDetails, 'candidate dets')

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
    const [companyDetails, setCompanyDetails] = useState('');
    useEffect(() => {
        if (jobDetails) {
            axios.get(`/reson-api/company/${jobDetails.company_id}`) // Assuming the endpoint to fetch job details is /api/jobs/:jobId
                .then(response => {
                    setCompanyDetails(response.data);
                })
                .catch(error => {
                    console.error('Error fetching job details:', error);
                });
        }

    }, [jobDetails]);
    const [questionDetails, setQuestionDetails] = useState([]);
    const [answerDetails, setAnswerDetails] = useState([]);
    useEffect(() => {
        // Get Question Data
        if (jobId) {
            axios.get(`/reson-api/question/job/${jobId.job_id}`) // Assuming the endpoint to fetch job details is /api/jobs/:jobId
                .then(response => {
                    setQuestionDetails(response.data);
                })
                .catch(error => {
                    console.error('Error fetching job details:', error);
                });
        }

        // Get Answer data
        if(candidateDetails && jobId) {
            // console.log(candidateDetails)
            // console.log((`/reson-api/answer/candidate/${candidateDetails.candidateId}/job/${jobId.job_id}`))
            axios.get(`/reson-api/answer/candidate/${candidateDetails.candidateId}/job/${jobId.job_id}`)
            .then(response => {
                console.log(response.data)
                setAnswerDetails(response.data)
            })
            .catch(error => {
                console.error('Error fetching answers: ', error)
            })
        }

    }, [jobId]);
    // console.log(questionDetails)
    const [recruiterS3VideoUrl, setRecruiterS3VideoUrl] = useState('');
    const [s3VideoText, setS3VideoText] = useState('');

    const welcomeVideo = async () => {
        if(companyDetails) {
            console.log(questionDetails[currentQuestionIndex].question_id, 'get question id');
            try {
                const userFolder = 'user_id_' + companyDetails.user_id + '/company/job_id_' + jobDetails.job_id;
                const response = axios.get(`/reson-api/question/${questionDetails[currentQuestionIndex].question_id}`);

                const s3key = (await response).data.question_key;
                const s3JsonKey = s3key + '.json';
                // console.log(s3key)
                const s3folder = userFolder;

                const res2 = await fetch(
                    `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
                )

                const { durl, dkey } = await res2.json()

                const fetchS3Url = await fetch(durl, {
                    method: 'GET'
                })

                setRecruiterS3VideoUrl(fetchS3Url.url);

                // console.log('s3JsonKey', s3JsonKey)

                const res3 = await fetch(`/api/download?file=${s3JsonKey}&key=${s3JsonKey}&folder=${s3folder}`)
                const res3Json = await res3.json()
                const jsonUrl = res3Json.durl

                const fetchS3JSON = await fetch(jsonUrl, {
                    method: 'GET'
                })

                setS3VideoText(fetchS3JSON.url);
                // console.log(s3VideoText)

            } catch (error) {
                console.error('Error fetching welcome', error.message)
            }
        }
    }

    useEffect(() => {
        if (currentQuestionIndex === questionDetails.length - 1, questionDetails[currentQuestionIndex], companyDetails, jobDetails) {
            welcomeVideo();
        }
    }, [currentQuestionIndex === questionDetails.length - 1, questionDetails[currentQuestionIndex], companyDetails, jobDetails, answerDetails]);


    const handleNextQuestion = () => {
        if (currentQuestionIndex < questionDetails.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1); // Move to the next question
            welcomeVideo();
            getCameraPermission();
        } else {
            // Optionally, you can handle the case where there are no more questions
            // console.log("No more questions");
            clearPermissions()
            setShowSubmit(true);
        }
    };

    // const mimeType = 'video/webm;codecs=vp8,opus';
    // const mimeType = 'video/mp4;codecs=avc1,mp4a';
    const [stream, setStream] = useState(null);
    const mediaRecorder = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [permission, setPermission] = useState(false);
    const [permissionClicked, setPermissionClicked] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState(null);
    const liveVideoFeed = useRef(null);
    const [recordingStatus, setRecordingStatus] = useState('inactive');
    const [videoChunks, setVideoChunks] = useState([]);
    const [videoFile, setVideoFile] = useState(null);



    // Camera Permission
    const getCameraPermission = async () => {
        // Should I keep the recorded video null?
        if (recordedVideo) {
            setRecordedVideo(null)
        }
        if ("MediaRecorder" in window) {
            try {
                const videoConstraints = {
                    audio: false,
                    video: true,
                };
                const audioConstraints = { audio: true };

                const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
                const videoStream = await navigator.mediaDevices.getUserMedia(videoConstraints);

                setPermission(true);
                setPermissionClicked(true)

                const combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioStream.getAudioTracks(),
                ]);

                setStream(combinedStream);
                if (liveVideoFeed.current) {
                    liveVideoFeed.current.srcObject = videoStream;
                }
            } catch (error) {
                console.error('Error getting permissions', error.message)
            }
        } else {
            alert("The MediaRecorder API is not supported in your browser.");
        }
    }

    const handleStartRecording = () => {
        setCountdown(3);
        const countdownInterval = setInterval(() => {
            setCountdown(prevCountdown => {
                if (prevCountdown <= 1) {
                    clearInterval(countdownInterval);
                    startRecording(); // Start recording after the countdown
                    console.log('now recording')
                    return 0;
                } else {
                    return prevCountdown - 1;
                }
            });
        }, 1000);
    }

    const startRecording = async () => {
        setRecordingStatus("recording");

        if (stream) {
            const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a') ? 'video/mp4;codecs=avc1,mp4a' : 'video/webm;codecs=vp8,opus';
            const media = new MediaRecorder(stream, { mimeType });
            mediaRecorder.current = media;
            let localVideoChunks = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (typeof event.data === "undefined") return;
                if (event.data.size === 0) return;
                localVideoChunks.push(event.data);
            };

            mediaRecorder.current.start();
            setVideoChunks(localVideoChunks);

        }
    };

    const clearPermissions= async () => {
        setPermission(false);
        setRecordingStatus("inactive");
        let videoTrack = stream.getVideoTracks()[0];
        let audioTrack = stream.getAudioTracks()[0];

        stream.removeTrack(videoTrack);
        stream.removeTrack(audioTrack);

        stream.getTracks().forEach(function(track) {
            console.log(track)
            stream.removeTrack(track)
            track.stop();
          });
    }

    const stopRecording = () => {
        setPermission(false);
        setRecordingStatus("inactive");

        if (mediaRecorder.current) {
            mediaRecorder.current.onstop = () => {
                const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
                const videoUrl = URL.createObjectURL(videoBlob);

                const file = new File([videoBlob], "video.mp4", {
                    type: "video/mp4",
                });

                // console.log("file: ", file);
                setVideoFile(file);

                setRecordedVideo(videoUrl);
                // console.log("videoUrl: ", videoUrl);
                // uploadFile(videoBlob);
                // console.log({ loading, downloadURL, uploading, progress, coconutJobId });

                setVideoChunks([]);
            };
            mediaRecorder.current.stop();
            stream.getTracks().forEach((track) => track.stop());
            // console.log('tracks', stream.getTracks())
        }
    };
    const handleVideoUpload = async () => {
        toast.info('Please wait while we process the request');
        // Hide the Yes & No button and show please wait message
        setUserActions(false);
        // Stop all active Media tracks - so no more active camera and mic
        stream.getTracks().forEach((track) => track.stop());

        let s3VideoUrl, s3VideoKey, userFolder
        const aTitle = document.getElementById('answerNumber')
        const answerTitle = aTitle.dataset.answer

        if ( questionDetails[currentQuestionIndex], candidateDetails, jobId, answerDetails ) {
            // Upload the files to S3 bucket
            const file = videoFile;
            const filename = file.name;
            const fileType = encodeURIComponent('video/mp4')
            userFolder = 'job_id_' + jobId.job_id + '/candidate'

            console.log(answerTitle, 'at')
            console.log(answerDetails, 'answer details')
console.log(answerDetails.some(job => job['answer_title'] === answerTitle))
            if(answerDetails.some(job => job['answer_title'] === answerTitle)) {
                const questionRecordLine = answerDetails.filter(job => job['answer_title'] === answerTitle);
                console.log('questionRecordLine', questionRecordLine)

                const qKey = questionRecordLine[0].answer_key;
                const qKeyJsonFile = qKey + '.json';
                // Delete old video before uploading new video
                const resp = await fetch(
                    `/api/delete?file=${qKey}&fileType=${fileType}&folder=${userFolder}`
                )
                const output = await resp.json();
                toast.info(output.status);
                
                // Delete old video's transcripted json file from s3 bucket
                const deleteTranscription = await fetch(`/api/delete?file=${qKeyJsonFile}&fileType="json"&folder=${userFolder}`)
                const dtOutput = await deleteTranscription.json();
                toast.info(dtOutput.status);
    
                // Delete old video's transcription job
                const deleteTranscriptionJob = await fetch(`/api/transcribe/delete?jobName=${qKey}`);
                const dtjOutput = await deleteTranscriptionJob.json();
                toast.info(dtjOutput.message);
            }

            // console.log(file)
            // console.log(filename)

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
                toast.success('Video uploaded successfully')
                toast.info('Sending video for transcription', {delay: 500});
            } else {
                setUserActions(true);
                toast.error('Video upload failed. Please try again later')
                return false
            }

            s3VideoUrl = `https://reson-assets.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`
            s3VideoKey = key
        }

        // Send video for transcription
        const transcription = await fetch(
            `/api/transcribe?media=${s3VideoUrl}&outputBucket=${userFolder}&jobName=${s3VideoKey}`
        )
        console.log(`/api/transcribe?media=${s3VideoUrl}&outputBucket=${userFolder}&jobName=${s3VideoKey}`);
        const transcriptionResponse = await transcription.json()

        console.log('transcriptionResponse', transcriptionResponse)

        if (questionDetails[currentQuestionIndex], candidateDetails) {
            try {
                var raw = {
                    "question_id": questionDetails[currentQuestionIndex].question_id,
                    "candidate_id": candidateDetails.candidateId,
                    "job_id": jobId.job_id,
                    "answer_title": `answer-${currentQuestionIndex + 1}`,
                    "job_s3_folder": userFolder,
                    "answer_url": s3VideoUrl,
                    "answer_key": s3VideoKey,
                    "answer_transcript": 'NA',
                    "created_date": new Date().toISOString(),
                }
                console.log('raw', raw);

                let response;

                if(answerDetails.some(job => job['answer_title'] === answerTitle)) {
                    console.log('yes')
                    const questionRecordLine = answerDetails.filter(job => job['answer_title'] === answerTitle);
                    const qID = questionRecordLine[0].answer_id;
                    console.log('answer id', qID)
                    response = await axios.put(`/reson-api/answer/${qID}`, raw);
                } else {
                    response = await axios.post('/reson-api/answer/', raw);
                }

                if (response.status === 201 || response.status === 200) {
                    toast.success(response.data.message, {
                        onClose: () => {
                            setUserActions(true);
                            handleNextQuestion();
                            getCameraPermission();
                        },
                    });
                }
            } catch (error) {
                setUserActions(true);
                console.error('Error posting answer', error.message);
            }
        }
    }

    // useEffect(() => {
    //     if (questionDetails[currentQuestionIndex], candidateDetails) {

    //     }
    // }, [questionDetails[currentQuestionIndex], candidateDetails])

    const handleSubmit = async () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
            const response = await axios.post('/reson-api/job_result', {
                "candidate_id": candidateDetails.candidateId,
                "job_id": jobId.job_id,
                "status": "Answered",
                "ai_output": "NA",
                "created_date": new Date().toISOString(),
                "date_updated": new Date().toISOString()
            });
            if (response.status === 201) {
                const url = process.env.ZEPTO_ENDPOINT;
                const token = 'Zoho-enczapikey ' + process.env.ZEPTO_TOKEN;
                const candidateEmail = JSON.parse(localStorage.getItem('candidateDetails')).candidateEmail
                const candidateName = JSON.parse(localStorage.getItem('candidateDetails')).firstName + ' ' + JSON.parse(localStorage.getItem('candidateDetails')).lastName

                let client = new SendMailClient({url, token});

                client.sendMail({
                    "mail_template_key": process.env.ZEPTO_TEMPLATE_KEY,
                    "from": 
                    {
                        "address": "noreply@uarl.in",
                        "name": "Reson"
                    },
                    "to": 
                    [
                        {
                        "email_address": 
                            {
                                "address": candidateEmail,
                                "name": candidateName
                            }
                        }
                    ],
                    "merge_info": {"name":candidateName},
                    "subject": "Thank you for submitting your answers, we will email you a result link once ready"
                }).then((resp) => console.log("success - mail sent")).catch((error) => console.log(error,"error"));
                toast.success('Job result submitted successfully');
                router.push('/candidate/thankyou');
            }
        } catch (error) {
            console.error('Error submitting job result:', error.message);
            toast.error('Failed to submit job result. Please try again later');
        }
    };
    // useEffect(() => {
    //     if (candidateDetails, jobId) {
    //         handleSubmit()
    //     }
    // }, [candidateDetails, jobId])

    const videoJsOptions = {
        autoplay: false,
        controls: true,
        sources: [
            {
                src: recruiterS3VideoUrl,
                type: 'video/mp4',
            },
        ],
    };

    const videoRecJsOptions = {
        autoplay: false,
        controls: true,
        sources: [
            {
                src: recordedVideo,
                type: 'video/mp4',
            },
        ],
    };

    return (
        <>
            <CandidateHeader />
            <div className='container-fluid p-0'>
                <div className='row ps-5'>
                    <div className='col-12 top-content-box text-center ps-5'>
                        <h1 className='text-center ps-5 mt-5 mb-3 body-heading' id='answerNumber' data-answer={`answer-${currentQuestionIndex + 1}`}>Question {currentQuestionIndex + 1}</h1>
                    </div>
                </div>
                {!showSubmit ? (
                <>
                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-40 mt-4 mb-4'></div>
                    </div>
                </div>
                {currentQuestionIndex < questionDetails.length && (
                    <div className='d-flex'>
                        <div className='col-12 col-sm-6'>
                            <div className='videoPlayer position-relative'>
                                <div className="recorded-player">
                                    <video className="recorded" src={recruiterS3VideoUrl} autoPlay controls></video>
                                    {/* {recruiterS3VideoUrl && (
                                        <VideoPlayer {...videoJsOptions} />
                                    )} */}
                                </div>
                            </div>
                        </div>
                        <div className='col-12 col-sm-6 position-relative'>
                            <div className='videoPlayer position-relative'>
                                {countdown > 0 ?
                                    <div className='videoCountdown'>
                                        <Timer time={3} />
                                    </div>
                                    : ""
                                }
                                {!recordedVideo ? (
                                    <video ref={liveVideoFeed} autoPlay muted loop className="live-player"></video>
                                ) : null}

                                {recordedVideo ? (
                                    <div className="recorded-player">
                                        {/* <video className="recorded" src={recordedVideo} autoPlay controls></video> */}
                                        <VideoPlayer {...videoRecJsOptions} />
                                    </div>
                                ) : null}
                            </div>
                            <div className='videoControls position-absolute'>
                                {!permission && !permissionClicked ? (
                                    <>
                                        <div className='enablePermission'>
                                            <Image src={'/images/no-camera.svg'} alt='camera and mic not active' width={48} height={34} />
                                            <p>Cam & Mic are not active</p>
                                        </div>
                                        <div className='requestPermission' onClick={getCameraPermission}>
                                            Request Permission
                                        </div>
                                    </>
                                ) : null}
                                {permission && recordingStatus === "inactive" ? (
                                    <div className='recordBtn' onClick={handleStartRecording}>
                                        <div className='recordVideo'></div>
                                    </div>
                                ) : null}
                                {recordingStatus === "recording" ? (
                                    <div className='recordBtn active' onClick={stopRecording}>
                                        <div className='recordVideo'></div>
                                    </div>
                                ) : null}
                                {recordedVideo ? (
                                    <>
                                        <div id='userActionVideos'>
                                            {userActions ? (
                                            <>
                                            <p className='looksGood'>Looks Good?</p>
                                            <div className='uploadBtn roundBtn' onClick={handleVideoUpload}>
                                                Yes
                                            </div>
                                            <div className='discardBtn roundBtn' onClick={getCameraPermission}>
                                                No
                                            </div>
                                            </>
                                            ) : (
                                                <>
                                                <p className='waiting looksGood'>Please wait...</p>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
                </>
                ) : (
                <div className='row mt-5 text-center ps-5 mb-5'>
                    <div className='col-sm-4'></div>
                    <div className='col-12 col-sm-4 text-center ps-5 mb-5'>
                        <div className='profile-btn cursor-pointer' onClick={handleSubmit}>Submit your profile</div>
                    </div>
                    <div className='col-sm-4'></div>
                </div>
                )}
            </div>
        </>
    );
}
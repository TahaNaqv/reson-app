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
import { startTranscription, pollTranscriptionStatus, fetchAndExtractTranscript, saveTranscriptToDatabase, getTranscriptionErrorMessage } from '@/utils/transcription';
import { TRANSCRIPTION_CONFIG } from '@/config/transcription';

export default function Welcome() {
    const router = useRouter();
    const progress = 75;
    const [jobId, setJobId] = useState('');
    const [candidateDetails, setCandidateDetails] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userActions, setUserActions] = useState(true);
    const [showSubmit, setShowSubmit] = useState(false);
    const isMountedRef = useRef(true);
    const pollingTimeoutRef = useRef(null);

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        const storedJobDetails = localStorage.getItem('jobDetails');
        if (storedJobDetails) {
            setJobId(JSON.parse(storedJobDetails));
        }
    }, []);
    useEffect(() => {
        const storedCandidateDetails = localStorage.getItem('candidateDetails');
        if (storedCandidateDetails) {
            setCandidateDetails(JSON.parse(storedCandidateDetails));
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
        if (candidateDetails && jobId) {
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
        if (companyDetails) {
            console.log(questionDetails[currentQuestionIndex].question_id, 'get question id');
            try {
                const userFolder = 'user_id_' + companyDetails.user_id + '/company/job_id_' + jobDetails.job_id;
                const response = axios.get(`/reson-api/question/${questionDetails[currentQuestionIndex].question_id}`);

                const s3key = (await response).data.question_key;
                const s3JsonKey = s3key + '.json';
                const s3folder = userFolder;

                const res2 = await fetch(
                    `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
                )

                const { durl, dkey } = await res2.json()

                setRecruiterS3VideoUrl(durl);

                // console.log('s3JsonKey', s3JsonKey)

                const res3 = await fetch(`/api/download?file=${s3JsonKey}&key=${s3JsonKey}&folder=${s3folder}`)
                const res3Json = await res3.json()
                const jsonUrl = res3Json.durl

                const fetchS3JSON = await fetch(jsonUrl, {
                    method: 'GET'
                })

                setS3VideoText(fetchS3JSON.url);

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

    // Cleanup on component unmount to prevent memory leaks
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            // Clear any pending polling timeouts
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = null;
            }
        };
    }, [])


    const handleNextQuestion = () => {
        if (currentQuestionIndex < questionDetails.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1); // Move to the next question
            welcomeVideo();
            getCameraPermission();
        } else {
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

    const clearPermissions = async () => {
        setPermission(false);
        setRecordingStatus("inactive");
        let videoTrack = stream.getVideoTracks()[0];
        let audioTrack = stream.getAudioTracks()[0];

        stream.removeTrack(videoTrack);
        stream.removeTrack(audioTrack);

        stream.getTracks().forEach(function (track) {
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
                setVideoChunks([]);
            };
            mediaRecorder.current.stop();
            stream.getTracks().forEach((track) => track.stop());
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

        if (questionDetails[currentQuestionIndex], candidateDetails, jobId, answerDetails) {
            // Upload the files to S3 bucket
            const file = videoFile;
            const filename = file.name;
            const fileType = encodeURIComponent('video/mp4')
            userFolder = 'job_id_' + jobId.job_id + '/candidate'

            console.log(answerTitle, 'at')
            console.log(answerDetails, 'answer details')
            console.log(answerDetails.some(job => job['answer_title'] === answerTitle))
            if (answerDetails.some(job => job['answer_title'] === answerTitle)) {
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
                try {
                    const deleteTranscriptionJob = await fetch(`/api/transcribe/delete?jobName=${qKey}`);
                    const dtjOutput = await deleteTranscriptionJob.json();

                    if (dtjOutput.status === 'false') {
                        console.warn('Failed to delete transcription job:', dtjOutput);
                        // Don't block the flow, just log warning
                        // Job might not exist, which is fine
                    } else {
                        console.log('Transcription job deleted successfully');
                        // Optionally show toast: toast.info('Old transcription job deleted');
                    }
                } catch (error) {
                    console.error('Error deleting transcription job:', error);
                    // Don't block the flow - deletion is not critical
                }
            }

            const res = await fetch(
                `/api/upload?file=${filename}&fileType=${fileType}&folder=${userFolder}`
            )
            const { url, key } = await res.json()

            const upload = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { "Content-Type": fileType }
            })
            if (upload.ok) {
                toast.success('Video uploaded successfully')
                toast.info('Sending video for transcription', { delay: 500 });
            } else {
                setUserActions(true);
                toast.error('Video upload failed. Please try again later')
                return false
            }

            s3VideoUrl = `https://reson-assets.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`
            s3VideoKey = key
        }

        // Send video for transcription with error handling
        try {
            toast.info('Starting transcription...');
            const transcriptionResponse = await startTranscription(s3VideoUrl, userFolder, s3VideoKey);

            if (transcriptionResponse.status === 'true') {
                toast.success('Transcription started successfully');

                // Start polling for status and auto-save transcript when complete
                const answerTitle = document.getElementById('answerNumber')?.dataset?.answer;
                const questionRecordLine = answerDetails.filter(job => job['answer_title'] === answerTitle);
                const answerId = questionRecordLine.length > 0 ? questionRecordLine[0].answer_id : null;

                // Extract actual AWS job name from response (critical for status polling)
                const actualJobName = transcriptionResponse.actualJobName || s3VideoKey;

                // Start polling in background using the actual AWS job name
                // Note: pollTranscriptionStatus uses recursive setTimeout, cleanup handled in useEffect
                pollTranscriptionStatus(
                    actualJobName,
                    (status, retryCount) => {
                        if (!isMountedRef.current) return; // Skip if component unmounted
                        if (retryCount === 0) {
                            toast.info('Transcription in progress. Please wait...');
                        } else if (retryCount % TRANSCRIPTION_CONFIG.STATUS_UPDATE_INTERVAL === 0) {
                            toast.info('Transcription still processing. Please wait...');
                        }
                    },
                    async (completedJob) => {
                        if (!isMountedRef.current) return; // Skip if component unmounted
                        toast.success('Transcription completed successfully');

                        // Automatically fetch and save transcript to database
                        if (answerId) {
                            try {
                                const transcriptText = await fetchAndExtractTranscript(s3VideoKey, userFolder);
                                if (transcriptText) {
                                    const saved = await saveTranscriptToDatabase(transcriptText, 'answer', answerId);
                                    if (saved) {
                                        console.log('Transcript automatically saved to database');
                                        // Show success notification (non-intrusive)
                                        toast.success('Transcript saved to database', { autoClose: 2000 });
                                    } else {
                                        console.error('Failed to save transcript to database');
                                        // Show error notification for save failure
                                        toast.error('Failed to save transcript. Please try again later.', { autoClose: 3000 });
                                    }
                                } else {
                                    console.warn('Transcript text is empty or could not be extracted');
                                    toast.warn('Transcript completed but could not be extracted', { autoClose: 3000 });
                                }
                            } catch (error) {
                                console.error('Error auto-saving transcript:', {
                                    error: error.message,
                                    answerId: answerId,
                                    s3Key: s3VideoKey,
                                    stack: error.stack
                                });
                                // Show error notification for critical failures
                                toast.error('Error saving transcript: ' + (error.message || 'Unknown error'), { autoClose: 4000 });
                            }
                        } else {
                            console.warn('No answerId available to save transcript');
                        }
                    },
                    (error) => {
                        if (!isMountedRef.current) return; // Skip if component unmounted
                        console.error('Transcription polling error:', {
                            error: error.message,
                            jobName: actualJobName,
                            stack: error.stack
                        });
                        const errorMessage = getTranscriptionErrorMessage(error);
                        toast.error(errorMessage, { autoClose: 5000 });
                    }
                );
            } else {
                console.warn('Unexpected transcription response:', transcriptionResponse);
                toast.warn('Unexpected response from transcription service');
            }
        } catch (transcriptionError) {
            console.error('Error starting transcription:', {
                error: transcriptionError.message,
                s3VideoUrl: s3VideoUrl,
                userFolder: userFolder,
                s3VideoKey: s3VideoKey,
                stack: transcriptionError.stack
            });
            const errorMessage = getTranscriptionErrorMessage(transcriptionError);
            toast.error(errorMessage, { autoClose: 5000 });
            setUserActions(true);
            return false;
        }

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

                if (answerDetails.some(job => job['answer_title'] === answerTitle)) {
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
                console.error('Error saving answer:', {
                    error: error.message,
                    answerTitle: answerTitle,
                    candidateId: candidateDetails?.candidateId,
                    jobId: jobId?.job_id,
                    stack: error.stack
                });
                toast.error('Error saving answer: ' + (error.message || 'Unknown error'), { autoClose: 4000 });
                setUserActions(true);
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

                let client = new SendMailClient({ url, token });

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
                    "merge_info": { "name": candidateName },
                    "subject": "Thank you for submitting your answers, we will email you a result link once ready"
                }).then((resp) => console.log("success - mail sent")).catch((error) => console.log(error, "error"));
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
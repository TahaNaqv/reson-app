import { React, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useParams } from 'next/navigation'
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';
import Timer from '@/Components/Timer/timer';
import VideoPlayer from '@/Components/VideoPlayer/player';

export default function RecordAssignments() {
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
    // const mimeType = 'video/webm;codecs=vp8,opus';
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
    const [headline, setHeadline] = useState('Record Assignments');
    const [userActions, setUserActions] = useState(true);
    const [transcriptedResult, setTranscriptedResult] = useState('');

    const [questions, setQuestions] = useState([
        {number: '1', question: 'Which one is more essential: Being a good listener or a good communicator?'},
        {number: '2', question: 'Can you rate the importance of these aspects for you: Career development, perks and benefits, salary, or excellent work?'},
        {number: '3', question: 'If your life were a book, what would it be called?'},
        {number: '4', question: 'Which resonates with you: "Everything has to be perfect" or "Done is better than perfect"'},
        {number: '5', question: 'What is your first step when you have a new task with little or almost no direction?'},
        {number: '6', question: 'You are trapped in a labyrinth. How would you proceed?<ul><li>Red: I would try to break through the maze</li><li>Green: I would try the same route again and again until I figure it out</li><li>Blue: I would draw a detailed map to find my way</li><li>Yellow: I would try to communicate with other people to get help</li></ul>'},
        {number: '7', question: 'How do you define success in your work?'},
        {number: '8', question: 'How do you define work-life balance and how do you achieve it?'},
        {number: '9', question: 'If you could wake up tomorrow and have a new skill or quality, what would it be and how would you use it in your role?'},
        {number: '10', question: 'If you could be an object in an office, what would you be and why?'},
    ])
    const [showItems, setShowItems] = useState(1);

    const fetchJobQuestions = async () => {
        try {
            const job_id = params.jobId;
            const response = await axios.get(`/reson-api/question/job/${job_id}`);
            // console.log(response.data)
            setJobData(response.data);
            
        } catch (error) {
            console.error('Error fetching job details: ', error.message);
        }
    }

    // Camera Permission
    const getCameraPermission = async () => {
        // Should I keep the recorded video null?
        if(recordedVideo) {
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

        if(stream) {
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
        // console.log('Get the company data');
        // console.log('video: ', recordedVideo);
        let s3VideoUrl, s3VideoKey, s3VideoURI
        const companyData = axios.get(`/reson-api/company/${session.user.company_id}`);
        const data = (await companyData).data;
        const userFolder = 'user_id_' + session.user.user_id + '/company/job_id_' + params.jobId
        const fileType = encodeURIComponent('video/mp4')
        const qTitle = document.getElementById('recordQuestion')
        const questionTitle = qTitle.dataset.question

        if(jobData.some(job => job['question_title'] === questionTitle)) {
            const questionRecordLine = jobData.filter(job => job['question_title'] === questionTitle);
            const qKey = questionRecordLine[0].question_key;
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
        if(session.user.company_id) {
            // Upload the files to S3 bucket
            const file = videoFile;
            const filename = file.name;

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

        const transcription = await fetch(
            `/api/transcribe?media=${s3VideoUrl}&outputBucket=${userFolder}&jobName=${s3VideoKey}`
        )
        const transcriptionResponse = await transcription.json()

        try {
            var raw = {
                "job_id": params.jobId,
                "question_title": questionTitle,
                "question_key": s3VideoKey,
                "job_s3_folder": userFolder,
                "question_video_url": s3VideoUrl,
                "question_transcript": '',
                "created_date": new Date()
            }
            console.log('raw', raw);

            let response;

            if(jobData.some(job => job['question_title'] === questionTitle)) {
                console.log('yes')
                const questionRecordLine = jobData.filter(job => job['question_title'] === questionTitle);
                const qID = questionRecordLine[0].question_id;
                response = await axios.put(`/reson-api/question/${qID}`, raw);
            } else {
                response = await axios.post('/reson-api/question/', raw);
            }
            if(response.status === 201 || response.status === 200) {
                toast.success('Question saved successfully');
                setUserActions(true);
                // console.log('show next question')
                let num = showItems;
                if(num <=10) {
                    num = num + 1;
                    setShowItems(num)
                }  
                if(num > 10) {
                    // getCameraPermission()
                    stream.getTracks().forEach((track) => track.stop());
                    router.push('/company/thank-you-assignments')
                } else {
                    getCameraPermission()
                }
                console.log(showItems)
            } else {
                setUserActions(true);
                getCameraPermission()
            }
        } catch (error) {
            console.error('Error getting company details', error.message);
        }
    }

    const transcriptionData = async (key) => await fetch(`/api/transcribe/status?jobName=${key}`)
            .then((resp) => resp.json())
            .then((result) => {
                // console.log('result', result)
                // result = JSON.parse(result)
                const status = result.response.TranscriptionJob.TranscriptionJobStatus
                console.log('status', status)
                if(status === 'IN_PROGRESS' || status === 'QUEUED') {
                    setTimeout(() => {
                        console.log('still in progress');
                        toast.info('We are still processing the transcription. Please wait for few moments');
                        transcriptionData(key)
                    }, 5000);
                } else {
                    console.log('result from func', result.response.TranscriptionJob)
                    setTranscriptedResult(result.response.TranscriptionJob)
                    return transcriptedResult
                }
    });

    const videoJsOptions = {
        autoplay: false,
        controls: true,
        sources: [
            {
                src: recordedVideo,
                type: 'video/mp4',
            },
        ],
    };

    useEffect(() => {
        if(session){
            if(params.jobId) {
                fetchJobQuestions();
            } else {
                router.push('/company/post-job-vacancy')
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
        <div className='container'>
            <div className='row'>
                <div className='col-12 top-content-box'>
                    <h1 className='text-center mt-5 mb-3 body-heading'>{headline}</h1>
                    {/* <p className='sub-text text-center mt-2 mb-2'>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                    </p> */}
                </div>
            </div>
        </div>
        <div className='container'>
            <div className='row mt-3 mb-5'>
                <div className='col-12 col-sm-2'></div>
                <div className='col-12 col-sm-8 text-center position-relative'>
                    {questions && questions.slice(showItems - 1, showItems).map((item, index) => (
                        <div key={item.number} id='recordQuestion' className='question' data-question={`question-${item.number}`}><span className='questionNumber'>{item.number}</span> <span dangerouslySetInnerHTML={{ __html: item.question }} /></div>
                    ))}
                    <div className='mt-4 videoPlayer position-relative'>
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
                                <VideoPlayer {...videoJsOptions} />
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
                                Start Camera
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
                <div className='col-12 col-sm-2'></div>
            </div>
        </div>
        </>
    );
}
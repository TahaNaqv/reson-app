import { React, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Image from 'next/image';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useParams } from 'next/navigation'
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import HeaderBar from '@/Components/AppHeader/headerbar';
import Timer from '@/Components/Timer/timer';
import VideoPlayer from '@/Components/VideoPlayer/player';
import { startTranscription, getTranscriptionErrorMessage } from '@/utils/transcription';

export default function RecordWelcomeMessageCEO() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            // The user is not authenticated, handle it here.
            router.push('/login');
        },
    });


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
    const [userActions, setUserActions] = useState(true);

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

    const stopRecording = async () => {
        setPermission(false);
        setRecordingStatus("inactive");

        if (mediaRecorder.current) {
            mediaRecorder.current.onstop = () => {
                const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });
                const videoUrl = URL.createObjectURL(videoBlob);

                const file = new File([videoBlob], "video.mp4", {
                    type: "video/mp4",
                });

                setVideoFile(file);
                setRecordedVideo(videoUrl);
                setVideoChunks([]);
            };
            mediaRecorder.current.stop();
            stream.getTracks().forEach((track) => track.stop());
        }
    };

    const handleVideoUpload = async () => {
        setUserActions(false);
        let s3VideoUrl, s3VideoKey, s3VideoURI
        const companyData = axios.get(`/reson-api/company/${session.user.company_id}`);
        const data = (await companyData).data;
        const userFolder = 'user_id_' + session.user.user_id + '/company'

        if (session.user.company_id) {
            const file = videoFile;
            const filename = file.name;
            const fileType = encodeURIComponent('video/mp4')
            toast.info('Please wait while we process the request');

            // Delete old video if it exists
            if (data.company_ceo_video_key) {
                const resp = await fetch(
                    `/api/delete?file=${data.company_ceo_video_key}&fileType=${fileType}&folder=${userFolder}`
                )
                const output = await resp.json();
                toast.info(output.status);
            }

            // Upload the files to S3 bucket
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
                toast.success('CEO video uploaded successfully')
                toast.info('Sending video for transcription', { delay: 500 });
            } else {
                setUserActions(true);
                toast.error('CEO video upload failed. Please try again later')
                return false
            }

            s3VideoUrl = `https://reson-assets.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`
            s3VideoURI = `s3://reson-assets/${userFolder}/${key}`
            s3VideoKey = key
        }

        // Start transcription with error handling
        try {
            toast.info('Starting transcription...');
            const transcriptionResponse = await startTranscription(s3VideoUrl, userFolder, s3VideoKey);

            if (transcriptionResponse.status === 'true') {
                toast.success('Transcription started successfully');
                // Note: actualJobName is available in transcriptionResponse.actualJobName
                // If polling is added in the future, use actualJobName instead of s3VideoKey
            } else {
                console.warn('Unexpected transcription response:', transcriptionResponse);
                toast.warn('Unexpected response from transcription service');
            }
        } catch (transcriptionError) {
            console.error('Error starting transcription:', transcriptionError);
            const errorMessage = getTranscriptionErrorMessage(transcriptionError);
            toast.error(errorMessage);
            setUserActions(true);
            return false;
        }

        if (s3VideoKey) {
            try {
                var raw = {
                    "user_id": data.user_id,
                    "company_id": data.company_id,
                    "company_name": data.company_name,
                    "company_website": data.company_website,
                    "company_email_address": data.company_email_address,
                    "company_logo": data.company_logo,
                    "company_logo_key": data.company_logo_key,
                    "company_s3folder": data.company_s3folder,
                    "company_ceo_video_url": s3VideoUrl,
                    "company_ceo_video_key": s3VideoKey,
                    "company_description": '',
                    "company_team_size": data.company_team_size,
                    "company_stage": data.company_stage,
                    "company_address": data.company_address,
                    "company_country": data.company_country,
                    "company_values": data.company_values,
                    "company_working_environment": data.company_working_environment,
                    "company_growth": data.company_growth,
                    "company_diversity": data.company_diversity,
                    "company_vision": data.company_vision,
                    "created_date": data.created_date,
                    "last_modified_date": new Date()
                }

                const response = await axios.put(`/reson-api/company/${session.user.company_id}`, raw);
                if (response.status === 200) {
                    toast.success('Company video updated successfully', {
                        onClose: () => {
                            router.push('/company/welcome-message');
                        },
                    });
                }
            } catch (error) {
                console.error('Error getting company details', error.message);
                setUserActions(true);
            }
        }
    }

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
        if (session) {
            // Session loaded
        }
    }, [session])

    if (status === "loading") {
        return <PageLoader />
    }

    if (session.user.user_id === null || session.user.user_id === '') {
        router.push('/register');
    }


    return (
        <>
            {/* Header bar */}
            <HeaderBar />
            <div className='container'>
                <div className='row mb-3'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-2 body-heading'>Welcome from the CEO</h1>
                        <h3 className='text-center mt-3 mb-3 '>Suggested Intro Script</h3>
                        <div className='row'>
                            <div className='col-12 col-sm-2'></div>
                            <div className='col-12 col-sm-8'>
                                <p className='sub-text text-center mt-2 mb-2'>
                                    {`It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like)`}.
                                </p>
                            </div>
                            <div className='col-12 col-sm-2'></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='container'>
                <div className='row mb-5'>
                    <div className='col-12 col-sm-2'></div>
                    <div className='col-12 col-sm-8 position-relative'>
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
                    <div className='col-12 col-sm-2'></div>
                </div>
            </div>
        </>
    );
}
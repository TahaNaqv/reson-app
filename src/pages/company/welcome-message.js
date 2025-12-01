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

export default function WelcomeMessageCEO() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [s3VideoUrl, setS3VideoUrl] = useState('');

    const welcomeVideo = async () => {
        try {
            const userFolder = 'user_id_' + session.user.user_id + '/company';
            const response = axios.get(`/reson-api/company/${session.user.company_id}`);

            const s3key = (await response).data.company_ceo_video_key;
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

    useEffect(() => {
        if(session){
            welcomeVideo();
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
            <div className='row mb-3'>
                <div className='col-12 top-content-box'>
                    <h1 className='text-center mt-5 mb-2 body-heading'>Welcome from the CEO</h1>
                </div>
            </div>
        </div>
        <div className='container'>
            <div className='row mb-5'>
                <div className='col-12 col-sm-2'></div>
                <div className='col-12 col-sm-8 position-relative'>
                    <div className='videoPlayer position-relative'>
                    {s3VideoUrl && (
                        <VideoPlayer {...videoJsOptions} />
                    )}
                        {/* <div className="recorded-player" data-vjs-player>
                            <video className="recorded " controls preload='auto'>
                                <source src={s3VideoUrl} type='video/mp4' />
                            </video>
                        </div> */}
                    </div>
                </div>
                <div className='col-12 col-sm-2'></div>
            </div>
        </div>
        </>
    );
}
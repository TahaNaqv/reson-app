import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import CircularProgressBar from '@/Components/ProgressBar/CircularProgressBar';
import CandidateHeader from '@/Components/CandidateHeader/candidateHeader';

export default function Meditation() {
    const router = useRouter();
    const progress = 75;


    return (
        <>
            {/* Header bar */}

            <CandidateHeader />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 col-sm-10 top-content-box'>
                        <div className="d-flex align-items-center justify-content-center mb-3">
                            <div>
                                <h1 className='mt-5 mb-3 body-heading'>Guided Meditation</h1>
                                <p className='sub-text mt-2 mb-2'>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat
                                </p>
                            </div>
                            <div className='d-flex align-items-center justify-content-end mt-5' style={{ width: '50vw'}}>
                            <CircularProgressBar progress={progress} />
                            </div>
                        </div>
                    </div>
                    <div className='col-12 col-sm-1'></div>
                </div>

                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-40 mt-4 mb-4'></div>
                    </div>
                </div>

                <div className='row'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 col-sm-10 mt-5 mb-5 d-flex align-items-center justify-content-center'>
                        <iframe width="100%" height="450" src="https://www.youtube-nocookie.com/embed/inpok4MKVLM?si=9i4rUxRnFX9TnJ1V" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                    </div>
                    <div className='col-12 col-sm-1'></div>
                </div>
               
                <div className='row mt-5 mb-5'>
                <div className='col-12 text-center mb-5'>
                    <Link href={'/candidate/how-you-feeling'} className='profile-btn'>Proceed</Link>
                        </div>
                    </div>
            </div>
        </>
    );
}
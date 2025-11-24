import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import CircularProgressBar from '@/Components/ProgressBar/CircularProgressBar';
import CandidateHeader from '@/Components/CandidateHeader/candidateHeader';

export default function Energy() {
    const router = useRouter();
    const [candidateDetails, setCandidateDetails] = useState(null);
    const [isAloneClicked, setIsAloneClicked] = useState(false);
    const [isMeditationClicked, setIsMeditationClicked] = useState(false);
    const progress = 75;

    const startDisabled = !(isAloneClicked && isMeditationClicked);

    const handleAloneClick = () => {
        setIsAloneClicked(true);
    };

    const handleMeditationClick = () => {
        setIsMeditationClicked(true);
    };

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        const storedCandidateDetails = localStorage.getItem('candidateDetails');
        if (storedCandidateDetails) {
            setCandidateDetails(JSON.parse(storedCandidateDetails));
        }
    }, []); // Run this effect only once on component mount


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
                                <h1 className='mt-5 mb-3 body-heading'>But first, a break</h1>
                                <p className='sub-text mt-2 mb-2'>
                                    We care about your well-being and want to make sure, you are not stressed out and feel good when you start the assignment. We prepared a meditation or a quick exercise to get you at the right energy level. So you are fully yourself, when we meet for the assignment.
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
                    <div className='col-12 col-sm-10 top-content-box'>
                        <h1 className=' mt-5 mb-3 body-heading'> <strong>Hi,</strong> {candidateDetails ? `${candidateDetails.firstName}` : 'Candidate'}</h1>
                    </div>
                    <div className='col-12 col-sm-1'></div>
                </div>
                <div className='row'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 col-sm-10'>
                        <p className='sub-text mt-3 mb-2'>
                            We want you to take a minute to relax and breathe. We have prepared an exercise for you. To suggest the right one please let us know about your environment.
                        </p>
                    </div>
                    <div className='col-12 col-sm-1'></div>
                </div>
                <div className='row mt-4'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 mt-3 col-sm-3 pe-5'>
                    <button className={`btn btn-outline-dark ${isAloneClicked ? 'disabled' : ''}`} style={{ backgroundColor: isAloneClicked ? '#BDBDBD' : ''}} onClick={handleAloneClick}>Alone</button>
                    </div>
                    <div className='col-12 mt-3 col-sm-3 pe-5'>
                        <button className='btn btn-outline-dark'>Crowded</button>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 col-sm-10 mt-3'>
                        <p className='sub-text mt-5 mb-2'>
                        Which kind of calming exercise would you prefer?
                        </p>
                    </div>
                    <div className='col-12 col-sm-1'></div>
                </div>
                <div className='row mt-4 mb-5'>
                    <div className='col-12 col-sm-1'></div>
                    <div className='col-12 mt-3 col-sm-3 pe-5'>
                        <button className='btn btn-outline-dark'>Exercise</button>
                    </div>
                    <div className='col-12 mt-3 col-sm-3 pe-5'>
                        <button className={`btn btn-outline-dark ${isMeditationClicked ? 'disabled' : ''}`} style={{ backgroundColor: isMeditationClicked ? '#BDBDBD' : ''}} onClick={handleMeditationClick}>Meditation</button>
                    </div>
                    <div className='col-12 mt-3 col-sm-3 pe-5 mb-5'>
                        <button className='btn btn-outline-dark mb-3'>Roll the dice</button>
                    </div>
                </div>
                <div className='row mt-5 mb-5'>
                <div className='col-12 text-center mb-5'>
                    <Link href={'/candidate/meditation'} className='profile-btn'>Start</Link>
                        </div>
                    </div>
            </div>
        </>
    );
}
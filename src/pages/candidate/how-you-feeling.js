import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import CircularProgressBar from '@/Components/ProgressBar/CircularProgressBar';
import CandidateHeader from '@/Components/CandidateHeader/candidateHeader';

export default function Feeling() {
    const router = useRouter();
    const [energyLevel, setEnergyLevel] = useState(0);
    const progress = 75;

    const handleEnergyLevelChange = (event) => {
        setEnergyLevel(parseInt(event.target.value));
    }

    const [candidateDetails, setCandidateDetails] = useState(null);

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
                                <h1 className='mt-5 mb-3 body-heading'>Amazing!</h1>
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
                    <div className='col-12 top-content-box mb-4' >
                        <h1 className='text-center mt-5 mb-3 body-heading'><strong>Hi,</strong> {candidateDetails ? `${candidateDetails.firstName}` : 'Candidate'}. How do you feel now? </h1>
                        <p className='sub-text text-center mt-5 mb-2'>
                        Move the slider left or right to tell us your energy level before we proceed further. <br/>
Then you can proceed with the assignment
                        </p>                   
                    </div>
                </div>
                <div className='row'>
                    <div className='col-sm-3'></div>
                    <div className='col-sm-6'>
                        <div className='d-flex align-items-center justify-content-center range-input mt-2 mb-2' style={{ gap: '1rem'}}>
                            <p className='mt-3'><strong>Less energized</strong></p>
                            <input className='col-12 mt-1' type="range" min="0" max="100" value={energyLevel} onChange={handleEnergyLevelChange} />
                            <p className='mt-3'><strong>More energized</strong></p>
                        </div>
                    </div>
                    <div className='col-sm-3'></div>
                </div>

               
                <div className='row mt-1 mb-5'>
                <div className='col-12 text-center mt-5 mb-5'>
                    <Link href={'/candidate/welcome'} className='profile-btn'>Start the assignment</Link>
                        </div>
                    </div>
            </div>
        </>
    );
}
import { React, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
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


    return (
        <>
            {/* Header bar */}
            <CandidateHeader />
            <div className='container'>

                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-40 mt-4 mb-4'></div>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12 top-content-box mb-4' >
                        <h1 className='text-center mt-5 mb-3 body-heading'>Thanks for accomplishing the assessment </h1>
                        <p className='sub-text text-center mt-5 mb-2'>
                        For taking part in our assessment. It was a pleasure to get to know you better.
                        </p>                   
                         </div>
                </div>
                <div className='d-flex align-items-center justify-content-center range-input mt-5 mb-5' style={{ gap: '1rem'}}>
                    <Image src={'/images/check.svg'} alt='check' width={38} height={25} />
                </div>

               
                {/* <div className='row mt-5 mb-5'>
                <div className='col-12 text-center mt-5 mb-5'>
                    <Link href={'/#'} className='profile-btn'>Click to get results via Email</Link>
                        </div>
                    </div> */}
            </div>
        </>
    );
}
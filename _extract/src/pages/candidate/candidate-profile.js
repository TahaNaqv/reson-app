import { React, useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '@/Components/CandidateHeader/header';
import CandidateProfile from '@/Components/Candidate/CandidateProfile';

export default function candidateProfile() {
    return(
        <>
            {/* Header bar */}
            {/* <HeaderBar /> */}
            <Header />
            <div className='container'>
                <div className='row'>
                    <div className='col-12 top-content-box'>
                        <h1 className='text-center mt-5 mb-3 body-heading'>Enter your Details</h1>
                        <p className='sub-text text-center mt-2 mb-2'>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        </p>
                    </div>
                </div>
                <div className='row'>
                    <div className='col-12'>
                        <div className='spacer-50 mt-2 mb-2'></div>
                    </div>
                </div>
            </div>
            <CandidateProfile />
        </>
    );
}
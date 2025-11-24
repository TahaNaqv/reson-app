import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

function CandidateHeader() {
    const router = useRouter();
    const [candidateDetails, setCandidateDetails] = useState(null);

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        const storedCandidateDetails = localStorage.getItem('candidateDetails');
        if (storedCandidateDetails) {
            setCandidateDetails(JSON.parse(storedCandidateDetails));
        }
        // console.log(candidateDetails)
    }, []); // Run this effect only once on component mount

    const handleLogOut = async () => {
        localStorage.removeItem('candidateDetails');
        const jobId = JSON.parse(localStorage.getItem('jobDetails')).job_id
        await router.push(`/job-listing/${jobId}`);
    }

    return (
        <div className="d-flex nav-bg align-items-center justify-content-between">
            <div className="d-flex align-items-center ms-4 nav-div-mobile">
                <input type='hidden' name='logged_in_user' id='logged_in_user' value={candidateDetails ? candidateDetails.candidateId : ''} />
                <p className="m-0 ms-3 profile-heading">
                    <span>
                        Welcome,<b> {candidateDetails ? `${candidateDetails.firstName} ${candidateDetails.lastName}` : 'Guest'}</b>
                    </span>
                </p>
            </div>
            <Image src={'/images/Reson_logo_hor_white 1.svg'} alt={'Reson'} className={'nav-logo my-3 nav-div-mobile'} width={'209'} height={'38'} />
            <div className="me-4 d-flex nav-buttons nav-div-mobile">
            <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <Image src={"/images/Icon_2.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <Image src={"/images/Icon_3.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <Image src={"/images/Icon_1.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0" onClick={handleLogOut}>
                    <Image src={"/images/Icon.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
            </div>
        </div>
    );
}

export default CandidateHeader;

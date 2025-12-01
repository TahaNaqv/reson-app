import { React, useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ViewCompanyProfile() {
    const router = useRouter();
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [s3FileUrl, setS3FileUrl] = useState('');

    const fetchCompanyData = async () => {
        try {
            const user_id = session.user.user_id;
            const response = await axios.get('/reson-api/company/user/' + user_id);
            // console.log(response.data)
            setCompanyData(response.data);

            const s3key = response.data.company_logo_key;
            const s3folder = response.data.company_s3folder;

            const res2 = await fetch(
                `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
            )

            const { durl, dkey } = await res2.json()

            setS3FileUrl(durl);
            // console.log(s3FileUrl);
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }

    useEffect(() => {
        if(session){
            if(session.user.company_id != 0) {
                fetchCompanyData()
            } else {
                router.push('/company/create-profile')
            }
        }
    }, [session]) 
      

    return(
        <>
            {companyData && (
                <div className='container' id='view-company-profile'>
                    <div className='row'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-5'>
                            <h2 className='company-name'>{companyData.company_name}</h2>
                            <div className='company-details mt-2 mb-1'>
                                <p>{companyData.company_address}</p>
                                <p>{companyData.company_country}</p>
                                <p>{companyData.company_email_address}</p>
                                <p>{companyData.company_website}</p>
                            </div>
                        </div>
                        <div className='col-12 col-sm-3'>
                            {s3FileUrl && (
                                <img src={s3FileUrl} width={300} height={128} alt="Company Logo" className='companyLogo' />
                            )}
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8 line-divider mt-3 mb-5'></div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-6'>
                            <h3 className='profile-headlines'>Company Values & Culture</h3>
                            <pre className='formatted-text'>{companyData.company_values}</pre>
                        </div>
                        <div className='col-12 col-sm-2'>
                            <div className='employee-block'>
                                <p className='text-white employee-count'>{companyData.company_team_size}</p>
                                <p className='text-white'>Employees</p>
                            </div>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <h3 className='profile-headlines'>Working Environment</h3>
                            <pre className='formatted-text'>{companyData.company_working_environment}</pre>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <h3 className='profile-headlines'>Growth & Development Opportunities</h3>
                            <pre className='formatted-text'>{companyData.company_growth}</pre>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <h3 className='profile-headlines'>Diversity & Inclusion</h3>
                            <pre className='formatted-text'>{companyData.company_diversity}</pre>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <h3 className='profile-headlines'>Future Vision & Goals</h3>
                            <pre className='formatted-text'>{companyData.company_vision}</pre>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mt-3 mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 text-end'>
                            <Link href={'/company/edit-company-profile'} className='profile-btn'>Edit Profile</Link>
                        </div>
                        <div className='col-12 col-sm-4'>
                            <Link href={'/company/post-job-vacancy'} className='profile-btn'>Add New Job Vacancy</Link>
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                </div>
            )}
        </>
    );
}